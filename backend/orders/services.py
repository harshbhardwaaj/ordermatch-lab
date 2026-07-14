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
from catalogs.snapshot import active_catalog
from matching.memory import load_customer_memory
from matching.models import (
    CustomerContextFile,
    CustomerCorrection,
    CustomerPreference,
    MatchCandidate,
)
from matching.pipeline import CONFIDENT_MARGIN, match_order_lines
from onboarding.models import DEFAULT_SETUP_CONFIGURATION, SetupConfiguration

from .extraction import extract_order
from .models import OrderLineItem, OrderRecord


# What a catalog-declared replacement scores. High, because the catalog is
# asserting it rather than a model guessing it — but the substitution still
# forces human review regardless of score, so this only decides ordering.
REPLACEMENT_SCORE = 90.0


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


def _dedupe_candidates_by_sku(candidates):
    """Collapse candidates that point at the same catalog SKU, keeping the first
    (highest-ranked). Order is preserved; only later duplicates are dropped."""
    seen = set()
    unique = []
    for candidate in candidates:
        key = _norm(candidate.catalog_item.sku)
        if key in seen:
            continue
        seen.add(key)
        unique.append(candidate)
    return unique


def _hoist_stated_replacement(candidates, stated_replacement_sku: str | None, stated_identifier: str):
    """When the customer names a discontinued part, put its designated
    replacement at the top of the picker.

    The catalog already knows the answer: the discontinued row carries a
    replacement_sku, put there by whoever maintains the catalog. Ignoring it and
    letting the scorer rank freely is how a reviewer ends up being shown the
    wrong part first, which is exactly what an eval run caught. A customer
    ordered a discontinued M10x35, and the top suggestion came back as an M10x40
    — a different length — because that row happened to share the grade, while
    the actual replacement differed in grade and scored lower. The line went to
    review, so nothing wrong reached the ERP, but the reviewer was being asked to
    find an answer the catalog was already holding.

    This does not auto-approve anything: a substitution always forces human
    review at the call site. It only decides what the human is shown first, which
    is the whole job of a picker.
    """
    if not stated_replacement_sku:
        return candidates

    target = _norm(stated_replacement_sku)
    # Normalized comparison, deliberately. A raw == here misses a candidate the
    # retriever already returned when it differs only in case or spacing, and the
    # function then falls through and inserts a second copy of the same part —
    # the reviewer sees the replacement listed twice. Matching on the normalized
    # SKU means the existing candidate is found and simply moved to the front.
    for index, candidate in enumerate(candidates):
        if _norm(candidate.catalog_item.sku) == target:
            if index:
                candidates.insert(0, candidates.pop(index))
            return candidates

    # The replacement was not retrieved at all: the customer's wording described
    # the *old* part, and the replacement can differ enough (a different grade,
    # a different standard) that neither retriever surfaces it. Fetch it by SKU
    # and put it in, or the one row that is certainly right is the one row the
    # reviewer cannot pick.
    replacement = (
        CatalogItem.objects.filter(sku=stated_replacement_sku, status="active")
        .defer("embedding")
        .first()
    )
    if not replacement:
        return candidates

    from matching.pipeline import ScoredCandidate

    candidates.insert(
        0,
        ScoredCandidate(
            catalog_item=replacement,
            score=REPLACEMENT_SCORE,
            matched_via="catalog-supersession",
            proof_items=[
                {
                    "kind": "availability",
                    "label": "The catalog lists this as the replacement for the discontinued part",
                    "sourceValue": stated_identifier,
                    "catalogValue": replacement.sku,
                    "supportsMatch": True,
                }
            ],
        ),
    )
    return candidates


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

    # A pin is not a score, it is a human verdict, and the margin must not
    # overrule it. This exact request was corrected to this exact SKU by a
    # reviewer and never overruled since (matching.memory.apply_memory).
    #
    # Without this the learning loop stops one step short of the thing it
    # promises. The ambiguity that made the line hard in the first place —
    # four near-identical grades of the same bolt — is still there on the
    # reorder, so the runner-up still scores within the margin, so the line
    # is still sent to review. The reviewer is asked a question they have
    # already answered, and the answer is sitting right there at the top of
    # the list, labelled as theirs. It leans, but it never quite learns.
    top = candidates[0]
    if (getattr(top, "learned_signal", None) or {}).get("pinned"):
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
    # Loaded once per process, not once per order (catalogs.snapshot). Re-reading
    # 10,202 rows and re-tokenizing them on every paste was ~30 MB of allocation
    # and about a second of work to rebuild something identical to last time, on
    # a 512 MB box that had no room for it.
    catalog_items = active_catalog()
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

    # Everything this customer has already taught us (matching.memory).
    # Loaded once per order, after the header is extracted, because the
    # memory is keyed on who is asking — the same line text means different
    # SKUs to different buyers, which is the whole reason this is scoped per
    # customer rather than globally.
    memory = load_customer_memory(session_id, order.customer_name)

    # Matched once for the whole order (at most one combined OpenAI call
    # for every ambiguous line together), not once per line item, so a
    # large order with many ambiguous lines doesn't mean that many
    # sequential round trips.
    all_candidates = match_order_lines(extracted["line_items"], catalog_items, memory=memory)

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
        # The catalog knows what supersedes what. Show that first.
        candidates = _hoist_stated_replacement(candidates, stated_replacement_sku, stated_identifier)
        # One SKU, one row in the picker. The two retrievers plus a hoisted
        # replacement can each surface the same part, and a picker that lists the
        # same part twice reads as a bug — most visibly on the supersession path,
        # where the replacement is the row most likely to arrive by two routes.
        # Keep the highest-ranked occurrence, drop the rest.
        candidates = _dedupe_candidates_by_sku(candidates)
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
                learned_signal=candidate.learned_signal,
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
        _clone_customer_memory_for_session(session_id)


