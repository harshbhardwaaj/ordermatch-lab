from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from catalogs.models import CatalogItem
from matching.models import MatchCandidate

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
