import json
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from catalogs.models import CatalogItem
from matching.models import MatchCandidate, MatchDecision
from matching.pipeline import ScoredCandidate
from onboarding.models import SetupConfiguration

from .extraction import ExtractionError, extract_order
from .models import OrderException, OrderLineItem, OrderRecord


def make_order(order_id="ord-test-1", status="review-needed"):
    return OrderRecord.objects.create(
        id=order_id,
        order_number="PO-TEST-1",
        customer_name="Test Customer GmbH",
        source="pdf",
        received_at=timezone.now(),
        currency="EUR",
        status=status,
        source_document_summary="A test purchase order.",
    )


def make_catalog_item(item_id="cat-test-1", sku="OM-TEST-001"):
    return CatalogItem.objects.create(
        id=item_id,
        sku=sku,
        name="Test bolt",
        category="fasteners",
        description="A test bolt.",
        default_unit="pcs",
    )


def make_line_item(order, line_id="line-test-1", status="review-needed"):
    return OrderLineItem.objects.create(
        id=line_id,
        order=order,
        line_number=10,
        original_text="test bolt qty 10",
        status=status,
    )


def make_candidate(line_item, catalog_item, candidate_id="match-test-1", rank=1):
    return MatchCandidate.objects.create(
        id=candidate_id,
        line_item=line_item,
        catalog_item=catalog_item,
        sku=catalog_item.sku,
        confidence_band="high-confidence",
        score=0.9,
        rank=rank,
    )


class OrderReadEndpointsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.order = make_order()
        self.catalog_item = make_catalog_item()
        self.line_item = make_line_item(self.order)
        self.candidate = make_candidate(self.line_item, self.catalog_item)

    def test_list_orders(self):
        response = self.client.get("/api/orders/")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(len(body), 1)
        # The intake screen displays order_number and source_document_summary
        # directly on the list view, both must survive the lighter shape.
        self.assertEqual(body[0]["order_number"], "PO-TEST-1")
        self.assertEqual(body[0]["source_document_summary"], "A test purchase order.")

    def test_order_detail_includes_erp_readiness_and_hides_confidence(self):
        response = self.client.get(f"/api/orders/{self.order.id}/")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertFalse(body["erp_ready"])
        self.assertEqual(body["unresolved_line_count"], 1)

        candidate = body["line_items"][0]["match_candidates"][0]
        self.assertNotIn("confidence_band", candidate)
        self.assertNotIn("score", candidate)
        self.assertFalse(body["line_items"][0]["resolved_by_decision"])


class LineItemDecisionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.order = make_order()
        self.catalog_item = make_catalog_item()
        self.line_item = make_line_item(self.order)
        self.candidate = make_candidate(self.line_item, self.catalog_item)

    def test_decide_with_candidate_id_matches_line_and_resolves_order(self):
        response = self.client.post(
            f"/api/line-items/{self.line_item.id}/decide/",
            {"candidate_id": self.candidate.id},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.line_item.refresh_from_db()
        self.assertEqual(self.line_item.status, "matched")
        self.assertEqual(self.line_item.selected_match_candidate_id, self.candidate.id)
        # Mirrors the original frontend-only behavior: the display name
        # updates to the chosen candidate's catalog item name.
        self.assertEqual(self.line_item.normalized_name, self.catalog_item.name)

        order_response = self.client.get(f"/api/orders/{self.order.id}/")
        self.assertTrue(order_response.json()["erp_ready"])
        self.assertTrue(response.json()["resolved_by_decision"])

    def test_decide_with_custom_label_sets_normalized_name_and_no_candidate(self):
        response = self.client.post(
            f"/api/line-items/{self.line_item.id}/decide/",
            {"custom_label": "Hand-typed correction"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.line_item.refresh_from_db()
        self.assertEqual(self.line_item.status, "matched")
        self.assertEqual(self.line_item.normalized_name, "Hand-typed correction")
        self.assertIsNone(self.line_item.selected_match_candidate_id)

    def test_decide_rejects_neither_field(self):
        response = self.client.post(
            f"/api/line-items/{self.line_item.id}/decide/", {}, format="json"
        )
        self.assertEqual(response.status_code, 400)

    def test_decide_rejects_both_fields(self):
        response = self.client.post(
            f"/api/line-items/{self.line_item.id}/decide/",
            {"candidate_id": self.candidate.id, "custom_label": "x"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_decide_rejects_candidate_from_a_different_line_item(self):
        other_line = make_line_item(self.order, line_id="line-test-2")
        other_candidate = make_candidate(
            other_line, self.catalog_item, candidate_id="match-test-2"
        )
        response = self.client.post(
            f"/api/line-items/{self.line_item.id}/decide/",
            {"candidate_id": other_candidate.id},
            format="json",
        )
        self.assertEqual(response.status_code, 404)

    def test_defer_then_reopen(self):
        defer_response = self.client.post(
            f"/api/line-items/{self.line_item.id}/defer/", {}, format="json"
        )
        self.assertEqual(defer_response.status_code, 200)
        self.assertEqual(self.line_item.decisions.filter(decision="deferred").count(), 1)

        reopen_response = self.client.post(
            f"/api/line-items/{self.line_item.id}/reopen/", {}, format="json"
        )
        self.assertEqual(reopen_response.status_code, 200)
        self.line_item.refresh_from_db()
        self.assertEqual(self.line_item.status, "review-needed")


class ExceptionResolutionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.order = make_order()
        self.line_item = make_line_item(self.order)
        self.exception = OrderException.objects.create(
            id="exc-test-1",
            order=self.order,
            category="ambiguous-sku",
            severity="review",
            status="open",
            line_item=self.line_item,
            title="Ambiguous SKU",
            description="Needs review.",
        )

    def test_resolve_exception(self):
        response = self.client.post(
            f"/api/exceptions/{self.exception.id}/resolve/", {}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.exception.refresh_from_db()
        self.assertEqual(self.exception.status, "resolved")


class SendToErpTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.order = make_order()
        self.catalog_item = make_catalog_item()

    def test_send_to_erp_blocked_while_lines_unresolved(self):
        make_line_item(self.order, status="review-needed")
        response = self.client.post(
            f"/api/orders/{self.order.id}/send-to-erp/", {}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.order.refresh_from_db()
        self.assertNotEqual(self.order.status, "erp-ready")

    def test_send_to_erp_succeeds_once_all_lines_matched(self):
        make_line_item(self.order, line_id="line-test-matched", status="matched")
        response = self.client.post(
            f"/api/orders/{self.order.id}/send-to-erp/", {}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "erp-ready")


def _fake_openai_response(payload: dict):
    class _Message:
        content = json.dumps(payload)

    class _Choice:
        message = _Message()

    class _Response:
        choices = [_Choice()]

    return _Response()


@override_settings(OPENAI_API_KEY="test-key")
class ExtractionModuleTests(TestCase):
    def test_empty_text_is_rejected_without_calling_openai(self):
        with self.assertRaises(ExtractionError):
            extract_order("   ")

    def test_too_long_text_is_rejected_without_calling_openai(self):
        with self.assertRaises(ExtractionError):
            extract_order("x" * 8001)

    def test_successful_extraction_returns_parsed_payload(self):
        payload = {
            "customer_name": "Test Customer GmbH",
            "customer_reference": None,
            "requested_delivery_date": None,
            "delivery_location": None,
            "currency": "EUR",
            "line_items": [
                {
                    "original_text": "50 M8 bolts",
                    "description": "M8 bolts",
                    "quantity": 50,
                    "unit": "pcs",
                    "customer_part_number": None,
                    "requested_sku": None,
                    "attributes": [],
                }
            ],
        }
        with patch("orders.extraction.OpenAI") as mock_openai_cls:
            mock_openai_cls.return_value.chat.completions.create.return_value = (
                _fake_openai_response(payload)
            )
            result = extract_order("send 50 M8 bolts")
        self.assertEqual(result["customer_name"], "Test Customer GmbH")
        self.assertEqual(len(result["line_items"]), 1)

    def test_no_line_items_raises_extraction_error(self):
        payload = {
            "customer_name": None,
            "customer_reference": None,
            "requested_delivery_date": None,
            "delivery_location": None,
            "currency": None,
            "line_items": [],
        }
        with patch("orders.extraction.OpenAI") as mock_openai_cls:
            mock_openai_cls.return_value.chat.completions.create.return_value = (
                _fake_openai_response(payload)
            )
            with self.assertRaises(ExtractionError):
                extract_order("this is not an order")

    def test_malformed_response_raises_extraction_error(self):
        class _BadResponse:
            choices = []

        with patch("orders.extraction.OpenAI") as mock_openai_cls:
            mock_openai_cls.return_value.chat.completions.create.return_value = _BadResponse()
            with self.assertRaises(ExtractionError):
                extract_order("send 50 M8 bolts")


@override_settings(OPENAI_API_KEY="test-key")
class ExtractOrderEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.catalog_item = make_catalog_item()

    def test_extract_endpoint_creates_order_with_routed_line_items(self):
        extracted_payload = {
            "customer_name": "Live Customer AG",
            "customer_reference": None,
            "requested_delivery_date": None,
            "delivery_location": None,
            "currency": "EUR",
            "line_items": [
                {"original_text": "line one", "description": "confident item"},
                {"original_text": "line two", "description": "ambiguous item"},
            ],
        }

        def fake_match_order_lines(line_items, catalog_items):
            results = []
            for line in line_items:
                if line["description"] == "confident item":
                    results.append([ScoredCandidate(catalog_item=self.catalog_item, score=95, proof_items=[])])
                else:
                    results.append([ScoredCandidate(catalog_item=self.catalog_item, score=40, proof_items=[])])
            return results

        with patch("orders.services.extract_order", return_value=extracted_payload), patch(
            "orders.services.match_order_lines", side_effect=fake_match_order_lines
        ):
            response = self.client.post(
                "/api/orders/extract/", {"pasted_text": "send some stuff"}, format="json"
            )

        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body["customer_name"], "Live Customer AG")
        self.assertFalse(body["is_simulated"])
        statuses = {line["original_text"]: line["status"] for line in body["line_items"]}
        self.assertEqual(statuses["line one"], "matched")
        self.assertEqual(statuses["line two"], "review-needed")
        self.assertFalse(body["erp_ready"])

    def test_extract_endpoint_returns_502_and_creates_nothing_on_failure(self):
        with patch(
            "orders.services.extract_order", side_effect=ExtractionError("boom")
        ):
            response = self.client.post(
                "/api/orders/extract/", {"pasted_text": "send some stuff"}, format="json"
            )

        self.assertEqual(response.status_code, 502)
        self.assertIn("boom", response.json()["detail"])
        self.assertEqual(OrderRecord.objects.count(), 0)

    def test_discontinued_part_substitution_always_forces_review(self):
        """A real gap found by testing: a line naming a discontinued part's
        old customer part number can still get matched to its active
        replacement (the semantic-match step reasons its way there from
        the description), confidently enough to clear the auto-approve
        threshold. That substitution must always route to human review,
        regardless of score, since it's a different SKU than what was
        literally asked for.
        """
        discontinued_item = make_catalog_item(item_id="cat-old-1", sku="OLD-SKU-001")
        discontinued_item.status = "discontinued"
        discontinued_item.customer_part_numbers = ["LEGACY-PART-9"]
        discontinued_item.replacement_sku = self.catalog_item.sku
        discontinued_item.save()

        extracted_payload = {
            "customer_name": "Live Customer AG",
            "customer_reference": None,
            "requested_delivery_date": None,
            "delivery_location": None,
            "currency": "EUR",
            "line_items": [
                {
                    "original_text": "the usual part, LEGACY-PART-9",
                    "description": "legacy part",
                    "customer_part_number": "LEGACY-PART-9",
                }
            ],
        }

        with patch("orders.services.extract_order", return_value=extracted_payload), patch(
            "orders.services.match_order_lines",
            return_value=[[ScoredCandidate(catalog_item=self.catalog_item, score=97, proof_items=[])]],
        ):
            response = self.client.post(
                "/api/orders/extract/", {"pasted_text": "send the usual part, LEGACY-PART-9"}, format="json"
            )

        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body["line_items"][0]["status"], "review-needed")
        self.assertFalse(body["erp_ready"])
        candidate = body["line_items"][0]["match_candidates"][0]
        self.assertTrue(
            any(item["kind"] == "availability" for item in candidate["proof_items"])
        )


class ResetDemoDataTests(TestCase):
    """Covers the two real gaps found by reading seed_sample_data.py before
    building the reset: get_or_create silently not resetting setup config,
    and decisions on sample orders' lines never being touched by re-seeding.
    """

    def setUp(self):
        self.client = APIClient()

    def test_reset_deletes_real_orders_restores_setup_and_clears_sample_decisions(self):
        real_order = make_order(order_id="ord-live-test", status="ready")
        real_order.is_simulated = False
        real_order.save()

        config = SetupConfiguration.objects.create(
            auto_approve_threshold=60, price_flag_threshold=30
        )

        sample_order = make_order(order_id="ord-sample-test", status="review-needed")
        sample_order.is_simulated = True
        sample_order.save()
        sample_line = make_line_item(sample_order, line_id="line-sample-test", status="matched")
        MatchDecision.objects.create(
            line_item=sample_line, decision="accepted", decided_at=timezone.now()
        )

        response = self.client.post("/api/orders/reset-demo/", {}, format="json")
        self.assertEqual(response.status_code, 204)

        self.assertFalse(OrderRecord.objects.filter(id="ord-live-test").exists())

        config.refresh_from_db()
        self.assertEqual(config.auto_approve_threshold, 85)
        self.assertEqual(config.price_flag_threshold, 15)

        self.assertEqual(
            MatchDecision.objects.filter(line_item_id="line-sample-test").count(), 0
        )

        # Re-seeding should have restored the real 4 sample orders too.
        self.assertTrue(OrderRecord.objects.filter(id="ord-vh-2026-0142").exists())
