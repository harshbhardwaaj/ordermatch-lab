"""Orchestrates a real "bring your own order" submission (T114-T121):
extract structured line items from pasted text, run the hybrid matching
pipeline per line, score confidence, and gate routing against the active
SetupConfiguration threshold. Confidence itself stays backend-internal
(never returned by MatchCandidateSerializer) — see clarifications.md §7.
"""

from __future__ import annotations

import uuid

from django.db import transaction
from django.utils import timezone

from catalogs.models import CatalogItem
from matching.models import MatchCandidate
from matching.pipeline import CONFIDENT_MARGIN, match_order_lines
from onboarding.models import DEFAULT_SETUP_CONFIGURATION, SetupConfiguration

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


def _active_setup_configuration(session_id: str) -> SetupConfiguration:
    config, _ = SetupConfiguration.objects.get_or_create(
        demo_session_id=session_id, defaults=DEFAULT_SETUP_CONFIGURATION
    )
    return config


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

    Covers both "discontinued" and "replacement-available" catalog
    statuses (CatalogItemStatus): found via a real eval run (T122) that
    only checking "discontinued" silently missed a real
    "replacement-available" item in the sample catalog, since both carry
    a replacement_sku and both are excluded from the active-items match
    pool the same way.
    """
    mapping = {}
    for item in CatalogItem.objects.exclude(status="active").exclude(replacement_sku=""):
        for part_number in item.customer_part_numbers:
            mapping[_norm(part_number)] = item.replacement_sku
        mapping[_norm(item.sku)] = item.replacement_sku
    return mapping


def _is_substitution(candidate, stated_replacement_sku: str | None, replacement_skus: set[str]) -> bool:
    """True when this candidate is a replacement for a discontinued part,
    caught one of two ways: the customer literally named the old part
    (stated_replacement_sku, from _discontinued_replacement_map), or the
    match came from the LLM reasoning from the description alone rather
    than an exact identifier hit (matched_via == "llm") and happens to land
    on a SKU that is *someone's* designated replacement.

    Found by running a real eval against the labeled sample dataset (T122):
    the first version of this check (stated-identifier only) missed a real
    case where the customer described a discontinued part in free text
    with no part number at all ("elbow ... old series"), and a second case
    where a stated legacy part number was extracted into a generic
    attribute instead of customer_part_number. Both slipped through as
    silent, confident substitutions. The matched_via=="llm" condition is
    what catches these: a deterministic hit only matches active catalog
    identifiers directly, so it can never land on a replacement_sku by
    coincidence the way an LLM's free-text reasoning can.
    """
    sku = candidate.catalog_item.sku
    if stated_replacement_sku and sku == stated_replacement_sku:
        return True
    return candidate.matched_via == "llm" and sku in replacement_skus


def _is_confidently_ahead(candidates) -> bool:
    """Whether the top candidate beats the runner-up by CONFIDENT_MARGIN,
    same guard _is_confident applies before skipping the LLM call
    entirely, applied again here at the final auto-approve decision.

    Found via the same eval run as _is_substitution above: a
    deterministically-confident line only ever reaches here as a
    single-candidate list (the margin check already happened before the
    LLM call was skipped), so this is a no-op for it. But an LLM-resolved
    line can return several honestly-scored, closely-ranked candidates
    with no margin check at all between them — one strong-looking
    candidate for a line that was deliberately built to be ambiguous
    (several near-identical catalog variants) auto-approved anyway,
    because nothing ever compared it to its own runner-up.
    """
    if len(candidates) <= 1:
        return True
    return (candidates[0].score - candidates[1].score) >= CONFIDENT_MARGIN


@transaction.atomic
def create_order_from_pasted_text(pasted_text: str, session_id: str) -> OrderRecord:
    """Raises orders.extraction.ExtractionError if extraction fails; no
    order is created in that case (T124). matching.pipeline.MatchingError
    is caught internally within match_order_lines, since a failed
    semantic-match call should degrade to deterministic-only results, not
    fail the order.

    session_id scopes the created order and the setup-configuration
    thresholds it's routed against to the calling visitor (see
    common.middleware.DemoSessionMiddleware), so a "bring your own order"
    submission is never visible to, or routed by, another visitor's
    settings.
    """
    extracted = extract_order(pasted_text)

    setup_config = _active_setup_configuration(session_id)
    catalog_items = list(CatalogItem.objects.filter(status="active"))
    discontinued_replacements = _discontinued_replacement_map()
    replacement_skus = set(discontinued_replacements.values())

    order = OrderRecord.objects.create(
        id=_new_id("ord-live"),
        demo_session_id=session_id,
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
        stated_replacement_sku = discontinued_replacements.get(stated_identifier) if stated_identifier else None
        confidently_ahead = _is_confidently_ahead(candidates)

        top_row = None
        top_is_discontinued_substitution = False
        for rank, candidate in enumerate(candidates, start=1):
            is_substitution = _is_substitution(candidate, stated_replacement_sku, replacement_skus)
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
                requires_human_review=(
                    is_substitution
                    or candidate.score < setup_config.auto_approve_threshold
                    or not confidently_ahead
                ),
            )
            if rank == 1:
                top_row = row
                top_is_discontinued_substitution = is_substitution

        description = line.get("description") or line_item.original_text
        if (
            top_row
            and top_row.score >= setup_config.auto_approve_threshold
            and not top_is_discontinued_substitution
            and confidently_ahead
        ):
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


def _clone_order_for_session(template: OrderRecord, session_id: str) -> None:
    """Deep-clones one global template sample order (line items + match
    candidates only) into a fresh copy tagged with this session. Nothing
    in the live UI renders OrderException/ReadinessCheck (see T119's
    note), so those aren't cloned — same scope decision already made for
    real "bring your own" orders, which never get them either.
    """
    suffix = session_id[:12]
    new_order = OrderRecord.objects.create(
        id=f"{template.id}-{suffix}",
        demo_session_id=session_id,
        order_number=template.order_number,
        customer_name=template.customer_name,
        customer_reference=template.customer_reference,
        source=template.source,
        received_at=template.received_at,
        requested_delivery_date=template.requested_delivery_date,
        delivery_location=template.delivery_location,
        currency=template.currency,
        field_status=template.field_status,
        status=template.status,
        customer_profile=template.customer_profile,
        source_document_summary=template.source_document_summary,
        original_excerpt=template.original_excerpt,
        ground_truth=template.ground_truth,
        covered_edge_cases=template.covered_edge_cases,
        is_simulated=template.is_simulated,
    )

    new_candidate_by_old_id: dict[str, MatchCandidate] = {}
    for line in template.line_items.all():
        new_line = OrderLineItem.objects.create(
            id=f"{line.id}-{suffix}",
            order=new_order,
            line_number=line.line_number,
            original_text=line.original_text,
            normalized_name=line.normalized_name,
            normalized_attributes=line.normalized_attributes,
            quantity=line.quantity,
            unit=line.unit,
            requested_sku=line.requested_sku,
            customer_part_number=line.customer_part_number,
            unit_price=line.unit_price,
            currency=line.currency,
            status=line.status,
        )
        for candidate in line.match_candidates.all():
            new_candidate_by_old_id[candidate.id] = MatchCandidate.objects.create(
                id=f"{candidate.id}-{suffix}",
                line_item=new_line,
                catalog_item=candidate.catalog_item,
                sku=candidate.sku,
                confidence_band=candidate.confidence_band,
                score=candidate.score,
                rank=candidate.rank,
                proof_items=candidate.proof_items,
                missing_evidence=candidate.missing_evidence,
                conflicting_evidence=candidate.conflicting_evidence,
                requires_human_review=candidate.requires_human_review,
            )
        if line.selected_match_candidate_id:
            new_selected = new_candidate_by_old_id.get(line.selected_match_candidate_id)
            if new_selected:
                new_line.selected_match_candidate = new_selected
                new_line.save(update_fields=["selected_match_candidate"])


def ensure_session_samples(session_id: str) -> None:
    """Clones the global template sample orders (demo_session_id="",
    seeded once by seed_sample_data, never served directly to any real
    session) into this session's own copies, the first time this session
    touches the orders API. Every visitor gets an isolated copy of the
    same starting samples instead of one database shared by everyone.

    Checks specifically for this session's own sample copies (is_simulated),
    not "any order at all": a session whose very first request is a real
    "bring your own order" submission (POST /api/orders/extract/, which
    doesn't call this) would otherwise already have an order by the time
    it first lists orders, and a broader check would wrongly treat that as
    "already cloned" and permanently skip cloning the samples for it.
    """
    if OrderRecord.objects.filter(demo_session_id=session_id, is_simulated=True).exists():
        return
    with transaction.atomic():
        for template in OrderRecord.objects.filter(demo_session_id="", is_simulated=True):
            _clone_order_for_session(template, session_id)


@transaction.atomic
def reset_demo_data(session_id: str) -> None:
    """Self-serve reset, scoped to just the calling visitor's own
    isolated demo data (see ensure_session_samples — no visitor can see
    or affect another's data at all now, so this no longer needs to be
    global): deletes this session's orders (real "bring your own" ones
    and its own sample-order copies, cascading to their line items,
    match candidates, and decisions), resets this session's setup
    thresholds to the defaults, and re-clones fresh sample copies.
    """
    OrderRecord.objects.filter(demo_session_id=session_id).delete()
    SetupConfiguration.objects.update_or_create(
        demo_session_id=session_id, defaults=DEFAULT_SETUP_CONFIGURATION
    )
    ensure_session_samples(session_id)