def _clone_customer_memory_for_session(session_id: str) -> None:
    """Clones the seeded customer-memory templates (demo_session_id="",
    see seed_sample_data._seed_customer_memory) into this visitor's own
    copy, so the memory screen has real history on a first visit instead of
    an empty state — and so the two seeded customers' contradictory
    preferences are there to be seen.

    Same template/clone pattern the sample orders use. A visitor's own
    corrections then accumulate on top of these.
    """
    suffix = session_id[:12]
    for template in CustomerCorrection.objects.filter(demo_session_id=""):
        CustomerCorrection.objects.get_or_create(
            id=f"{template.id}-{suffix}",
            defaults={
                "demo_session_id": session_id,
                "customer_key": template.customer_key,
                "customer_name": template.customer_name,
                "request_text": template.request_text,
                "normalized_request": template.normalized_request,
                "suggested_sku": template.suggested_sku,
                "chosen_sku": template.chosen_sku,
                "custom_label": template.custom_label,
                "chosen_rank": template.chosen_rank,
                "was_correction": template.was_correction,
            },
        )

    for template in CustomerPreference.objects.filter(demo_session_id=""):
        CustomerPreference.objects.get_or_create(
            demo_session_id=session_id,
            customer_key=template.customer_key,
            normalized_request=template.normalized_request,
            sku=template.sku,
            defaults={
                "times_chosen": template.times_chosen,
                "times_rejected": template.times_rejected,
            },
        )


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
    # Including everything this session taught the matcher — a "start over"
    # that left the learned preferences behind would mean the reset demo
    # behaves differently from a genuinely fresh one, which is exactly the
    # kind of thing that makes a demo lie.
    CustomerCorrection.objects.filter(demo_session_id=session_id).delete()
    CustomerPreference.objects.filter(demo_session_id=session_id).delete()
    # And the agent-written briefs. Leaving these behind would mean a "start
    # over" that still remembers, which is exactly the kind of thing that makes
    # a demo lie about itself.
    CustomerContextFile.objects.filter(demo_session_id=session_id).delete()
    SetupConfiguration.objects.update_or_create(
        demo_session_id=session_id, defaults=DEFAULT_SETUP_CONFIGURATION
    )
    ensure_session_samples(session_id)
