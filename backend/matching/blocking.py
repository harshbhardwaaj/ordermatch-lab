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
from dataclasses import dataclass, field
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
# A number wearing a unit: 40mm, 5m, 0.75kw, 10bar. The catalog writes the
# dimension bare ("10x2"), the customer writes it with a unit ("10mm bore, 2mm
# section"), and without this they share no token at all. Found by the eval:
# "viton o-ring, 10mm bore, 2mm section" retrieved nothing, because every one of
# its size tokens was invisible to a catalog that spells them 10 and 2.
_NUMBER_WITH_UNIT = re.compile(r"^(\d+(?:[.,]\d+)?)(mm|cm|m|kw|w|bar|v|a|kg|g|pcs|stk)$")


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

        unit_match = _NUMBER_WITH_UNIT.match(raw)
        if unit_match:
            # "0,75 kW" is how a German writes 0.75 kW, and it must reach the
            # same token as the catalog's "0.75".
            tokens.add(unit_match.group(1).replace(",", "."))

        # A compound *identifier* is also its parts. The catalog writes
        # "6205-2RS" as one token, so a customer asking for plain "6205" matched
        # nothing at all — the single most common way anyone names a bearing.
        #
        # Only tokens containing a digit, and only parts of two characters or
        # more. Splitting everything was tried first and measurably hurt: it
        # shreds a SKU like "OM-SEA-OR-10X2-FKM" into "om", "sea", "or", which
        # are noise that appears in thousands of rows and drowns the real signal.
        # Both of these were found by the eval, not by reading the code.
        if any(sep in raw for sep in "-./") and any(ch.isdigit() for ch in raw):
            tokens.update(part for part in re.split(r"[-./]", raw) if len(part) > 1)

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
    """An inverted index over the catalog, plus (when vectors exist) a semantic
    index beside it. Built once per order, not per line: the build is the
    expensive part (one pass over 10k rows) and every line of the same order
    queries the same index.

    Two retrievers, deliberately. Lexical is exact on "M8x40" and "DIN 933" and
    blind to meaning; semantic understands "Kugellager" is a ball bearing and
    blurs M8x40 into M8x50. Neither is sufficient. Merging them means a line
    only has to be findable by ONE of them.
    """

    items: list[CatalogItem]
    postings: dict[str, list[int]]
    idf: dict[str, float]
    token_counts: list[int]
    by_sku: dict[str, int]
    by_part_number: dict[str, int]
    semantic: object | None = None
    # line index -> its query vector, embedded in one batched call for the whole
    # order rather than one call per line.
    query_vectors: dict[int, list[float]] = field(default_factory=dict)

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

    def _semantic_shortlist(self, line_index: int | None, limit: int) -> list[CatalogItem]:
        """The rows a vector search finds, which is where the synonyms live."""
        if self.semantic is None or line_index is None:
            return []

        vector = self.query_vectors.get(line_index)
        if not vector:
            return []

        # The semantic index is a process-wide cache built from the whole
        # catalog, so it can return a SKU this order's item list does not
        # contain (a discontinued row, say). Map back by SKU and drop anything
        # that is not in play.
        found = []
        for sku, _ in self.semantic.search(vector, limit):
            index = self.by_sku.get(sku.strip().lower())
            if index is not None:
                found.append(self.items[index])
        return found

    def shortlist(
        self, extracted: dict, limit: int = SHORTLIST_SIZE, line_index: int | None = None
    ) -> list[CatalogItem]:
        """The ~40 catalog rows worth showing the matcher for this line.

        Lexical first, then semantic rows appended for anything lexical missed.
        A line only needs to be findable by one of the two.
        """
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

        # Both retrievers produce a full ranking, and the fusion decides. Giving
        # semantic a fixed slice of the slots instead would mean fusing a
        # complete list against a truncated one, which quietly biases the result
        # toward whichever list was allowed to be longer.
        semantic_rows = self._semantic_shortlist(line_index, limit)

        if len(scores) < MIN_LEXICAL_HITS:
            # Lexical found nothing to speak of. This is the "Kugellager" case,
            # and it is exactly what the semantic index is for: lead with it, and
            # only fall back to the fuzzy character sweep if there are no vectors
            # either.
            if semantic_rows:
                return _merge(semantic_rows, self._fuzzy_topup(query.lower(), limit), limit)
            return self._fuzzy_topup(query.lower(), limit)

        # Normalize by item length so a long description cannot win on sheer
        # surface area, and a terse-but-exact SKU row is not buried by it.
        ranked = sorted(
            scores.items(),
            key=lambda pair: pair[1] / math.sqrt(self.token_counts[pair[0]] or 1),
            reverse=True,
        )[:limit]
        lexical_rows = [self.items[index] for index, _ in ranked]

        shortlisted = (
            _merge(lexical_rows, semantic_rows, limit) if semantic_rows else lexical_rows[:limit]
        )

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


