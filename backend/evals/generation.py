"""Real eval-run generation (T122): runs the actual extraction + hybrid
matching pipeline against the grounded, labeled sample dataset and scores it
against each order's groundTruth. Reads backend/seed_data/sample_orders.json
directly rather than live OrderRecord rows, so a run is unaffected by
whatever visitors have done to the shared demo database (reset, decide,
defer, and so on) and always scores the same fixed dataset.

Deliberately scoped to what the real T114-T121 pipeline actually attempts:
header/line extraction fidelity and hybrid SKU matching under confidence
gating. groundTruth.expectedOutcome also encodes duplicate-line detection
and price-threshold flagging (see onboarding.models.SetupConfiguration's
flag_duplicate_lines / price_flag_threshold), but those are onboarding-
capture-only in v1 — no code path in orders/services.py enforces them, so
scoring against them would penalize the pipeline for a capability it was
never built to have. Every non-"auto-match" expectedOutcome is instead
collapsed into a single "needs a human look" bucket for the routing metrics
(human-correction-rate, auto-approval-rate, false-confident-matches).

Line-level extraction accuracy is scored on structured fields only
(quantity, unit, attribute values) rather than free-text
expectedNormalizedName, since the extraction prompt deliberately keeps the
source text's own wording rather than normalizing it to match a hand-authored
label (see extraction.py's system prompt) — an exact-string compare there
would flag correct extractions as failures over wording alone. Attribute
matching is substring/value-based, not key-name-based, for the same reason:
the extraction schema keeps "terms from the source text rather than
inventing standardized ones", so a keyed dict compare against the hand-
authored ground truth's key names would also be unfairly strict.
"""

from __future__ import annotations

import json
import uuid
from pathlib import Path

from django.conf import settings
from django.utils import timezone

from catalogs.models import CatalogItem
from matching.pipeline import match_order_lines
from orders.extraction import ExtractionError, extract_order
from orders.services import (
    DEFAULT_SETUP_CONFIGURATION,
    _discontinued_replacement_map,
    _is_confidently_ahead,
    _is_substitution,
    _norm,
)

from .models import EvalFailureCase, EvalMetric, EvalRun

SEED_DIR = Path(settings.BASE_DIR) / "seed_data"
AUTO_APPROVE_THRESHOLD = DEFAULT_SETUP_CONFIGURATION["auto_approve_threshold"]

_HEADER_FIELDS = [
    ("customerName", "customer_name"),
    ("customerReference", "customer_reference"),
    ("currency", "currency"),
    ("requestedDeliveryDate", "requested_delivery_date"),
    ("deliveryLocation", "delivery_location"),
]

_OUTCOME_GROUP = {
    "auto-match": "matched",
    "human-review": "review-needed",
    "substitute-required": "review-needed",
    "blocked": "review-needed",
    "no-match": "no-match",
}

# Business rules the real pipeline never enforces in v1 (see module
# docstring): a line whose ONLY expected exception categories are these is
# excluded from false-confident-matches even when it got auto-approved,
# since the pipeline was never scoped to catch these — only SKU-trust
# failures (wrong SKU, ambiguous-SKU-family, discontinued substitution)
# count there. human-correction-rate still counts these, since a human
# would genuinely need to look regardless of which system was supposed to
# catch it.
_OUT_OF_SCOPE_CATEGORIES = {"price-mismatch", "duplicate-line", "missing-unit"}


def _new_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:10]}"


def _load_sample_orders() -> list[dict]:
    return json.loads((SEED_DIR / "sample_orders.json").read_text())


# Below this length, a value is only checked against the structured
# attribute list, never the free-text description: an adversarial review
# found that a short digit/code (e.g. a "4" pin-count) can
# spuriously substring-match an unrelated number embedded in prose (a
# price, a different measurement), which the structured attribute list
# -- a curated, per-fact breakdown rather than free text -- is much less
# prone to.
_SHORT_VALUE_MAX_LENGTH = 2


def _value_found(expected_value: str, extracted_values: list[str], description: str) -> bool:
    # Substring, not exact-match, even for short codes: the extraction
    # schema often folds two ground-truth attributes into one combined
    # value (thread "M8" + length "40 mm" surfacing as a single "M8x40"
    # size attribute), and an exact-match-only rule for short values was
    # flagging those as missing when the fact was actually present.
    expected = _norm(expected_value)
    if not expected:
        return True
    haystack = list(extracted_values)
    if len(expected) > _SHORT_VALUE_MAX_LENGTH:
        haystack.append(_norm(description))
    return any(expected in value for value in haystack)


class _Tally:
    def __init__(self):
        self.passed = 0
        self.total = 0

    def record(self, ok: bool):
        self.total += 1
        if ok:
            self.passed += 1

    @property
    def rate(self) -> float:
        return round(100 * self.passed / self.total, 1) if self.total else 0.0


