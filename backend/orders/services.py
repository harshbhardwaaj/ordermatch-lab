"""Orchestrates a real "bring your own order" submission (T114-T121):
extract structured line items from pasted text, run the hybrid matching
pipeline per line, score confidence, and gate routing against the active
SetupConfiguration threshold. Confidence itself stays backend-internal
(never returned by MatchCandidateSerializer) — see clarifications.md §7.
"""

from __future__ import annotations

import uuid

from django.core.management import call_command
from django.db import transaction
from django.utils import timezone

from catalogs.models import CatalogItem
from matching.models import MatchCandidate, MatchDecision
from matching.pipeline import match_order_lines
from onboarding.models import SetupConfiguration

from .extraction import extract_order
from .models import OrderLineItem, OrderRecord


def _new_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:10]}"


def _confidence_band(score: float, auto_approve_threshold: float) -> str:
    if score <= 0:
        return "no-match"
    if score >= auto_approve_threshold:
        return "high-confidence"
    return "review-needed"


def _active_setup_configuration() -> SetupConfiguration:
    config = SetupConfiguration.objects.first()
    if config is not None:
        return config
    return SetupConfiguration.objects.create()


def _norm(value: str | None) -> str:
    return (value or "").strip().lower()


def _discontinued_replacement_map() -> dict[str, str]:
    """Maps a customer's stated legacy identifier (their part number, or
    the discontinued item's own SKU) to the active replacement SKU.

    Found by actually testing: a line item can name a discontinued part by
    its old customer part number, the active catalog search correctly
    excludes the discontinued record, and the semantic-match step can
    still reason its way to the replacement from the description alone,
    confidently enough to auto-approve. That's plausible reasoning, not
    wrong, but it silently substitutes a different SKU than the one the
    customer named with no flag at all. Discontinued substitutions always
    force human review instead (see the call site below), independent of
    match score.
    """
    mapping = {}
    for item in CatalogItem.objects.filter(status="discontinued").exclude(replacement_sku=""):
        for part_number in item.customer_part_numbers:
            mapping[_norm(part_number)] = item.replacement_sku
        mapping[_norm(item.sku)] = item.replacement_sku
    return mapping


@transaction.atomic
def create_order_from_pasted_text(pasted_text: str) -> OrderRecord:
    """Raises orders.extraction.ExtractionError if extraction fails; no
    order is created in that case (T124). matching.pipeline.MatchingError
    is caught internally within match_order_lines, since a failed
    semantic-match call should degrade to deterministic-only results, not
    fail the order.
    """
    extracted = extract_order(pasted_text)

    setup_config = _active_setup_configuration()
    catalog_items = list(CatalogItem.objects.filter(status="active"))
    discontinued_replacements = _discontinued_replacement_map()

    order = OrderRecord.objects.create(
        id=_new_id("ord-live"),
        order_number=f"PO-LIVE-{uuid.uuid4().hex[:8].upper()}",
        customer_name=extracted.get("customer_name") or "Unnamed customer",
        customer_reference=extracted.get("customer_reference") or "",
        source="pasted-text",
        received_at=timezone.now(),
        requested_delivery_date=extracted.get("requested_delivery_date") or "",
        delivery_location=extracted.get("delivery_location") or "",
        currency=extracted.get("currency") or "EUR",
        status="review-needed",
        source_document_summary=pasted_text.strip()[:280],
        original_excerpt=pasted_text,
        is_simulated=False,
    )

    any_unresolved = False

    # Matched once for the whole order (at most one combined OpenAI call
    # for every ambiguous line together), not once per line item, so a
    # large order with many ambiguous lines doesn't mean that many
    # sequential round trips.
    all_candidates = match_order_lines(extracted["line_items"], catalog_items)

    for index, (line, candidates) in enumerate(zip(extracted["line_items"], all_candidates), start=1):
        line_item = OrderLineItem.objects.create(
            id=_new_id(f"{order.id}-line-{index}"),
            order=order,
            line_number=index,
            original_text=line.get("original_text") or "",
            normalized_attributes={a["name"]: a["value"] for a in line.get("attributes", [])},
            quantity=line.get("quantity"),
            unit=line.get("unit") or "unknown",
            requested_sku=line.get("requested_sku") or "",
            customer_part_number=line.get("customer_part_number") or "",
            status="normalized",
        )

        stated_identifier = _norm(line.get("customer_part_number")) or _norm(line.get("requested_sku"))
        replacement_sku = discontinued_replacements.get(stated_identifier) if stated_identifier else None

        top_row = None
        top_is_discontinued_substitution = False
        for rank, candidate in enumerate(candidates, start=1):
            is_substitution = bool(replacement_sku and candidate.catalog_item.sku == replacement_sku)
            proof_items = candidate.proof_items
            if is_substitution:
                proof_items = proof_items + [
                    {
                        "kind": "availability",
                        "label": "Requested part is discontinued, matched to its replacement",
                        "sourceValue": stated_identifier,
                        "catalogValue": candidate.catalog_item.sku,
                        "supportsMatch": True,
                    }
                ]
            row = MatchCandidate.objects.create(
                id=_new_id(f"{line_item.id}-cand-{rank}"),
                line_item=line_item,
                catalog_item=candidate.catalog_item,
                sku=candidate.catalog_item.sku,
                confidence_band=_confidence_band(candidate.score, setup_config.auto_approve_threshold),
                score=candidate.score,
                rank=rank,
                proof_items=proof_items,
                missing_evidence=candidate.missing_evidence,
                requires_human_review=is_substitution or candidate.score < setup_config.auto_approve_threshold,
            )
            if rank == 1:
                top_row = row
                top_is_discontinued_substitution = is_substitution

        description = line.get("description") or line_item.original_text
        if top_row and top_row.score >= setup_config.auto_approve_threshold and not top_is_discontinued_substitution:
            line_item.normalized_name = top_row.catalog_item.name
            line_item.selected_match_candidate = top_row
            line_item.status = "matched"
        elif candidates:
            line_item.normalized_name = description
            line_item.status = "review-needed"
            any_unresolved = True
        else:
            line_item.normalized_name = description
            line_item.status = "no-match"
            any_unresolved = True
        line_item.save()

    order.status = "review-needed" if any_unresolved else "ready"
    order.save()
    return order


DEFAULT_SETUP_CONFIGURATION = {
    "auto_approve_threshold": 85,
    "price_flag_threshold": 15,
    "stop_discontinued_items": True,
    "review_noncatalog_items": True,
    "flag_duplicate_lines": True,
}


@transaction.atomic
def reset_demo_data() -> None:
    """Self-serve reset (no login exists, so this is shared across every
    visitor): deletes every real "bring your own" order, clears any
    decide/defer/reopen decisions left on the 4 sample orders' lines, then
    restores the sample orders and setup thresholds to their original
    seeded values.

    Re-running seed_sample_data alone is not enough for two real reasons:
    its setup-configuration step uses get_or_create, which leaves an
    already-existing row untouched, so thresholds would not actually reset;
    and it never touches MatchDecision at all, so a real decide/defer/
    reopen action taken on a sample order's line during testing would
    survive a reset and keep showing "Confirmed" instead of "Matched".
    """
    OrderRecord.objects.filter(is_simulated=False).delete()
    MatchDecision.objects.all().delete()
    call_command("seed_sample_data")
    SetupConfiguration.objects.all().update(**DEFAULT_SETUP_CONFIGURATION)
