"""Blocking: narrow ~10,000 catalog items down to a shortlist of ~40, using
nothing but an inverted index and arithmetic, before anything expensive runs.

This exists because of one hard number. The semantic-match step used to put the
whole catalog in the prompt. At 46 items that is free. At 10,000 items it is
roughly half a million tokens per call, which is both unaffordable and past the
context limit, so the honest answer to "the catalog is bigger" is not a bigger
prompt, it is to stop sending the catalog at all.

The shape is standard in the entity-matching literature (blocking, then
matching — see Ditto, VLDB 2020, which reports a 3.8x pipeline speedup from
exactly this split). The point of the blocker is recall, not precision: it has
to get the right SKU *into* the shortlist. Deciding which of the shortlist is
right is the matcher's job, and now the matcher only ever sees 40 rows.

Deliberately lexical, not embeddings. Industrial part text is mostly
identifiers — M8x40, DIN 933, 6205-2RS, DN25 — where exact token overlap is a
strong signal and a dense vector is a lossy one. It also needs no model, no
API call, and no index to keep warm. Embedding-based blocking is the upgrade
when the catalog stops being mostly identifiers; it is not needed to be correct
here, and I would rather ship the version I can explain.
"""

from __future__ import annotations

import math
import re
from collections import defaultdict
from dataclasses import dataclass
from difflib import SequenceMatcher

from catalogs.models import CatalogItem

# How many survivors the matcher gets to look at. Big enough that the right SKU
# is essentially always in there (a "hex bolt M8x40" family is ~15 rows, and we
# want room for the neighbouring sizes too), small enough that the prompt stays
# a few thousand tokens instead of half a million.
SHORTLIST_SIZE = 40

# Below this many lexical hits, fall back to a fuzzy sweep (see _fuzzy_topup).
MIN_LEXICAL_HITS = 5

_TOKEN = re.compile(r"[a-z0-9]+(?:[./-][a-z0-9]+)*")
# M8x40, 25x40x7, 10x2: split so that "m8x40" also yields "m8" and "40", or a
# customer writing "M8 bolt, 40mm" would share no token with "M8x40".
_DIMENSION = re.compile(r"^([a-z]*\d+(?:\.\d+)?)(?:x([a-z]*\d+(?:\.\d+)?))+$")


def tokenize(text: str | None) -> set[str]:
    """Lowercase alphanumeric tokens, plus the parts of any dimension string.

    Keeps ./- inside a token so "din 933", "g1/4" and "6205-2rs" survive intact
    rather than being shredded into meaningless fragments.
    """
    if not text:
        return set()

    tokens: set[str] = set()
    for raw in _TOKEN.findall(text.lower()):
        tokens.add(raw)
        if _DIMENSION.match(raw):
            tokens.update(part for part in raw.split("x") if part)
        # "din933" and "din 933" should meet in the middle.
        merged = raw.replace("-", "").replace(".", "")
        if merged != raw:
            tokens.add(merged)
    return tokens


def _catalog_text(item: CatalogItem) -> str:
    attribute_text = " ".join(
        f"{a.get('name', '')} {a.get('value', '')}" for a in (item.attributes or [])
    )
    part_numbers = " ".join(item.customer_part_numbers or [])
    return " ".join(
        [item.sku, item.name, item.category, item.description, attribute_text, part_numbers]
    )


def _line_text(extracted: dict) -> str:
    attribute_text = " ".join(
        f"{a.get('name', '')} {a.get('value', '')}" for a in (extracted.get("attributes") or [])
    )
    return " ".join(
        str(part)
        for part in [
            extracted.get("original_text"),
            extracted.get("description"),
            extracted.get("requested_sku"),
            extracted.get("customer_part_number"),
            attribute_text,
        ]
        if part
    )