def _quantities_match(expected, actual) -> bool:
    # Both sides are numeric (int vs float) from JSON parsing of two
    # different sources (hand-authored ground truth vs an OpenAI structured
    # output), so compare numerically rather than via string equality,
    # which would spuriously fail 500 against 500.0.
    if expected is None or actual is None:
        return expected == actual
    try:
        return float(expected) == float(actual)
    except (TypeError, ValueError):
        return _norm(expected) == _norm(actual)


def _score_order(
    order: dict,
    catalog_items,
    discontinued_replacements,
    replacement_skus: set,
    failures: list[dict],
    tallies: dict,
):
    order_id = order["id"]
    ground_truth = order.get("groundTruth") or {}
    if not ground_truth:
        return

    try:
        extracted = extract_order(order["originalExcerpt"])
    except ExtractionError as exc:
        failures.append(
            {
                "metric_key": "extraction-accuracy",
                "title": f"Extraction failed entirely for order {order_id}",
                "expected": "A successful extraction",
                "actual": str(exc),
                "severity": "blocking",
            }
        )
        return

    expected_header = ground_truth.get("expectedHeaderFields", {})
    for gt_key, py_key in _HEADER_FIELDS:
        expected_value = expected_header.get(gt_key)
        actual_value = extracted.get(py_key)
        ok = _norm(expected_value) == _norm(actual_value)
        tallies["extraction"].record(ok)
        if not ok:
            failures.append(
                {
                    "metric_key": "extraction-accuracy",
                    "title": f"Header field '{gt_key}' mismatch on order {order_id}",
                    "expected": str(expected_value),
                    "actual": str(actual_value),
                    "severity": "review",
                }
            )

    extracted_lines = extracted.get("line_items", [])
    gt_lines = ground_truth.get("lineItems", [])
    if len(extracted_lines) != len(gt_lines):
        failures.append(
            {
                "metric_key": "extraction-accuracy",
                "title": f"Line count mismatch on order {order_id}",
                "expected": f"{len(gt_lines)} line item(s)",
                "actual": f"{len(extracted_lines)} line item(s)",
                "severity": "blocking",
            }
        )

    all_candidates = match_order_lines(extracted_lines, catalog_items)

    for gt_line, extracted_line, candidates in zip(gt_lines, extracted_lines, all_candidates):
        line_id = gt_line["lineItemId"]

        ok_quantity = _quantities_match(gt_line.get("expectedQuantity"), extracted_line.get("quantity"))
        tallies["extraction"].record(ok_quantity)
        if not ok_quantity:
            failures.append(
                {
                    "metric_key": "extraction-accuracy",
                    "title": f"Quantity mismatch on line {line_id}",
                    "expected": str(gt_line.get("expectedQuantity")),
                    "actual": str(extracted_line.get("quantity")),
                    "severity": "review",
                }
            )

        # No expectedUnit key means the text never states a unit at all;
        # the extraction schema always returns "unknown" in that case
        # (never null), so that's the correct value to compare against,
        # not an empty string.
        ok_unit = _norm(gt_line.get("expectedUnit") or "unknown") == _norm(extracted_line.get("unit"))
        tallies["extraction"].record(ok_unit)
        if not ok_unit:
            failures.append(
                {
                    "metric_key": "extraction-accuracy",
                    "title": f"Unit mismatch on line {line_id}",
                    "expected": str(gt_line.get("expectedUnit")),
                    "actual": str(extracted_line.get("unit")),
                    "severity": "review",
                }
            )

        expected_attrs = gt_line.get("expectedAttributes", {})
        extracted_values = [_norm(a.get("value")) for a in extracted_line.get("attributes", [])]
        description = extracted_line.get("description", "")
        missing_attrs = [
            f"{name}={value}"
            for name, value in expected_attrs.items()
            if not _value_found(value, extracted_values, description)
        ]
        ok_attrs = not missing_attrs
        tallies["extraction"].record(ok_attrs)
        if not ok_attrs:
            failures.append(
                {
                    "metric_key": "extraction-accuracy",
                    "title": f"Attribute(s) not surfaced on line {line_id}",
                    "expected": ", ".join(missing_attrs),
                    "actual": f"attributes={extracted_line.get('attributes')}, description={description!r}",
                    "severity": "review",
                }
            )

        expected_sku = gt_line.get("expectedSku")
        candidate_skus = [c.catalog_item.sku for c in candidates]
        if expected_sku:
            top1_ok = bool(candidate_skus) and candidate_skus[0] == expected_sku
            tallies["top1"].record(top1_ok)
            if not top1_ok:
                failures.append(
                    {
                        "metric_key": "sku-top-1-accuracy",
                        "title": f"Top-1 SKU miss on line {line_id}",
                        "expected": expected_sku,
                        "actual": candidate_skus[0] if candidate_skus else "(no candidates)",
                        "severity": "review",
                    }
                )

            top3_ok = expected_sku in candidate_skus
            tallies["top3"].record(top3_ok)
            if not top3_ok:
                failures.append(
                    {
                        "metric_key": "sku-top-3-recall",
                        "title": f"Top-3 SKU recall miss on line {line_id}",
                        "expected": expected_sku,
                        "actual": ", ".join(candidate_skus) or "(no candidates)",
                        "severity": "review",
                    }
                )

        stated_identifier = _norm(extracted_line.get("customer_part_number")) or _norm(
            extracted_line.get("requested_sku")
        )
        stated_replacement_sku = discontinued_replacements.get(stated_identifier) if stated_identifier else None
        confidently_ahead = _is_confidently_ahead(candidates)
        top_is_substitution = bool(
            candidates and _is_substitution(candidates[0], stated_replacement_sku, replacement_skus)
        )

        if candidates and candidates[0].score >= AUTO_APPROVE_THRESHOLD and not top_is_substitution and confidently_ahead:
            routed = "matched"
        elif candidates:
            routed = "review-needed"
        else:
            routed = "no-match"

        expected_outcome = gt_line.get("expectedOutcome")
        expected_group = _OUTCOME_GROUP.get(expected_outcome, "review-needed")

        tallies["auto_approval"].record(routed == "matched")

        # human_correction and false_confident tally the BAD outcome
        # directly (record(True) means "this line needed a correction" /
        # "this was a false-confident match"), so tally.rate reads as the
        # rate the metric label promises, not its inverse.
        routing_ok = routed == expected_group
        tallies["human_correction"].record(not routing_ok)

        is_wrong_sku = bool(expected_sku) and (not candidate_skus or candidate_skus[0] != expected_sku)
        expected_categories = set(gt_line.get("expectedExceptionCategories", []))
        out_of_scope_only = bool(expected_categories) and expected_categories.issubset(_OUT_OF_SCOPE_CATEGORIES)
        false_confident = routed == "matched" and (
            is_wrong_sku or (expected_group != "matched" and not out_of_scope_only)
        )
        tallies["false_confident"].record(false_confident)

        if false_confident:
            failures.append(
                {
                    "metric_key": "false-confident-matches",
                    "title": f"Auto-approved a match that should not have been on line {line_id}",
                    "expected": f"outcome={expected_outcome}, sku={expected_sku}",
                    "actual": f"auto-approved sku={candidate_skus[0] if candidate_skus else None}",
                    "severity": "blocking",
                }
            )
        elif not routing_ok:
            failures.append(
                {
                    "metric_key": "human-correction-rate",
                    "title": f"Routing disagrees with ground truth on line {line_id}",
                    "expected": f"{expected_group} (from {expected_outcome})",
                    "actual": routed,
                    "severity": "review",
                }
            )