def _merge(primary: list[CatalogItem], secondary: list[CatalogItem], limit: int) -> list[CatalogItem]:
    """Reciprocal Rank Fusion of the two retrievers.

    An item's score is the sum of 1/(RRF_K + rank) over every list it appears
    in, so agreement between the two retrievers is what lifts a row rather than
    either one's raw score. That matters because their scores are not
    comparable: IDF-weighted token overlap and cosine similarity are different
    units, and normalizing them against each other is guesswork.

    Simply appending the semantic rows after the lexical ones, which is what
    this did first, fixes recall and does nothing for ranking. "Absperrhahn DN25
    Messing" retrieved a flat gasket first, because "DN25" is the only token it
    shares with anything, and the ball valve that the sentence obviously means
    sat below it. Fusion moves it up: only one retriever knows the word DN25,
    but both agree about the valve.

    RRF_K controls how much the top of each list dominates. The literature's
    default is 60, which is tuned for many retrievers over a huge corpus and
    badly wrong here: swept against eval_blocking, k=2 gives recall@10 of 91%
    and MRR 0.54, against 86% and 0.48 at k=20 and 0.475 at k=60. With only two
    retrievers and a 40-row shortlist there is no long tail to protect, so
    trusting a rank-1 hit is simply correct. This number is measured, not
    inherited.
    """
    RRF_K = 2

    scores: dict[str, float] = defaultdict(float)
    by_sku: dict[str, CatalogItem] = {}

    for ranking in (primary, secondary):
        for rank, item in enumerate(ranking):
            scores[item.sku] += 1.0 / (RRF_K + rank)
            by_sku[item.sku] = item

    ordered = sorted(scores.items(), key=lambda pair: pair[1], reverse=True)
    return [by_sku[sku] for sku, _ in ordered[:limit]]


def build_index(
    catalog_items: list[CatalogItem], line_items: list[dict] | None = None
) -> CatalogIndex:
    """Builds the lexical index, and the semantic one when the catalog carries
    vectors.

    `line_items` lets every line's query vector be bought in a single batched
    embeddings call for the whole order, rather than one call per line. A
    twenty-line order should cost one round trip, not twenty.
    """
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

    # The semantic half, but only if the catalog has actually been embedded. A
    # catalog with no vectors (no API key, embed_catalog never run) degrades to
    # lexical-only rather than failing, which is the whole point of keeping them
    # as two independent retrievers.
    #
    # The vectors are NOT read off catalog_items. Callers defer that column
    # precisely so the rows do not carry 300 MB of boxed Python floats; the
    # matrix is a process-wide cache loaded once, straight from the DB.
    semantic = None
    query_vectors: dict[int, list[float]] = {}

    if line_items is not None:
        from .embeddings import SemanticIndex, embed_texts

        index = SemanticIndex.load()
        if index.available:
            semantic = index

            if line_items:
                vectors = embed_texts([_line_text(line) for line in line_items])
                if vectors:
                    query_vectors = dict(enumerate(vectors))
                else:
                    # The embeddings call failed mid-order. Drop the semantic
                    # half for this order rather than half-applying it, so every
                    # line is retrieved the same way.
                    semantic = None

    return CatalogIndex(
        items=catalog_items,
        postings=postings,
        idf=idf,
        token_counts=token_counts,
        by_sku=by_sku,
        by_part_number=by_part_number,
        semantic=semantic,
        query_vectors=query_vectors,
    )
