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
from .services import ensure_session_samples

# Fixed so tests can create fixtures and set the test client's demo-session
# cookie to the exact same value (see common.middleware.DemoSessionMiddleware),
# rather than racing a real client-assigned random one.
TEST_SESSION_ID = "test-session-fixed"


def make_order(order_id="ord-test-1", status="review-needed", demo_session_id=TEST_SESSION_ID):
    return OrderRecord.objects.create(
        id=order_id,
        demo_session_id=demo_session_id,
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
        self.client.credentials(HTTP_X_DEMO_SESSION_ID=TEST_SESSION_ID)
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
        self.client.credentials(HTTP_X_DEMO_SESSION_ID=TEST_SESSION_ID)
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
        self.client.credentials(HTTP_X_DEMO_SESSION_ID=TEST_SESSION_ID)
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
        self.client.credentials(HTTP_X_DEMO_SESSION_ID=TEST_SESSION_ID)
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
        self.client.credentials(HTTP_X_DEMO_SESSION_ID=TEST_SESSION_ID)
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

    def test_discontinued_substitution_with_no_stated_identifier_still_forces_review(self):
        """A second real gap found via a T122 eval run against the labeled
        sample dataset: a line can describe a discontinued part in free
        text alone, with no old part number or SKU stated at all. The
        semantic-match step reasons its way to the active replacement, and
        the original stated-identifier-only substitution guard never had
        anything to look up, so it never fired. Any LLM-matched candidate
        that lands on a known replacement SKU must force review too, not
        just ones the customer explicitly named.
        """
        discontinued_item = make_catalog_item(item_id="cat-old-2", sku="OLD-SKU-002")
        discontinued_item.status = "replacement-available"
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
                    "original_text": "the old-style bolt, no part number given",
                    "description": "old-style bolt",
                    "customer_part_number": None,
                    "requested_sku": None,
                }
            ],
        }

        with patch("orders.services.extract_order", return_value=extracted_payload), patch(
            "orders.services.match_order_lines",
            return_value=[
                [ScoredCandidate(catalog_item=self.catalog_item, score=90, proof_items=[], matched_via="llm")]
            ],
        ):
            response = self.client.post(
                "/api/orders/extract/", {"pasted_text": "send the old-style bolt"}, format="json"
            )

        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body["line_items"][0]["status"], "review-needed")

    def test_close_runner_up_forces_review_even_above_threshold(self):
        """A third real gap found the same way: the deterministic path
        already refuses to skip the LLM call when a candidate isn't ahead
        of its runner-up by CONFIDENT_MARGIN, but that margin was never
        re-checked at the final auto-approve decision for LLM-resolved
        lines. A single, high-scoring LLM candidate auto-approved even for
        a line built to be ambiguous, as long as nothing else was returned
        alongside it to compare against.
        """
        runner_up_item = make_catalog_item(item_id="cat-runner-up", sku="OM-TEST-002")

        extracted_payload = {
            "customer_name": "Live Customer AG",
            "customer_reference": None,
            "requested_delivery_date": None,
            "delivery_location": None,
            "currency": "EUR",
            "line_items": [
                {"original_text": "ambiguous item", "description": "ambiguous item"},
            ],
        }

        with patch("orders.services.extract_order", return_value=extracted_payload), patch(
            "orders.services.match_order_lines",
            return_value=[
                [
                    ScoredCandidate(catalog_item=self.catalog_item, score=90, proof_items=[], matched_via="llm"),
                    ScoredCandidate(catalog_item=runner_up_item, score=80, proof_items=[], matched_via="llm"),
                ]
            ],
        ):
            response = self.client.post(
                "/api/orders/extract/", {"pasted_text": "send the ambiguous item"}, format="json"
            )

        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body["line_items"][0]["status"], "review-needed")


