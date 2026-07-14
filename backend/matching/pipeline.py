"""Hybrid SKU matching pipeline (T117/T118): deterministic attribute/unit/
part-number rules first, then OpenAI-assisted semantic matching against the
catalog for whatever remains ambiguous. Confidence scoring (T119) and match
traceability (T121) both come directly out of this same pipeline. See
clarifications.md §7 (matching approach) and §8 (OpenAI, not Claude).

Semantic matching for an order's ambiguous lines is batched into a single
OpenAI call (match_order_lines), not one call per line. A large order with
many ambiguous lines used to mean that many sequential round trips, each
re-sending the full catalog, which scales badly (linear latency, repeated
token cost) and risks a request timeout once this is actually deployed.
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

# A reviewer correcting a bad match needs the *right* SKU to be somewhere in
# the list, and on a catalog with many near-identical variants (same bolt in
# three materials, superseded predecessors still listed) the right one is
# routinely below rank 3. The picker only shows the top few up front and puts
# the rest behind "show more", so a longer shortlist costs the reviewer
# nothing and is what makes a correction possible at all rather than forcing
# free-text.
MAX_CANDIDATES = 10

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
    # Set by matching.memory.apply_memory when this customer's own past
    # corrections moved this candidate. Empty when memory said nothing.
    learned_signal: dict = field(default_factory=dict)


def _norm(value: str | None) -> str:
    return (value or "").strip().lower()


def _attribute_lookup(catalog_item: CatalogItem) -> dict[str, str]:
    return {_norm(a.get("name", "")): _norm(a.get("value", "")) for a in catalog_item.attributes}


def _values_agree(order_value: str, catalog_value: str) -> bool:
    """Whether a customer's attribute value means the same as the catalog's,
    allowing for the two describing the same thing in different words.

    Exact string equality was wrong, and wrong in the direction that hurts: it
    read "40" vs "40 mm", "A2" vs "a2 stainless steel", and "ISO4017" vs
    "iso 4017" as three *conflicts*, when every one of them is agreement. Those
    phantom conflicts tanked the match score and, on a line where the customer
    had named the exact SKU, forced it to a human — the same order matching or
    not depending on whether extraction happened to phrase an attribute the
    catalog's way.

    Deliberately conservative, because a false *agreement* auto-approves a wrong
    part, which is worse than a false conflict. Two values agree when:
      - they are equal once inner spaces are removed ("iso 4017" == "iso4017"), or
      - the customer's value is a whole-token subset of the catalog's
        ("a2" within {a2, stainless, steel}; "40" within {40, mm}).
    Nothing looser: no substring test, so "40" never agrees with "400 mm" and
    "m8" never agrees with "m80".
    """
    if order_value == catalog_value:
        return True
    if order_value.replace(" ", "") == catalog_value.replace(" ", ""):
        return True
    order_tokens = set(order_value.split())
    catalog_tokens = set(catalog_value.split())
    return bool(order_tokens) and order_tokens <= catalog_tokens


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
    catalog_sku = _norm(catalog_item.sku)
    # The extractor usually routes a stated SKU into requested_sku, but it is an
    # LLM and occasionally drops it into original_text and nowhere else. A SKU is
    # a distinctive token that does not occur by accident, so recovering it from
    # the raw line — as a whole token, never a substring — makes the strongest
    # signal a customer can give deterministic rather than dependent on the
    # extractor's mood. original_text is kept verbatim for exactly this kind of
    # ground-truth recovery.
    exact_sku_match = bool(requested_sku and requested_sku == catalog_sku)
    if not exact_sku_match and catalog_sku:
        raw_tokens = set(_norm(extracted.get("original_text")).split())
        exact_sku_match = catalog_sku in raw_tokens
    if exact_sku_match:
        score += 45
        proof_items.append(
            {
                "kind": "catalog-attribute",
                "label": "Requested SKU matches catalog SKU",
                # requested_sku when the extractor captured it, else the SKU as
                # the customer wrote it in the raw line (recovery path above).
                "sourceValue": extracted.get("requested_sku") or catalog_item.sku,
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
        if _values_agree(value, catalog_value):
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

    # An exact SKU match is an identifier match: the customer named the one
    # catalog row they want, and it exists. That is the most authoritative signal
    # there is, stronger than any bundle of attribute matches, so it must be
    # dispositive on its own rather than needing the description to happen to
    # carry enough corroborating attributes.
    #
    # Without this floor the routing was non-deterministic: the same "100x
    # OM-FAS-HB-M8X40-A2-ISO4017" auto-matched when extraction pulled the size,
    # grade and standard out of the SKU string (pushing the score past the
    # threshold) and went to review when it did not. Same order, different
    # outcome, decided by an incidental of LLM extraction.
    #
    # The one exception is a stated attribute that *contradicts* the SKU ("SKU X,
    # but in A4" when X is the A2 row): that lands in missing_evidence, and a
    # genuine conflict has to reach a human rather than be auto-approved on the
    # identifier alone.
    if exact_sku_match and not missing_evidence:
        score = max(score, CONFIDENT_SCORE + 4)

    return min(score, 100.0), proof_items, missing_evidence


def _deterministic_candidates(extracted: dict, catalog_items: list[CatalogItem]) -> list[ScoredCandidate]:
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
    return deterministic


def _is_confident(deterministic: list[ScoredCandidate]) -> bool:
    top = deterministic[0] if deterministic else None
    runner_up_score = deterministic[1].score if len(deterministic) > 1 else 0
    return bool(top and top.score >= CONFIDENT_SCORE and (top.score - runner_up_score) >= CONFIDENT_MARGIN)


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

_CANDIDATE_SCHEMA = {
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
}

_BATCH_SEMANTIC_MATCH_SCHEMA = {
    "type": "object",
    "properties": {
        "results": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "index": {"type": "integer"},
                    "candidates": {"type": "array", "items": _CANDIDATE_SCHEMA},
                },
                "required": ["index", "candidates"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["results"],
    "additionalProperties": False,
}

_BATCH_SEMANTIC_SYSTEM_PROMPT = (
    "You match a batch of requested order line items against a product "
    "catalog, one line item at a time. Evaluate each requested line item "
    "completely independently: one line's likely match must never "
    "influence another line's candidates, even if they look similar. For "
    "each line item, identified by its index, return up to 10 candidate "
    "SKUs ranked by how well they match, most likely first. confidence is "
    "0-100: your own honest estimate of match quality, not a rounded "
    "guess. An honest estimate is calibrated to what the requested line "
    "item actually says: if two or more candidates are separated only by "
    "one attribute (for example seal type, size, or material) and the "
    "requested line item never states a value for that attribute, a "
    "vague word like standard, regular, normal, or usual does not count "
    "as stating one, so none of those candidates should outscore the "
    "others — give them each a similarly moderate confidence instead of "
    "picking a favorite. Only include a candidate if it is a plausible "
    "match for that specific line item; return an empty candidates list "
    "for a line item if nothing in the catalog is a reasonable fit. Base "
    "reasons only on real similarities or differences between the "
    "requested item and that specific catalog entry, not generic "
    "statements. Return exactly one result entry per line item index "
    "given, even when its candidates list is empty. When a line item "
    "carries a candidate_skus list, those are the only catalog entries "
    "that were retrieved for it: choose from those, and do not propose a "
    "SKU that is not in that line's list. If the payload "
    "includes about_this_customer, that is a brief written from this "
    "customer's own past corrections: treat it as authoritative about "
    "what their wording means and which grade they actually want, "
    "because a human reviewer put it there. Apply it only where it "
    "genuinely bears on the line item; a rule about bolt grades says "
    "nothing about a bearing. If the payload instead includes "
    "past_corrections_by_this_customer, treat those as this customer's "
    "own resolved history: where a requested line item closely resembles "
    "one of those past requests, prefer the SKU the human corrected it "
    "to and rank the SKU they overruled below it. Their correction is "
    "better evidence about what they meant than the catalog text is."
)


def _semantic_match_batch(
    indexed_lines: list[tuple[int, dict]],
    catalog_items: list[CatalogItem],
    memory_examples: list[dict] | None = None,
    shortlists: dict[int, list[CatalogItem]] | None = None,
    customer_context: str = "",
) -> dict[int, list[dict]]:
    """`catalog_items` is no longer the whole catalog. When shortlists are
    supplied (matching.blocking), the prompt carries only the union of the
    per-line shortlists — a few hundred rows at most — and each line is told
    which of them are its own candidates. Sending 10,000 rows would be ~500k
    tokens per call, which is neither affordable nor inside the context limit.
    """
    if not settings.OPENAI_API_KEY or not indexed_lines:
        return {}

    if shortlists:
        # One prompt-sized catalog: the union of every escalated line's
        # shortlist, deduplicated, instead of the full 10k.
        union: dict[str, CatalogItem] = {}
        for index, _ in indexed_lines:
            for item in shortlists.get(index, []):
                union[item.sku] = item
        prompt_catalog = list(union.values())
        requested = [
            {
                "index": index,
                **extracted,
                "candidate_skus": [item.sku for item in shortlists.get(index, [])],
            }
            for index, extracted in indexed_lines
        ]
    else:
        prompt_catalog = catalog_items
        requested = [{"index": index, **extracted} for index, extracted in indexed_lines]

    client = OpenAI(api_key=settings.OPENAI_API_KEY, timeout=60.0)
    payload = {
        "requested_line_items": requested,
        "catalog": [_catalog_summary_for_llm(c) for c in prompt_catalog],
    }
    # The customer's context.md (matching.context_file): a short agent-written
    # brief carrying the *reason* behind their past corrections, so the model
    # stops proposing the SKU they keep overruling. Preferred over dumping the
    # raw corrections, because the file is compacted and bounded while the log
    # grows forever — a customer with 300 corrections would otherwise mean 300
    # examples in every prompt.
    #
    # The raw examples remain the fallback for a customer whose file has not
    # been written yet, so a first correction still teaches something
    # immediately rather than waiting on a rebuild.
    if customer_context:
        payload["about_this_customer"] = customer_context
    elif memory_examples:
        payload["past_corrections_by_this_customer"] = memory_examples

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": _BATCH_SEMANTIC_SYSTEM_PROMPT},
                {"role": "user", "content": json.dumps(payload)},
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "batch_semantic_match",
                    "schema": _BATCH_SEMANTIC_MATCH_SCHEMA,
                    "strict": True,
                },
            },
        )
    except OpenAIError as exc:
        raise MatchingError(f"Batched semantic matching call failed: {exc}") from exc

    try:
        parsed = json.loads(response.choices[0].message.content)
    except (TypeError, json.JSONDecodeError, IndexError, AttributeError) as exc:
        raise MatchingError("Batched semantic matching returned a malformed response.") from exc

    return {result["index"]: result.get("candidates", []) for result in parsed.get("results", [])}


def _resolve_semantic_candidates(
    semantic_candidates: list[dict], catalog_items: list[CatalogItem]
) -> list[ScoredCandidate]:
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
    scored.sort(key=lambda c: c.score, reverse=True)
    return scored[:MAX_CANDIDATES]


def match_order_lines(
    line_items: list[dict],
    catalog_items: list[CatalogItem],
    memory=None,
) -> list[list[ScoredCandidate]]:
    """extracted line items from extraction.extract_order's line_items
    list, matched in at most one combined OpenAI call for the whole order:
    the deterministic pass runs per line locally (no API call), and every
    line left ambiguous afterward is sent together in a single semantic-
    match request, rather than one request per ambiguous line.

    `memory` is an optional matching.memory.CustomerMemory. It is used
    twice, on purpose: its past corrections go into the LLM prompt as
    retrieved few-shot examples (so the model proposes better), and they
    re-rank the finished candidate list (so the reviewer sees better even
    when the LLM ignored them, or was never called at all because the
    deterministic pass was confident).

    Returns one candidate list per input line item, in the same order,
    each up to MAX_CANDIDATES best-first, or empty if nothing plausible
    was found at all for that line.
    """
    from .blocking import build_index
    from .memory import apply_memory, memory_examples_for_prompt

    # Blocking, first and always. Every later stage — the deterministic scorer,
    # the LLM, the memory re-rank — now works on ~40 rows per line instead of
    # the whole catalog. Without this, a 10k catalog makes the deterministic
    # pass O(lines x 10k) SequenceMatcher calls and the LLM prompt ~500k tokens.
    # The index is built once for the order, not once per line.
    # line_items go in so every line's query vector is bought in one batched
    # embeddings call for the whole order, not one call per line.
    index = build_index(catalog_items, line_items)
    shortlists = {
        i: index.shortlist(line, line_index=i) for i, line in enumerate(line_items)
    }

    deterministic_per_line = [
        _deterministic_candidates(line, shortlists[i]) for i, line in enumerate(line_items)
    ]
    needs_escalation = [
        (i, line_items[i])
        for i, deterministic in enumerate(deterministic_per_line)
        if not _is_confident(deterministic)
    ]

    batch_results: dict[int, list[dict]] = {}
    if needs_escalation:
        try:
            batch_results = _semantic_match_batch(
                needs_escalation,
                catalog_items,
                memory_examples_for_prompt(memory) if memory else None,
                shortlists=shortlists,
                customer_context=memory.context_markdown if memory else "",
            )
        except MatchingError:
            batch_results = {}

    results = []
    for i, deterministic in enumerate(deterministic_per_line):
        if _is_confident(deterministic):
            candidates = [deterministic[0]]
        else:
            # Resolve against this line's own shortlist, so a SKU the model
            # invented or borrowed from another line's candidates is dropped
            # rather than silently accepted.
            scored = _resolve_semantic_candidates(batch_results.get(i, []), shortlists[i])
            # The LLM found nothing better than the deterministic pass (or the
            # batched call failed outright): fall back to whatever
            # deterministic signal exists, even if weak, so the reviewer still
            # has candidates to pick from instead of an empty picker.
            candidates = scored if scored else deterministic[:MAX_CANDIDATES]

        if memory:
            candidates = apply_memory(memory, line_items[i].get("original_text") or "", candidates)
        results.append(candidates)

    return results
