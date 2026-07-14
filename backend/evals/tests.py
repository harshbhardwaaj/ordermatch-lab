from unittest.mock import patch

from django.test import TestCase

from catalogs.models import CatalogItem
from matching.pipeline import ScoredCandidate
from orders.extraction import ExtractionError

from .generation import generate_eval_run


def make_catalog_item(item_id, sku):
    return CatalogItem.objects.create(
        id=item_id,
        sku=sku,
        name="Test bolt",
        category="fasteners",
        description="A test bolt.",
        default_unit="pcs",
    )


def make_order(order_id, original_excerpt, ground_truth):
    return {
        "id": order_id,
        "originalExcerpt": original_excerpt,
        "groundTruth": ground_truth,
    }


class GenerateEvalRunTests(TestCase):
    def setUp(self):
        self.catalog_item = make_catalog_item("cat-1", "OM-TEST-001")

    def test_clean_match_scores_every_metric_favorably(self):
        order = make_order(
            "ord-1",
            "10 pcs of test bolt",
            {
                "expectedHeaderFields": {"customerName": "Acme"},
                "lineItems": [
                    {
                        "lineItemId": "line-1",
                        "expectedQuantity": 10,
                        "expectedUnit": "pcs",
                        "expectedAttributes": {},
                        "expectedSku": "OM-TEST-001",
                        "expectedOutcome": "auto-match",
                        "expectedExceptionCategories": [],
                    }
                ],
            },
        )
        extracted_payload = {
            "customer_name": "Acme",
            "customer_reference": None,
            "requested_delivery_date": None,
            "delivery_location": None,
            "currency": None,
            "line_items": [
                {
                    "original_text": "10 pcs of test bolt",
                    "description": "test bolt",
                    "quantity": 10,
                    "unit": "pcs",
                    "customer_part_number": None,
                    "requested_sku": None,
                    "attributes": [],
                }
            ],
        }

        with patch("evals.generation._load_sample_orders", return_value=[order]), patch(
            "evals.generation.extract_order", return_value=extracted_payload
        ), patch(
            "evals.generation.match_order_lines",
            return_value=[[ScoredCandidate(catalog_item=self.catalog_item, score=95, proof_items=[])]],
        ):
            run = generate_eval_run()

        metrics = {m.key: m.value for m in run.metrics.all()}
        self.assertEqual(metrics["sku-top-1-accuracy"], 100.0)
        self.assertEqual(metrics["sku-top-3-recall"], 100.0)
        self.assertEqual(metrics["auto-approval-rate"], 100.0)
        self.assertEqual(metrics["false-confident-matches"], 0.0)
        self.assertEqual(metrics["human-correction-rate"], 0.0)
        self.assertFalse(run.failure_cases.exists())

    def test_out_of_scope_category_excluded_from_false_confident_but_not_human_correction(self):
        """A line auto-approved with the right SKU, but whose ground truth
        wants review for a reason the real pipeline never enforces
        (price-mismatch/duplicate-line/missing-unit), must not count as a
        false-confident SKU match -- the SKU itself was right. It should
        still count toward human-correction-rate, since a human genuinely
        would need to look, just for a reason outside this pipeline's
        scope.
        """
        order = make_order(
            "ord-1",
            "10 pcs of test bolt",
            {
                "expectedHeaderFields": {},
                "lineItems": [
                    {
                        "lineItemId": "line-1",
                        "expectedQuantity": 10,
                        "expectedUnit": "pcs",
                        "expectedAttributes": {},
                        "expectedSku": "OM-TEST-001",
                        "expectedOutcome": "human-review",
                        "expectedExceptionCategories": ["price-mismatch"],
                    }
                ],
            },
        )
        extracted_payload = {
            "customer_name": None,
            "customer_reference": None,
            "requested_delivery_date": None,
            "delivery_location": None,
            "currency": None,
            "line_items": [
                {
                    "original_text": "10 pcs of test bolt",
                    "description": "test bolt",
                    "quantity": 10,
                    "unit": "pcs",
                    "customer_part_number": None,
                    "requested_sku": None,
                    "attributes": [],
                }
            ],
        }

        with patch("evals.generation._load_sample_orders", return_value=[order]), patch(
            "evals.generation.extract_order", return_value=extracted_payload
        ), patch(
            "evals.generation.match_order_lines",
            return_value=[[ScoredCandidate(catalog_item=self.catalog_item, score=95, proof_items=[])]],
        ):
            run = generate_eval_run()

        metrics = {m.key: m.value for m in run.metrics.all()}
        self.assertEqual(metrics["false-confident-matches"], 0.0)
        self.assertEqual(metrics["human-correction-rate"], 100.0)
        failure_keys = {f.metric_key for f in run.failure_cases.all()}
        self.assertIn("human-correction-rate", failure_keys)
        self.assertNotIn("false-confident-matches", failure_keys)

    def test_extraction_failure_is_recorded_as_a_blocking_failure_case(self):
        order = make_order("ord-1", "garbage text", {"expectedHeaderFields": {}, "lineItems": []})

        with patch("evals.generation._load_sample_orders", return_value=[order]), patch(
            "evals.generation.extract_order", side_effect=ExtractionError("could not read that")
        ):
            run = generate_eval_run()

        failures = list(run.failure_cases.all())
        self.assertEqual(len(failures), 1)
        self.assertEqual(failures[0].severity, "blocking")
        self.assertIn("could not read that", failures[0].actual)


class EvalRouteRemovedTests(TestCase):
    """security-review.md finding 3: /api/eval-runs/ served every metric and
    failure case unauthenticated. It is unregistered; nothing should resolve."""

    def test_eval_runs_endpoint_is_not_public(self):
        from django.test import Client

        response = Client().get("/api/eval-runs/")
        self.assertEqual(response.status_code, 404)
