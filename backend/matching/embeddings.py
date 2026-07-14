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

    Loaded straight out of the database into numpy and cached for the life of
    the process, because the memory arithmetic is unforgiving. Measured on the
    real 10,202-item catalog:

        django, idle                        54 MB
        + catalog rows carrying embeddings 365 MB   <-- and this per request
        + both indexes built               436 MB

    against Render's 512 MB. One concurrent request and the process dies. The
    cost is not the numpy matrix, which is 16 MB; it is holding 10,202 x 384
    Python floats, which is roughly 300 MB of pointers and boxed objects. So the
    embeddings are never loaded onto the model instances at all (callers use
    .defer("embedding")); they come out of the DB as raw values, go straight into
    one float32 array, and the Python lists are freed immediately.

    Cached because the vectors do not change between deploys: rebuilding this on
    every order was buying 300 MB of garbage per request to produce a matrix that
    was byte-identical to the last one.

    Rows are L2-normalized once, which turns cosine similarity into a plain dot
    product: one matrix-vector multiply for the whole catalog, a few
    milliseconds, no Python loop.
    """

    _cached: SemanticIndex | None = None

    def __init__(self):
        total = CatalogItem.objects.exclude(embedding=None).count()

        self.available = total > 0
        self.row_skus: list[str] = []

        if not self.available:
            self.matrix = np.zeros((0, DIMENSIONS), dtype=np.float32)
            return

        # Preallocate and fill row by row. Materializing the vectors as a list
        # first and handing that to np.asarray works, and costs ~240 MB of peak
        # RSS on a 512 MB box, because for a moment every one of the 3.9 million
        # floats is a boxed Python object. Streaming them into a preallocated
        # float32 array means only one chunk is ever alive at a time.
        self.matrix = np.zeros((total, DIMENSIONS), dtype=np.float32)

        rows = (
            CatalogItem.objects.exclude(embedding=None)
            .values_list("sku", "embedding")
            .iterator(chunk_size=500)
        )
        for index, (sku, vector) in enumerate(rows):
            self.matrix[index] = vector
            self.row_skus.append(sku)

        norms = np.linalg.norm(self.matrix, axis=1, keepdims=True)
        # An all-zero vector would divide by zero and poison the matrix with
        # NaNs, which then silently rank first. Leave it as zeros: it simply
        # never matches anything.
        norms[norms == 0] = 1.0
        self.matrix /= norms

    @classmethod
    def load(cls) -> SemanticIndex:
        if cls._cached is None:
            cls._cached = cls()
        return cls._cached

    @classmethod
    def invalidate(cls) -> None:
        """After embed_catalog changes the vectors. Only ever needed in a
        management command or a test; a running web process never mutates them.
        """
        cls._cached = None

    def search(self, query_vector: list[float], limit: int) -> list[tuple[str, float]]:
        """(sku, similarity), best first. SKUs rather than list indexes, because
        the caller's catalog list is no longer what this was built from.
        """
        if not self.available:
            return []

        query = np.asarray(query_vector, dtype=np.float32)
        norm = np.linalg.norm(query)
        if norm == 0:
            return []
        query = query / norm

        scores = self.matrix @ query
        limit = min(limit, len(scores))
        top = np.argpartition(-scores, limit - 1)[:limit]
        top = top[np.argsort(-scores[top])]

        return [(self.row_skus[i], float(scores[i])) for i in top]