def generate_eval_run() -> EvalRun:
    """Runs extraction + hybrid matching for real against every sample
    order's original_excerpt, scores the output against groundTruth, and
    persists the result as a real (is_simulated=False) EvalRun. Makes one
    real OpenAI extraction call plus at most one batched matching call per
    sample order (4 orders in the current dataset), not one call per line.
    """
    orders = _load_sample_orders()
    catalog_items = list(CatalogItem.objects.filter(status="active"))
    discontinued_replacements = _discontinued_replacement_map()
    replacement_skus = set(discontinued_replacements.values())

    failures: list[dict] = []
    tallies = {
        "extraction": _Tally(),
        "top1": _Tally(),
        "top3": _Tally(),
        "auto_approval": _Tally(),
        "human_correction": _Tally(),
        "false_confident": _Tally(),
    }

    started_at = timezone.now()
    for order in orders:
        _score_order(order, catalog_items, discontinued_replacements, replacement_skus, failures, tallies)
    completed_at = timezone.now()

    run = EvalRun.objects.create(
        id=_new_id("eval-run"),
        status="complete",
        started_at=started_at,
        completed_at=completed_at,
        is_simulated=False,
    )

    metrics = [
        ("extraction-accuracy", "Extraction accuracy", tallies["extraction"], "percent"),
        ("sku-top-1-accuracy", "SKU top-1 accuracy", tallies["top1"], "percent"),
        ("sku-top-3-recall", "SKU top-3 recall", tallies["top3"], "percent"),
        ("auto-approval-rate", "Auto-approval rate", tallies["auto_approval"], "percent"),
        ("human-correction-rate", "Human correction rate", tallies["human_correction"], "percent"),
        ("false-confident-matches", "False confident matches", tallies["false_confident"], "percent"),
    ]
    for key, label, tally, unit in metrics:
        EvalMetric.objects.create(
            run=run,
            key=key,
            label=label,
            value=tally.rate,
            unit=unit,
            sample_size=tally.total,
            last_updated_at=completed_at,
        )

    for failure in failures:
        EvalFailureCase.objects.create(
            run=run,
            line_item=None,
            metric_key=failure["metric_key"],
            title=failure["title"],
            expected=failure["expected"],
            actual=failure["actual"],
            severity=failure["severity"],
        )

    return run
