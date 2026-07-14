"""The active catalog, loaded once per process instead of once per order.

Every pasted order used to run `list(CatalogItem.objects.filter(status="active"))`
and then build a fresh inverted index over the result. That is 10,202 model
instances and a full tokenizing pass, ~30 MB of allocation and ~1s of work, to
produce something byte-for-byte identical to what the last request produced. On a
512 MB box, that churn is what tips a worker over.

Safe to hold across requests because nothing mutates a CatalogItem while the app
is serving: the catalog is written by load_catalog and embed_catalog, both of
which run at build time in their own process. Matching only ever reads it.

Kept honest anyway. Any write to a CatalogItem drops the snapshot (see
CatalogsConfig.ready), so a test that creates an item, or a future admin edit,
cannot be served a stale catalog. The bulk writes in load_catalog do not fire
signals, but they run before the web process exists, so there is nothing to
invalidate.
"""

from __future__ import annotations

import threading

from .models import CatalogItem

_cached: list[CatalogItem] | None = None
_lock = threading.Lock()


def active_catalog() -> list[CatalogItem]:
    """The rows every order is matched against.

    .defer("embedding") because the vectors belong in one numpy matrix, not on
    10k model instances (matching.embeddings.SemanticIndex).

    Locked because the web process serves on threads: two requests arriving
    together on a cold process would otherwise both pull 10k rows.
    """
    global _cached
    if _cached is None:
        with _lock:
            if _cached is None:
                _cached = list(
                    CatalogItem.objects.filter(status="active").defer("embedding")
                )
    return _cached


def invalidate(**_kwargs) -> None:
    """Drop the snapshot and everything derived from it.

    Takes **kwargs so it can be connected directly to post_save/post_delete,
    which call receivers with sender/instance/etc.
    """
    global _cached
    _cached = None

    # Imported here, not at module import: matching imports catalogs, so a
    # top-level import back into matching would be a cycle.
    from matching.blocking import invalidate_lexical_index
    from matching.embeddings import SemanticIndex

    invalidate_lexical_index()
    SemanticIndex.invalidate()
