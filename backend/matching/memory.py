"""Per-customer match memory: the learning loop.

The matcher will never be right first time on a real catalog — 10k items,
the same screw in three materials at three price points, superseded parts
still listed next to their replacements. So the answer is not a cleverer
one-shot matcher, it is a matcher that gets corrected once and does not make
the same mistake again for that customer.

Three things happen here:

1. record_correction  — every reviewer decision is logged (including the
   ones where the AI was already right, which are the negative examples).
2. load_customer_memory / apply_memory — before the reviewer sees anything,
   past corrections re-rank the candidate list, and say so.
3. memory_examples_for_prompt — the same corrections are fed to the LLM as
   retrieved few-shot examples, so it stops proposing the wrong SKU rather
   than merely being overruled after the fact.

Deliberately NOT a fine-tune or an embedding index. A lookup keyed on the
customer plus the normalized request text is cheap, instant, inspectable,
and reversible — a reviewer can see exactly why a SKU jumped to the top, and
delete the correction that put it there. Fine-tuning offers none of that and
would be the wrong trade at this stage.
"""

from __future__ import annotations

import re
import uuid
from collections import defaultdict
from dataclasses import dataclass, field

from django.utils.text import slugify

from .models import CustomerCorrection, CustomerPreference

# How hard a past choice pushes a candidate. Deliberately modest, and log-
# scaled: the 1st correction should move a candidate a lot, the 10th should
# barely add anything, or a customer who orders the same thing weekly would
# make the memory unfalsifiable. HARDCODED, and the first thing I would
# replace with something tuned against a labelled set.
CHOSEN_WEIGHT = 18.0
REJECTED_WEIGHT = 12.0

# A pinned SKU (this exact text was corrected to this SKU, never overruled)
# skips the ranking argument entirely and goes straight to the top.
PINNED_SCORE = 99.0

MAX_PROMPT_EXAMPLES = 8

_WHITESPACE = re.compile(r"\s+")
_NOISE = re.compile(r"[^\w\s./-]")

# The order quantity, which is not part of what the customer is identifying.
#
# Leading: "200x", "200 x", "150 stk", "24 pcs", or a bare "500" at the front.
# Anchored to position zero, so it can never eat a number inside the part itself:
# "m8x40" and "6204 2rs" are safe because they do not start the string.
_LEADING_QUANTITY = re.compile(
    r"^\d+\s*(?:x|pcs?|pieces?|stk|stueck|st[uü]ck|units?|ea)?\b\s*", re.IGNORECASE
)

# Trailing: "qty 500", "500 stk", "12 pcs", "x 500".
#
# A bare trailing number is deliberately NOT stripped, and this is the whole
# reason this is two patterns instead of one. "o-ring 20x3 nbr 70" ends in a
# number that is the shore hardness, and "control cable 4g0.75 100" ends in a
# length. Eating those would merge genuinely different parts into one memory key
# and teach the system a correction the reviewer never made — a far worse failure
# than the one being fixed. So a trailing count only counts when it is announced,
# either by a keyword or a unit.
# The leading \s+ is load-bearing, not cosmetic. Without it, the "x 500" branch
# matches the "x40" inside "hex bolt m8x40" and the key becomes "hex bolt m8" —
# silently merging M8x40 and M8x50 into one memory, which is the exact
# distinction this product exists to get right. Requiring whitespace in front
# means a trailing quantity has to be its own token, never a fragment of the size.
_TRAILING_QUANTITY = re.compile(
    r"\s+(?:"
    r"(?:qty|quantity|menge|anzahl|stueck|st[uü]ck)\s*[:.]?\s*\d+"
    r"|x\s*\d+"
    r"|\d+\s*(?:x|pcs?|pieces?|stk|stueck|st[uü]ck|units?|ea)"
    r")\s*$",
    re.IGNORECASE,
)


def customer_key_for(customer_name: str) -> str:
    """Stable key for a customer. slugify collapses case, punctuation, and
    the GmbH/LLC noise that makes the same buyer look like two.
    """
    return slugify(customer_name or "unknown-customer")[:128] or "unknown-customer"


