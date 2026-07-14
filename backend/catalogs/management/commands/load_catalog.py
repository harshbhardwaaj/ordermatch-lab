"""Loads the checked-in catalog fixture into the database.

This is what runs on deploy, not generate_catalog. The distinction is the
point: the fixture is the source of truth, the database is a cache of it.

Idempotent, and deliberately so. It upserts by id and never deletes, which
means a redeploy does not churn the catalog rows. That matters more than it
looks: once catalog items carry embeddings, wiping and re-inserting them on
every deploy would throw away every vector and re-buy them from the API each
time. Nothing downstream of a catalog item should have to be rebuilt just
because the app restarted.
"""

from __future__ import annotations

import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from catalogs.models import CatalogItem

FIXTURE_PATH = (
    Path(__file__).resolve().parent.parent.parent.parent / "seed_data" / "generated_catalog.jsonl"
)


class Command(BaseCommand):
    help = "Load the generated catalog fixture (seed_data/generated_catalog.jsonl) into the database."

    @transaction.atomic
    def handle(self, *args, **options):
        if not FIXTURE_PATH.exists():
            raise CommandError(
                f"{FIXTURE_PATH.name} is missing. Regenerate it with:\n"
                f"    python manage.py generate_catalog --export"
            )

        records = [
            json.loads(line) for line in FIXTURE_PATH.read_text().splitlines() if line.strip()
        ]

        existing_ids = set(
            CatalogItem.objects.filter(id__startswith="gen-").values_list("id", flat=True)
        )

        to_create = []
        to_update = []
        for record in records:
            item = CatalogItem(customer_part_numbers=[], **record)
            if record["id"] in existing_ids:
                to_update.append(item)
            else:
                to_create.append(item)

        if to_create:
            CatalogItem.objects.bulk_create(to_create, batch_size=1000, ignore_conflicts=True)

        if to_update:
            CatalogItem.objects.bulk_update(
                to_update,
                [
                    "sku",
                    "name",
                    "category",
                    "description",
                    "manufacturer",
                    "manufacturer_part_number",
                    "attributes",
                    "default_unit",
                    "price_amount",
                    "price_currency",
                    "status",
                    "replacement_sku",
                ],
                batch_size=1000,
            )

        total = CatalogItem.objects.count()
        active = CatalogItem.objects.filter(status="active").count()
        self.stdout.write(
            self.style.SUCCESS(
                f"Loaded {len(records)} items from {FIXTURE_PATH.name} "
                f"({len(to_create)} new, {len(to_update)} updated). "
                f"Catalog holds {total} items, {active} active."
            )
        )