@dataclass
class CatalogIndex:
    """An inverted index over the catalog. Built once per order, not per line:
    the build is the expensive part (one pass over 10k rows) and every line of
    the same order queries the same index.
    """

    items: list[CatalogItem]
    postings: dict[str, list[int]]
    idf: dict[str, float]
    token_counts: list[int]
    by_sku: dict[str, int]
    by_part_number: dict[str, int]

    def _fuzzy_topup(self, query: str, limit: int) -> list[CatalogItem]:
        """Last resort when token overlap finds (almost) nothing.

        This is the honest weakness of a lexical blocker: a customer who writes
        only synonyms — "inox" for A2 stainless, "Kugellager" for ball bearing —
        shares no token with the catalog row, so the row is never retrieved and
        the LLM never gets the chance to recognize it. Character-level
        similarity is a poor substitute for meaning, but it is a great deal
        better than handing the reviewer an empty picker.

        It is O(catalog) and therefore only ever runs on the rare line that the
        index could not serve, never on the common path. The real fix is
        embedding-based retrieval, which recognizes "inox" and "A2 stainless" as
        the same thing; that is the next thing I would build, and it slots in
        exactly here.
        """
        scored = [
            (SequenceMatcher(None, query, f"{item.name} {item.description}".lower()).ratio(), index)
            for index, item in enumerate(self.items)
        ]
        scored.sort(reverse=True)
        return [self.items[index] for ratio, index in scored[:limit] if ratio > 0.2]

    def shortlist(self, extracted: dict, limit: int = SHORTLIST_SIZE) -> list[CatalogItem]:
        """The ~40 catalog rows worth showing the matcher for this line."""
        query = _line_text(extracted)
        query_tokens = tokenize(query)
        if not query_tokens:
            return []

        # Rare tokens carry the signal. "m8x40" appears in a handful of rows and
        # tells you almost everything; "bolt" appears in thousands and tells you
        # almost nothing. IDF is what encodes that difference.
        scores: dict[int, float] = defaultdict(float)
        for token in query_tokens:
            postings = self.postings.get(token)
            if not postings:
                continue
            weight = self.idf[token]
            for index in postings:
                scores[index] += weight

        if len(scores) < MIN_LEXICAL_HITS:
            return self._fuzzy_topup(query.lower(), limit)

        # Normalize by item length so a long description cannot win on sheer
        # surface area, and a terse-but-exact SKU row is not buried by it.
        ranked = sorted(
            scores.items(),
            key=lambda pair: pair[1] / math.sqrt(self.token_counts[pair[0]] or 1),
            reverse=True,
        )[:limit]
        shortlisted = [self.items[index] for index, _ in ranked]

        # A stated identifier is not a hint, it is an answer. If the customer
        # named a SKU or their own part number, that row goes in the shortlist
        # even if the surrounding free text scored it off the bottom.
        for stated in (extracted.get("requested_sku"), extracted.get("customer_part_number")):
            if not stated:
                continue
            key = str(stated).strip().lower()
            index = self.by_sku.get(key)
            if index is None:
                index = self.by_part_number.get(key)
            if index is not None and self.items[index] not in shortlisted:
                shortlisted.insert(0, self.items[index])

        return shortlisted[:limit]


def build_index(catalog_items: list[CatalogItem]) -> CatalogIndex:
    postings: dict[str, list[int]] = defaultdict(list)
    token_counts: list[int] = []
    by_sku: dict[str, int] = {}
    by_part_number: dict[str, int] = {}

    for index, item in enumerate(catalog_items):
        tokens = tokenize(_catalog_text(item))
        token_counts.append(len(tokens))
        for token in tokens:
            postings[token].append(index)

        by_sku[item.sku.strip().lower()] = index
        for part_number in item.customer_part_numbers or []:
            by_part_number[str(part_number).strip().lower()] = index

    total = len(catalog_items) or 1
    idf = {
        token: math.log(total / len(item_indexes))
        for token, item_indexes in postings.items()
    }

    return CatalogIndex(
        items=catalog_items,
        postings=postings,
        idf=idf,
        token_counts=token_counts,
        by_sku=by_sku,
        by_part_number=by_part_number,
    )