def normalize_request_text(text: str | None) -> str:
    """The key an exact repeat is recognized by.

    Intentionally crude: lowercase, strip punctuation, collapse whitespace, and
    drop the leading quantity. Real fuzzy recall (embed the request,
    nearest-neighbour past corrections) is the next step; this is the honest
    cheap version and it is what the demo can actually prove.

    The quantity has to go, and leaving it in was a real bug. A buyer who orders
    200 of a bolt in July and 150 of the same bolt in August has written the same
    request twice, and it is the same question — which of the four grades did you
    mean — with the same answer. Keyed on the raw text, those are two different
    keys, so the correction taught in July pinned nothing in August: the reviewer
    got asked again, having already answered. The pin only ever fired on a repeat
    of the exact same count, which is not how anybody reorders.

    What is left after stripping is the part description, which is the thing the
    customer is actually identifying and the thing the correction was about.
    """
    lowered = (text or "").strip().lower()
    lowered = _NOISE.sub(" ", lowered)
    collapsed = _WHITESPACE.sub(" ", lowered).strip()

    without_quantity = _LEADING_QUANTITY.sub("", collapsed, count=1)
    without_quantity = _TRAILING_QUANTITY.sub("", without_quantity, count=1).strip()

    # Guard: if the line was *only* a quantity, keep what we had rather than
    # keying every such line on the empty string and collapsing them together.
    return (without_quantity or collapsed)[:255]


@dataclass
class CustomerMemory:
    customer_key: str = ""
    customer_name: str = ""
    # The agent-written brief about this customer (matching.context_file).
    # Sent to the matcher instead of the raw correction list: it is compacted,
    # bounded, and it carries the *reason* behind the corrections, which
    # generalizes to line items the counters below have never seen.
    context_markdown: str = ""
    # normalized request -> sku -> {"chosen": n, "rejected": n, "pinned": bool}
    by_request: dict[str, dict[str, dict]] = field(default_factory=lambda: defaultdict(dict))
    # sku -> {"chosen": n, "rejected": n}, summed across every request this
    # customer ever corrected. Weaker signal than an exact-text hit, but it is
    # what lets a *new* line ("M8 bolt, 200pc") benefit from a correction made
    # on differently-worded text ("hex bolt m8x40 500x").
    by_sku: dict[str, dict] = field(default_factory=dict)
    examples: list[dict] = field(default_factory=list)

    def is_empty(self) -> bool:
        return not self.by_sku and not self.by_request


EMPTY_MEMORY = CustomerMemory()


def load_customer_memory(session_id: str, customer_name: str) -> CustomerMemory:
    key = customer_key_for(customer_name)
    memory = CustomerMemory(customer_key=key, customer_name=customer_name)

    preferences = CustomerPreference.objects.filter(demo_session_id=session_id, customer_key=key)
    for pref in preferences:
        memory.by_request[pref.normalized_request][pref.sku] = {
            "chosen": pref.times_chosen,
            "rejected": pref.times_rejected,
            "pinned": pref.pinned,
        }
        totals = memory.by_sku.setdefault(pref.sku, {"chosen": 0, "rejected": 0})
        totals["chosen"] += pref.times_chosen
        totals["rejected"] += pref.times_rejected

    corrections = CustomerCorrection.objects.filter(
        demo_session_id=session_id, customer_key=key, was_correction=True, chosen_sku__gt=""
    )[:MAX_PROMPT_EXAMPLES]
    memory.examples = [
        {
            "customer_wrote": correction.request_text,
            "ai_suggested_sku": correction.suggested_sku,
            "human_corrected_to_sku": correction.chosen_sku,
        }
        for correction in corrections
    ]

    # Imported here rather than at module scope: context_file imports the models
    # this module also uses, and a top-level import would be circular.
    from .context_file import get_context_file

    context = get_context_file(session_id, key)
    if context:
        memory.context_markdown = context.content

    return memory


def _learned_signal(counts: dict | None, pinned: bool) -> dict:
    if not counts:
        return {}
    signal = {
        "timesChosen": counts.get("chosen", 0),
        "timesRejected": counts.get("rejected", 0),
    }
    if pinned:
        signal["pinned"] = True
    return signal


