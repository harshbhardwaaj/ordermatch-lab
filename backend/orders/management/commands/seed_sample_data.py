import json
from datetime import datetime
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone as django_timezone

from catalogs.models import CatalogItem
from evals.models import EvalFailureCase, EvalMetric, EvalRun
from matching.memory import customer_key_for, normalize_request_text
from matching.models import CustomerCorrection, CustomerPreference, MatchCandidate
from orders.models import OrderException, OrderLineItem, OrderRecord, ReadinessCheck

SEED_DIR = Path(__file__).resolve().parent.parent.parent.parent / "seed_data"


def _parse_dt(value):
    if not value:
        return None
    parsed = datetime.fromisoformat(value)
    if django_timezone.is_naive(parsed):
        parsed = django_timezone.make_aware(parsed)
    return parsed


class Command(BaseCommand):
    """Loads the grounded synthetic sample data (T102) from
    backend/seed_data/*.json, generated from frontend/data/*.ts by
    backend/scripts/export_frontend_data.mjs. Regenerate that JSON with:

        node --experimental-strip-types scripts/export_frontend_data.mjs

    if the frontend sample data changes.
    """

    help = "Seed the database with the grounded synthetic sample data."

    @transaction.atomic
    def handle(self, *args, **options):
        self._seed_catalog_items()
        self._seed_orders()
        self._seed_customer_memory()
        self._seed_eval_runs()
        self.stdout.write(self.style.SUCCESS("Seed data loaded."))

    def _seed_customer_memory(self):
        """Two customers arrive with a little history already, so the memory
        is not an empty screen on a first visit — and, more usefully, so the
        two of them visibly disagree.

        Both buy an M8x40 hex bolt and both write it vaguely. Vogt corrects
        us toward A4 (marine grade, they build for coastal sites); LakePort
        corrects us toward plain zinc (they are price-led). Same words, same
        catalog, opposite right answer. That is the entire argument for
        keeping this memory per customer rather than global, and it is worth
        being able to show rather than assert.

        Seeded as templates (demo_session_id=""), cloned per visitor by
        orders.services.ensure_session_samples, exactly like the orders are.
        """
        templates = [
            {
                "customer_name": "Vogt Hydraulik GmbH",
                "request_text": "hex bolt m8x40 inox qty 500",
                "suggested_sku": "OM-FAS-HB-M8X40-A2-D933",
                "chosen_sku": "OM-FAS-HB-M8X40-A4-D933",
                "chosen_rank": 2,
            },
            {
                "customer_name": "LakePort Maintenance Supply LLC",
                "request_text": "hex bolt m8x40 500 pcs",
                "suggested_sku": "OM-FAS-HB-M8X40-A2-D933",
                "chosen_sku": "OM-FAS-HB-M8X40-ZN-D933",
                "chosen_rank": 3,
            },
        ]

        for index, template in enumerate(templates, start=1):
            key = customer_key_for(template["customer_name"])
            normalized = normalize_request_text(template["request_text"])

            CustomerCorrection.objects.update_or_create(
                id=f"corr-seed-{index}",
                defaults={
                    "demo_session_id": "",
                    "customer_key": key,
                    "customer_name": template["customer_name"],
                    "request_text": template["request_text"],
                    "normalized_request": normalized,
                    "suggested_sku": template["suggested_sku"],
                    "chosen_sku": template["chosen_sku"],
                    "chosen_rank": template["chosen_rank"],
                    "was_correction": True,
                },
            )
            CustomerPreference.objects.update_or_create(
                demo_session_id="",
                customer_key=key,
                normalized_request=normalized,
                sku=template["chosen_sku"],
                defaults={"times_chosen": 1, "times_rejected": 0},
            )
            CustomerPreference.objects.update_or_create(
                demo_session_id="",
                customer_key=key,
                normalized_request=normalized,
                sku=template["suggested_sku"],
                defaults={"times_chosen": 0, "times_rejected": 1},
            )

        self.stdout.write(f"  customer memory templates: {len(templates)}")

    def _seed_catalog_items(self):
        items = json.loads((SEED_DIR / "catalog_items.json").read_text())
        for item in items:
            price = item.get("price") or {}
            CatalogItem.objects.update_or_create(
                id=item["id"],
                defaults={
                    "sku": item["sku"],
                    "name": item["name"],
                    "category": item["category"],
                    "description": item["description"],
                    "manufacturer": item.get("manufacturer", ""),
                    "manufacturer_part_number": item.get("manufacturerPartNumber", ""),
                    "customer_part_numbers": item.get("customerPartNumbers", []),
                    "attributes": item.get("attributes", []),
                    "default_unit": item["defaultUnit"],
                    "price_amount": price.get("amount"),
                    "price_currency": price.get("currency", ""),
                    "status": item["status"],
                    "replacement_sku": item.get("replacementSku", ""),
                    "updated_at": _parse_dt(item.get("updatedAt")),
                },
            )
        self.stdout.write(f"  catalog items: {len(items)}")

    def _seed_orders(self):
        orders = json.loads((SEED_DIR / "sample_orders.json").read_text())
        order_count = line_item_count = exception_count = 0
        readiness_count = candidate_count = 0

        for order in orders:
            header = order["header"]
            record, _ = OrderRecord.objects.update_or_create(
                id=order["id"],
                defaults={
                    "order_number": header.get("orderId", ""),
                    "customer_name": header["customerName"],
                    "customer_reference": header.get("customerReference", ""),
                    "source": header["source"],
                    "received_at": _parse_dt(header["receivedAt"]),
                    "requested_delivery_date": header.get("requestedDeliveryDate", ""),
                    "delivery_location": header.get("deliveryLocation", ""),
                    "currency": header["currency"],
                    "field_status": header.get("fieldStatus", {}),
                    "status": order["status"],
                    "customer_profile": order.get("customerProfile", {}),
                    "source_document_summary": order.get("sourceDocumentSummary", ""),
                    "original_excerpt": order.get("originalExcerpt", ""),
                    "ground_truth": order.get("groundTruth", {}),
                    "covered_edge_cases": order.get("coveredEdgeCases", []),
                    "is_simulated": order.get("isSimulated", True),
                },
            )
            order_count += 1

            for line in order["lineItems"]:
                OrderLineItem.objects.update_or_create(
                    id=line["id"],
                    defaults={
                        "order": record,
                        "line_number": line["lineNumber"],
                        "original_text": line["originalText"],
                        "normalized_name": line.get("normalizedName", ""),
                        "normalized_attributes": line.get("normalizedAttributes", {}),
                        "quantity": line.get("quantity"),
                        "unit": line.get("unit", ""),
                        "requested_sku": line.get("requestedSku", ""),
                        "customer_part_number": line.get("customerPartNumber", ""),
                        "unit_price": line.get("unitPrice"),
                        "currency": line.get("currency", ""),
                        "status": line["status"],
                    },
                )
                line_item_count += 1

            for exc in order["exceptions"]:
                OrderException.objects.update_or_create(
                    id=exc["id"],
                    defaults={
                        "order": record,
                        "category": exc["category"],
                        "severity": exc["severity"],
                        "status": exc["status"],
                        "line_item_id": exc.get("lineItemId"),
                        "title": exc["title"],
                        "description": exc["description"],
                        "blocks_erp_readiness": exc["blocksErpReadiness"],
                        "recovery_action": exc.get("recoveryAction", ""),
                    },
                )
                exception_count += 1

            for check in order["readinessChecks"]:
                ReadinessCheck.objects.update_or_create(
                    id=check["id"],
                    defaults={
                        "order": record,
                        "label": check["label"],
                        "status": check["status"],
                        "reason": check.get("reason", ""),
                        "related_line_item_ids": check.get("relatedLineItemIds", []),
                        "related_exception_ids": check.get("relatedExceptionIds", []),
                    },
                )
                readiness_count += 1

            for candidate in order["matchCandidates"]:
                MatchCandidate.objects.update_or_create(
                    id=candidate["id"],
                    defaults={
                        "line_item_id": candidate["lineItemId"],
                        "catalog_item_id": candidate.get("catalogItemId"),
                        "sku": candidate.get("sku", ""),
                        "confidence_band": candidate["confidenceBand"],
                        "score": candidate.get("score"),
                        "rank": candidate["rank"],
                        "proof_items": candidate.get("proofItems", []),
                        "missing_evidence": candidate.get("missingEvidence", []),
                        "conflicting_evidence": candidate.get("conflictingEvidence", []),
                        "requires_human_review": candidate["requiresHumanReview"],
                    },
                )
                candidate_count += 1

            # Now that candidates exist, backfill each line item's selected match.
            for line in order["lineItems"]:
                selected_id = line.get("selectedMatchCandidateId")
                if selected_id:
                    OrderLineItem.objects.filter(id=line["id"]).update(
                        selected_match_candidate_id=selected_id
                    )

        self.stdout.write(
            f"  orders: {order_count}, line items: {line_item_count}, "
            f"exceptions: {exception_count}, readiness checks: {readiness_count}, "
            f"match candidates: {candidate_count}"
        )

    def _seed_eval_runs(self):
        runs = json.loads((SEED_DIR / "eval_runs.json").read_text())
        for run in runs:
            record, _ = EvalRun.objects.update_or_create(
                id=run["id"],
                defaults={
                    "status": run["status"],
                    "started_at": _parse_dt(run.get("startedAt")),
                    "completed_at": _parse_dt(run.get("completedAt")),
                    "is_simulated": run.get("isSimulated", True),
                },
            )
            record.metrics.all().delete()
            for metric in run["metrics"]:
                EvalMetric.objects.create(
                    run=record,
                    key=metric["key"],
                    label=metric["label"],
                    value=metric["value"],
                    unit=metric["unit"],
                    sample_size=metric.get("sampleSize"),
                    last_updated_at=_parse_dt(metric.get("lastUpdatedAt")),
                )
            record.failure_cases.all().delete()
            for failure in run["failureCases"]:
                EvalFailureCase.objects.create(
                    run=record,
                    line_item_id=failure.get("lineItemId"),
                    metric_key=failure["metricKey"],
                    title=failure["title"],
                    expected=failure["expected"],
                    actual=failure["actual"],
                    severity=failure["severity"],
                )
        self.stdout.write(f"  eval runs: {len(runs)}")
