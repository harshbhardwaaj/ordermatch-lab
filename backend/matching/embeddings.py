"""Semantic retrieval: the half of blocking that understands words rather than
just matching them.

The lexical index in blocking.py is very good at identifiers and completely
blind to meaning. "Kugellager" and "ball bearing" share no character, so a
German customer writing at an English catalog retrieves nothing at all. That is
not an edge case for an industrial distributor in Munich, it is most of the
inbox.

Embeddings fix exactly that, and nothing else. They are worse than the lexical
index at the thing it is good at: a vector blurs "M8x40" and "M8x50" together,
which is precisely the distinction the whole case turns on. So this does not
replace lexical retrieval, it runs beside it, and the two shortlists are merged.
Each covers the other's blind spot.

Why the API and not a local model. Render's free tier is 512 MB of RAM and 0.1
CPU. sentence-transformers pulls in PyTorch, which is several hundred megabytes
resident before it has loaded a single weight, so the app would die on boot and
we would be paying for a bigger box to run a model that saves us nothing. The
API needs no model in the process at all: catalog vectors are bought once
(~$0.006 for 10k items), stored in Postgres, and loaded into one numpy array
(~16 MB) that a cosine search sweeps in about five milliseconds.

The cost of that choice, stated plainly: matching now depends on an API call on
the critical path. When it fails, retrieval falls back to lexical-only, which is
degraded but works — and never to nothing.
"""

from __future__ import annotations

import hashlib

import numpy as np
from django.conf import settings
from openai import OpenAI, OpenAIError

from catalogs.models import CatalogItem

MODEL = "text-embedding-3-small"

# The model's native width is 1536. It is trained so that a truncated prefix is
# still a usable embedding, so 384 buys a 4x cut in memory and cosine time for
# very little recall — and 10k x 1536 floats would be 63 MB of a 512 MB box.
DIMENSIONS = 384

# The API takes many inputs per call. Embedding 10k items one at a time would be
# 10k round trips.
BATCH_SIZE = 256


def embedding_text(item: CatalogItem) -> str:
    """What actually gets embedded.

    Name and description carry the meaning. The SKU is deliberately left out:
    "OM-FAS-HB-M8X40-A2-DIN933" is an identifier, the lexical index already
    matches it exactly, and feeding a model a string of codes mostly adds noise
    to the vector.
    """
    attributes = " ".join(
        f"{a.get('name', '')} {a.get('value', '')}" for a in (item.attributes or [])
    )
    return f"{item.name}. {item.description} {attributes}".strip()


def text_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:64]


def embed_texts(texts: list[str]) -> list[list[float]] | None:
    """Returns one vector per input, or None when embedding is unavailable.

    None rather than an exception on purpose: every caller's correct response to
    "no embeddings right now" is to carry on with lexical retrieval, not to fail
    the order.
    """
    if not settings.OPENAI_API_KEY or not texts:
        return None

    client = OpenAI(api_key=settings.OPENAI_API_KEY, timeout=30.0)
    vectors: list[list[float]] = []

    try:
        for start in range(0, len(texts), BATCH_SIZE):
            response = client.embeddings.create(
                model=MODEL,
                input=texts[start : start + BATCH_SIZE],
                dimensions=DIMENSIONS,
            )
            vectors.extend(row.embedding for row in response.data)
    except (OpenAIError, AttributeError, IndexError):
        return None

    return vectors


class SemanticIndex:
    """The catalog's vectors as one matrix, plus a cosine search over it.

    Rows are L2-normalized once at construction, which turns cosine similarity
    into a plain dot product: one matrix-vector multiply for the whole catalog,
    a few milliseconds, no per-item Python loop.
    """

    def __init__(self, items: list[CatalogItem]):
        embedded = [(index, item) for index, item in enumerate(items) if item.embedding]

        self.item_indexes = [index for index, _ in embedded]
        self.available = len(embedded) > 0

        if not self.available:
            self.matrix = np.zeros((0, DIMENSIONS), dtype=np.float32)
            return

        matrix = np.asarray([item.embedding for _, item in embedded], dtype=np.float32)
        norms = np.linalg.norm(matrix, axis=1, keepdims=True)
        # An all-zero vector would divide by zero and poison the matrix with
        # NaNs, which then silently rank first. Leave it as zeros: it simply
        # never matches anything.
        norms[norms == 0] = 1.0
        self.matrix = matrix / norms

    def search(self, query_vector: list[float], limit: int) -> list[tuple[int, float]]:
        """(index into the original items list, similarity), best first."""
        if not self.available:
            return []

        query = np.asarray(query_vector, dtype=np.float32)
        norm = np.linalg.norm(query)
        if norm == 0:
            return []
        query = query / norm

        scores = self.matrix @ query
        top = np.argpartition(-scores, min(limit, len(scores) - 1))[:limit]
        top = top[np.argsort(-scores[top])]

        return [(self.item_indexes[i], float(scores[i])) for i in top]