def apply_memory(memory: CustomerMemory, request_text: str, candidates: list) -> list:
    """Re-rank one line's candidates using what this customer taught us, and
    tag each with the learned_signal that explains the move.

    Mutates and re-sorts `candidates` (matching.pipeline.ScoredCandidate).
    A no-op when the customer has no history, which is every customer on day
    one — the system has to be useful before it has learned anything.
    """
    if memory.is_empty() or not candidates:
        return candidates

    normalized = normalize_request_text(request_text)
    exact = memory.by_request.get(normalized, {})

    for candidate in candidates:
        sku = candidate.catalog_item.sku
        exact_counts = exact.get(sku)
        pinned = bool(exact_counts and exact_counts.get("pinned"))

        if pinned:
            # This exact request was corrected to this SKU and never overruled.
            # Don't re-argue it — the human already answered this question.
            candidate.score = PINNED_SCORE
            candidate.learned_signal = _learned_signal(exact_counts, pinned=True)
            candidate.proof_items = candidate.proof_items + [
                {
                    "kind": "catalog-attribute",
                    "label": "You corrected this exact request to this SKU before",
                    "sourceValue": request_text[:120],
                    "catalogValue": sku,
                    "supportsMatch": True,
                }
            ]
            continue

        counts = exact_counts or memory.by_sku.get(sku)
        if not counts:
            continue

        chosen = counts.get("chosen", 0)
        rejected = counts.get("rejected", 0)
        # log-scaled so repeat orders can't make the memory unfalsifiable
        boost = CHOSEN_WEIGHT * _log1p(chosen) - REJECTED_WEIGHT * _log1p(rejected)
        candidate.score = max(0.0, min(100.0, candidate.score + boost))
        candidate.learned_signal = _learned_signal(counts, pinned=False)

        if chosen:
            candidate.proof_items = candidate.proof_items + [
                {
                    "kind": "catalog-attribute",
                    "label": f"This customer picked this SKU {chosen}× before",
                    "sourceValue": memory.customer_name,
                    "catalogValue": sku,
                    "supportsMatch": True,
                }
            ]
        if rejected:
            candidate.missing_evidence = candidate.missing_evidence + [
                f"This customer rejected this SKU {rejected}× before"
            ]

    candidates.sort(key=lambda c: c.score, reverse=True)
    return candidates


def _log1p(value: int) -> float:
    from math import log1p

    return log1p(value)


def memory_examples_for_prompt(memory: CustomerMemory) -> list[dict]:
    """The same corrections, handed to the LLM as retrieved few-shot examples.

    Re-ranking after the fact fixes the reviewer's screen. This fixes the
    proposal itself, which is the difference between a system that stops
    being wrong and one that is merely overruled more efficiently.
    """
    return memory.examples


def record_correction(
    *,
    session_id: str,
    line_item,
    chosen_candidate=None,
    custom_label: str = "",
) -> CustomerCorrection:
    """Logs one reviewer decision and folds it into the aggregate.

    Called for every decision, not only the ones that changed something: a
    confirmed top pick is the evidence that the AI was right, and without it
    the memory only ever sees its own failures.
    """
    order = line_item.order
    key = customer_key_for(order.customer_name)
    normalized = normalize_request_text(line_item.original_text)

    ranked = list(line_item.match_candidates.order_by("rank"))
    suggested_sku = ranked[0].sku if ranked else ""
    chosen_sku = chosen_candidate.sku if chosen_candidate else ""
    chosen_rank = chosen_candidate.rank if chosen_candidate else None
    # A free-text override is a correction too — of everything we offered.
    was_correction = bool(custom_label) or (bool(chosen_sku) and chosen_sku != suggested_sku)

    correction = CustomerCorrection.objects.create(
        id=f"corr-{uuid.uuid4().hex[:12]}",
        demo_session_id=session_id,
        customer_key=key,
        customer_name=order.customer_name,
        request_text=line_item.original_text,
        normalized_request=normalized,
        suggested_sku=suggested_sku,
        chosen_sku=chosen_sku,
        custom_label=custom_label,
        chosen_rank=chosen_rank,
        was_correction=was_correction,
        order=order,
    )

    if chosen_sku and normalized:
        chosen_pref, _ = CustomerPreference.objects.get_or_create(
            demo_session_id=session_id,
            customer_key=key,
            normalized_request=normalized,
            sku=chosen_sku,
        )
        chosen_pref.times_chosen += 1
        chosen_pref.save()

        # Everything the AI ranked above the chosen SKU was, by the reviewer's
        # own action, wrong. Recording that is what stops the same wrong
        # suggestion coming back to the top next time — a memory that only
        # rewards the right answer takes far longer to converge.
        for candidate in ranked:
            if candidate.sku and candidate.sku != chosen_sku and candidate.rank < (chosen_rank or 99):
                rejected_pref, _ = CustomerPreference.objects.get_or_create(
                    demo_session_id=session_id,
                    customer_key=key,
                    normalized_request=normalized,
                    sku=candidate.sku,
                )
                rejected_pref.times_rejected += 1
                rejected_pref.save()

    return correction