class ResetDemoDataTests(TestCase):
    """Covers the two real gaps found by reading seed_sample_data.py before
    building the reset: get_or_create silently not resetting setup config,
    and decisions on sample orders' lines never being touched by re-seeding.
    Now session-scoped (see common.middleware.DemoSessionMiddleware and
    orders.services.reset_demo_data): reset only ever touches the calling
    session's own isolated copy of the data, never anyone else's.
    """

    def setUp(self):
        self.client = APIClient()
        self.client.credentials(HTTP_X_DEMO_SESSION_ID=TEST_SESSION_ID)
        # A global template sample order (demo_session_id=""), the same
        # shape seed_sample_data produces, for ensure_session_samples to
        # clone from.
        self.template = make_order(
            order_id="ord-vh-2026-0142", demo_session_id="", status="review-needed"
        )
        make_line_item(self.template, line_id="vh-10", status="review-needed")

    def test_reset_deletes_real_orders_restores_setup_and_clears_sample_decisions(self):
        real_order = make_order(order_id="ord-live-test", status="ready")
        real_order.is_simulated = False
        real_order.save()

        config = SetupConfiguration.objects.create(
            demo_session_id=TEST_SESSION_ID,
            auto_approve_threshold=60,
            price_flag_threshold=30,
        )

        ensure_session_samples(TEST_SESSION_ID)
        session_sample = OrderRecord.objects.get(
            demo_session_id=TEST_SESSION_ID, is_simulated=True
        )
        session_line = session_sample.line_items.get()
        MatchDecision.objects.create(
            line_item=session_line, decision="accepted", decided_at=timezone.now()
        )

        response = self.client.post("/api/orders/reset-demo/", {}, format="json")
        self.assertEqual(response.status_code, 204)

        self.assertFalse(OrderRecord.objects.filter(id="ord-live-test").exists())

        config.refresh_from_db()
        self.assertEqual(config.auto_approve_threshold, 85)
        self.assertEqual(config.price_flag_threshold, 15)

        # The old decision on the sample-order copy's line is gone (the
        # re-cloned copy happens to reuse the same deterministic id as the
        # one it replaced, so checking the id alone wouldn't prove anything).
        self.assertEqual(MatchDecision.objects.filter(line_item_id=session_line.id).count(), 0)

        # Replaced by a fresh clone of the same template, undecided again.
        fresh_sample = OrderRecord.objects.get(
            demo_session_id=TEST_SESSION_ID, is_simulated=True
        )
        self.assertEqual(fresh_sample.line_items.get().status, "review-needed")

        # The global template itself is untouched by a per-session reset.
        self.assertTrue(OrderRecord.objects.filter(id=self.template.id).exists())

    def test_reset_does_not_touch_another_sessions_data(self):
        other_order = make_order(order_id="ord-other-session", demo_session_id="other-session")
        self.client.post("/api/orders/reset-demo/", {}, format="json")
        self.assertTrue(OrderRecord.objects.filter(id=other_order.id).exists())


class DemoSessionIsolationTests(TestCase):
    """Regression coverage for the actual point of demo-session scoping
    (common.middleware.DemoSessionMiddleware): two different visitors,
    identified only by their cookie, must never see each other's orders
    or setup thresholds. Verified by real HTTP requests through the
    actual endpoints, not by inspecting querysets directly.
    """

    def test_two_sessions_get_isolated_order_lists(self):
        client_a = APIClient()
        client_a.credentials(HTTP_X_DEMO_SESSION_ID="session-a")
        client_b = APIClient()
        client_b.credentials(HTTP_X_DEMO_SESSION_ID="session-b")

        make_order(order_id="ord-a", demo_session_id="session-a")
        make_order(order_id="ord-b", demo_session_id="session-b")

        ids_a = {order["id"] for order in client_a.get("/api/orders/").json()}
        ids_b = {order["id"] for order in client_b.get("/api/orders/").json()}

        self.assertIn("ord-a", ids_a)
        self.assertNotIn("ord-b", ids_a)
        self.assertIn("ord-b", ids_b)
        self.assertNotIn("ord-a", ids_b)

    def test_a_new_visitor_with_no_session_header_gets_assigned_their_own_session(self):
        response = APIClient().get("/api/orders/")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response["X-Demo-Session-Id"])

    def test_setup_configuration_is_isolated_per_session(self):
        client_a = APIClient()
        client_a.credentials(HTTP_X_DEMO_SESSION_ID="session-config-a")
        client_b = APIClient()
        client_b.credentials(HTTP_X_DEMO_SESSION_ID="session-config-b")

        config_id_a = client_a.get("/api/setup-configuration/").json()[0]["id"]
        client_a.patch(
            f"/api/setup-configuration/{config_id_a}/",
            {"auto_approve_threshold": 42},
            format="json",
        )

        config_b = client_b.get("/api/setup-configuration/").json()[0]
        self.assertEqual(config_b["auto_approve_threshold"], 85)
