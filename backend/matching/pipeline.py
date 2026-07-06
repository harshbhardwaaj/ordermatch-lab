"""Hybrid SKU matching pipeline (T117/T118): deterministic attribute/unit/
part-number rules first, then OpenAI-assisted semantic matching against the
catalog for whatever remains ambiguous. Confidence scoring (T119) and match
traceability (T121) both come directly out of this same pipeline. See
clarifications.md §7 (matching approach) and §8 (OpenAI, not Claude).
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from difflib import SequenceMatcher

from django.conf import settings
from openai import OpenAI, OpenAIError

from catalogs.models import CatalogItem

MODEL = "gpt-5.4-mini"

# A deterministic match this strong, and this far ahead of the runner-up,
# is treated as resolved without spending an LLM call on it.
CONFIDENT_SCORE = 92
CONFIDENT_MARGIN = 15

MAX_CANDIDATES = 3

_SIZE_ATTRIBUTE_NAMES = {"thread", "length", "diameter", "size", "width", "height"}


class MatchingError(Exception):
    """Raised only when the OpenAI semantic-matching call itself fails.
    Deterministic-only results are still usable without it, so callers
    should fall back to those rather than failing the whole order — only
    the initial extraction call is treated as fatal (T124).
    """


@dataclass
class ScoredCandidate:
    catalog_item: CatalogItem
    score: float
    proof_items: list = field(default_factory=list)
    missing_evidence: list = field(default_factory=list)
    matched_via: str = "deterministic"


def _norm(value: str | None) -> str:
    return (value or "").strip().lower()


def _attribute_lookup(catalog_item: CatalogItem) -> dict[str, str]:
    return {_norm(a.get("name", "")): _norm(a.get("value", "")) for a in catalog_item.attributes}


def _proof_kind_for_attribute(name: str) -> str:
    key = _norm(name)
    if key in _SIZE_ATTRIBUTE_NAMES:
        return "size"
    if key == "material":
        return "material"
    if key == "standard":
        return "standard"
    if key == "unit":
        return "unit"
    return "catalog-attribute"


def _deterministic_score(extracted: dict, catalog_item: CatalogItem) -> tuple[float, list, list]:
    proof_items = []
    missing_evidence = []
    score = 0.0

    customer_part_number = _norm(extracted.get("customer_part_number"))
    if customer_part_number and customer_part_number in [
        _norm(p) for p in catalog_item.customer_part_numbers
    ]:
        score += 45
        proof_items.append(
            {
                "kind": "customer-part-number",
                "label": "Customer part number matches",
                "sourceValue": extracted["customer_part_number"],
                "catalogValue": extracted["customer_part_number"],
                "supportsMatch": True,
            }
        )

    requested_sku = _norm(extracted.get("requested_sku"))
    if requested_sku and requested_sku == _norm(catalog_item.sku):
        score += 45
        proof_items.append(
            {
                "kind": "catalog-attribute",
                "label": "Requested SKU matches catalog SKU",
                "sourceValue": extracted["requested_sku"],
                "catalogValue": catalog_item.sku,
                "supportsMatch": True,
            }
        )

    line_attributes = extracted.get("attributes") or []
    catalog_attrs = _attribute_lookup(catalog_item)
    matched_attrs = 0
    for attr in line_attributes:
        name = attr.get("name", "")
        value = _norm(attr.get("value"))
        catalog_value = catalog_attrs.get(_norm(name))
        if not value or catalog_value is None:
            continue
        if catalog_value == value:
            matched_attrs += 1
            proof_items.append(
                {
                    "kind": _proof_kind_for_attribute(name),
                    "label": f"{name.title()} matches",
                    "sourceValue": attr.get("value", ""),
                    "catalogValue": catalog_value,
                    "supportsMatch": True,
                }
            )
        else:
            missing_evidence.append(
                f"{name} differs: order says {attr.get('value', '')}, catalog says {catalog_value}"
            )
    if line_attributes:
        score += 40 * (matched_attrs / len(line_attributes))

    description = _norm(extracted.get("description"))
    if description:
        name_similarity = SequenceMatcher(None, description, _norm(catalog_item.name)).ratio()
        score += name_similarity * 15
        if name_similarity > 0.5:
            proof_items.append(
                {
                    "kind": "synonym",
                    "label": "Description closely matches catalog name",
                    "sourceValue": extracted.get("description", ""),
                    "catalogValue": catalog_item.name,
                    "supportsMatch": True,
                }
            )

    return min(score, 100.0), proof_items, missing_evidence


def _catalog_summary_for_llm(catalog_item: CatalogItem) -> dict:
    return {
        "sku": catalog_item.sku,
        "name": catalog_item.name,
        "category": catalog_item.category,
        "description": catalog_item.description,
        "attributes": catalog_item.attributes,
        "customer_part_numbers": catalog_item.customer_part_numbers,
    }


_REASON_KINDS = [
    "size", "material", "standard", "unit", "customer-part-number",
    "synonym", "catalog-attribute", "price", "availability",
]

_SEMANTIC_MATCH_SCHEMA = {
    "type": "object",
    "properties": {
        "candidates": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "sku": {"type": "string"},
                    "confidence": {"type": "number"},
                    "supports_match": {"type": "boolean"},
                    "reasons": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "kind": {"type": "string", "enum": _REASON_KINDS},
                                "label": {"type": "string"},
                                "source_value": {"type": "string"},
                                "catalog_value": {"type": "string"},
                            },
                            "required": ["kind", "label", "source_value", "catalog_value"],
                            "additionalProperties": False,
                        },
                    },
                },
                "required": ["sku", "confidence", "supports_match", "reasons"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["candidates"],
    "additionalProperties": False,
}

_SEMANTIC_SYSTEM_PROMPT = (
    "You match a requested order line item against a product catalog. Given "
    "the line item and the full catalog, return up to 3 candidate SKUs "
    "ranked by how well they match, most likely first. confidence is 0-100: "
    "your own honest estimate of match quality, not a rounded guess. Only "
    "include a candidate if it is a plausible match for this specific line "
    "item; return an empty list if nothing in the catalog is a reasonable "
    "fit. Base reasons only on real similarities or differences between the "
    "requested item and that specific catalog entry, not generic statements."
)


def _semantic_match(extracted: dict, catalog_items: list[CatalogItem]) -> list[dict]:
    if not settings.OPENAI_API_KEY:
        return []

    client = OpenAI(api_key=settings.OPENAI_API_KEY, timeout=30.0)
    payload = {
        "requested_line_item": extracted,
        "catalog": [_catalog_summary_for_llm(c) for c in catalog_items],
    }

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": _SEMANTIC_SYSTEM_PROMPT},
                {"role": "user", "content": json.dumps(payload)},
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "semantic_match",
                    "schema": _SEMANTIC_MATCH_SCHEMA,
                    "strict": True,
                },
            },
        )
    except OpenAIError as exc:
        raise MatchingError(f"Semantic matching call failed: {exc}") from exc

    try:
        parsed = json.loads(response.choices[0].message.content)
    except (TypeError, json.JSONDecodeError, IndexError, AttributeError) as exc:
        raise MatchingError("Semantic matching returned a malformed response.") from exc

    return parsed.get("candidates", [])


def match_line_item(extracted: dict, catalog_items: list[CatalogItem]) -> list[ScoredCandidate]:
    """extracted is one line item dict from extraction.extract_order's
    line_items list. catalog_items is the active catalog. Returns up to
    MAX_CANDIDATES ScoredCandidate, best first, or an empty list if nothing
    plausible was found at all.
    """
    deterministic = []
    for catalog_item in catalog_items:
        score, proof_items, missing_evidence = _deterministic_score(extracted, catalog_item)
        if score > 0:
            deterministic.append(
                ScoredCandidate(
                    catalog_item=catalog_item,
                    score=score,
                    proof_items=proof_items,
                    missing_evidence=missing_evidence,
                )
            )
    deterministic.sort(key=lambda c: c.score, reverse=True)

    top = deterministic[0] if deterministic else None
    runner_up_score = deterministic[1].score if len(deterministic) > 1 else 0
    if top and top.score >= CONFIDENT_SCORE and (top.score - runner_up_score) >= CONFIDENT_MARGIN:
        return [top]

    try:
        semantic_candidates = _semantic_match(extracted, catalog_items)
    except MatchingError:
        semantic_candidates = []

    if semantic_candidates:
        by_sku = {c.sku: c for c in catalog_items}
        scored = []
        for candidate in semantic_candidates[:MAX_CANDIDATES]:
            catalog_item = by_sku.get(candidate["sku"])
            if not catalog_item:
                continue
            proof_items = [
                {
                    "kind": reason["kind"],
                    "label": reason["label"],
                    "sourceValue": reason["source_value"],
                    "catalogValue": reason["catalog_value"],
                    "supportsMatch": candidate["supports_match"],
                }
                for reason in candidate.get("reasons", [])
            ]
            scored.append(
                ScoredCandidate(
                    catalog_item=catalog_item,
                    score=float(candidate["confidence"]),
                    proof_items=proof_items,
                    matched_via="llm",
                )
            )
        if scored:
            scored.sort(key=lambda c: c.score, reverse=True)
            return scored[:MAX_CANDIDATES]

    # LLM found nothing better than the deterministic pass: fall back to
    # whatever deterministic signal exists, even if weak, so the reviewer
    # still has candidates to pick from instead of an empty picker.
    return deterministic[:MAX_CANDIDATES]
