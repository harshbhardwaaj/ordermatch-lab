"""Buys an embedding for every catalog item that needs one, and only for those.

Idempotent by content hash. An item whose text has not changed since it was last
embedded is skipped, so this can run on every deploy: the first run costs about
$0.006 for 10k items and every run after it costs nothing and takes a second.

That property is the whole reason load_catalog upserts instead of wiping. If the
catalog rows were deleted and re-created on each deploy, every vector would go
with them and be re-bought from the API on every restart.
"""

from __future__ import annotations

from django.core.management.base import BaseCommand

from catalogs.models import CatalogItem
from matching.embeddings import (
    DIMENSIONS,
    MODEL,
    embed_texts,
    embedding_text,
    text_hash,
    vector_to_bytes,
)


class Command(BaseCommand):
    help = "Embed catalog items that have no vector, or whose text has changed since they were embedded."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Re-embed everything, even items whose text has not changed.",
        )

    def handle(self, *args, **options):
        # .defer("embedding") so the rows do not drag 10k vectors into memory
        # just to be told most of them are unchanged. Which items already have
        # one is a single id query instead — reading item.embedding on a deferred
        # row would fire one SELECT per item, 10k of them.
        items = list(CatalogItem.objects.all().defer("embedding"))
        already_embedded = set(
            CatalogItem.objects.exclude(embedding=None).values_list("id", flat=True)
        )

        stale = []
        for item in items:
            text = embedding_text(item)
            current = text_hash(text)
            missing = item.id not in already_embedded
            if options["force"] or missing or item.embedding_hash != current:
                stale.append((item, text, current))

        if not stale:
            self.stdout.write(
                self.style.SUCCESS(f"All {len(items)} catalog items already embedded. Nothing to buy.")
            )
            return

        self.stdout.write(
            f"  embedding {len(stale)} of {len(items)} items "
            f"({MODEL}, {DIMENSIONS} dims)..."
        )

        vectors = embed_texts([text for _, text, _ in stale])

        if vectors is None:
            # No key, or the API is down. Not fatal: blocking falls back to
            # lexical-only retrieval, which is degraded but works. Failing the
            # build here would take the whole app down over a nice-to-have.
            self.stdout.write(
                self.style.WARNING(
                    "  no embeddings (no OPENAI_API_KEY, or the API call failed). "
                    "Matching will fall back to lexical retrieval only."
                )
            )
            return

        for (item, _, current), vector in zip(stale, vectors):
            item.embedding = vector_to_bytes(vector)
            item.embedding_hash = current

        CatalogItem.objects.bulk_update(
            [item for item, _, _ in stale], ["embedding", "embedding_hash"], batch_size=500
        )

        embedded = CatalogItem.objects.exclude(embedding=None).count()
        self.stdout.write(
            self.style.SUCCESS(
                f"Embedded {len(stale)} items. {embedded} of {len(items)} now have vectors."
            )
        )
