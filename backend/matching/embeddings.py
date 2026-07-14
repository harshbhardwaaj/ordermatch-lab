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
import threading

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


def vector_to_bytes(vector: list[float]) -> bytes:
    """How a vector is stored: float32, little-endian, no envelope.

    The width is not recorded because it is fixed by DIMENSIONS. A row of the
    wrong length is therefore a row embedded by an older model, and the reader
    skips it rather than trusting it (see SemanticIndex).
    """
    return np.asarray(vector, dtype=np.float32).tobytes()


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

    Loaded once per process and cached, because the memory arithmetic is
    unforgiving: Render's free instance is 512 MB, and the matrix has to be built
    without ever materializing the catalog's 3.9 million floats as Python
    objects. Measured on the real 10,202-item catalog, building this index:

        vectors as a JSON column   +86 MB resident, and never returned
        vectors as float32 bytes   +16 MB, which is the matrix itself

    The 86 MB was not the matrix. It was the boxed floats the JSON decoder had
    to create on the way to it — freed immediately, but the allocator keeps the
    heap it fragmented, so the cost is permanent. That was most of the reason a
    single pasted order could get the worker SIGKILLed.

    So the vectors are stored as raw float32 bytes (catalogs.models.CatalogItem)
    and each row is one np.frombuffer memcpy into a preallocated array. No
    intermediate Python floats exist at any point.

    Cached because the vectors do not change while the app runs: only
    embed_catalog writes them, and it runs at build time. Callers still
    .defer("embedding") so the rows themselves never carry the bytes around.

    Rows are L2-normalized once, which turns cosine similarity into a plain dot
    product: one matrix-vector multiply for the whole catalog, a few
    milliseconds, no Python loop.
    """

    _cached: SemanticIndex | None = None
    _lock = threading.Lock()

    def __init__(self):
        total = CatalogItem.objects.exclude(embedding=None).count()

        self.row_skus: list[str] = []

        if total == 0:
            self.available = False
            self.matrix = np.zeros((0, DIMENSIONS), dtype=np.float32)
            return

        matrix = np.zeros((total, DIMENSIONS), dtype=np.float32)

        # .iterator() so the driver streams the rows instead of buffering all
        # 10k at once, and the bytes of one chunk are the only vector data alive
        # at a time.
        rows = (
            CatalogItem.objects.exclude(embedding=None)
            .values_list("sku", "embedding")
            .iterator(chunk_size=1000)
        )

        row = 0
        for sku, blob in rows:
            vector = np.frombuffer(blob, dtype=np.float32)
            if vector.size != DIMENSIONS:
                # A vector from an older model, or a different width. Skipping it
                # costs one item's semantic recall; trusting it would silently
                # misalign every row after it. embed_catalog rewrites it on the
                # next build.
                continue
            matrix[row] = vector
            self.row_skus.append(sku)
            row += 1

        # Trim the rows nothing was written into (skipped vectors), so a row
        # index in the matrix always means the same item as in row_skus.
        self.matrix = matrix[:row]
        self.available = row > 0

        if not self.available:
            return

        norms = np.linalg.norm(self.matrix, axis=1, keepdims=True)
        # An all-zero vector would divide by zero and poison the matrix with
        # NaNs, which then silently rank first. Leave it as zeros: it simply
        # never matches anything.
        norms[norms == 0] = 1.0
        self.matrix /= norms

    @classmethod
    def load(cls) -> SemanticIndex:
        # The web process serves on threads (see backend/start.sh), so two
        # requests arriving together on a cold process would otherwise both
        # build the matrix — twice the memory spike, at exactly the worst moment.
        # The second one waits and gets the first one's index.
        if cls._cached is None:
            with cls._lock:
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
