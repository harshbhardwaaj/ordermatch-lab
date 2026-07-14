from unittest.mock import patch

from django.test import TestCase

from catalogs.models import CatalogItem

from .pipeline import MatchingError, match_order_lines


def make_catalog_item(item_id, sku, name, attributes=None, customer_part_numbers=None):
    return CatalogItem.objects.create(
        id=item_id,
        sku=sku,
        name=name,
        category="fasteners",
        description=name,
        attributes=attributes or [],
        customer_part_numbers=customer_part_numbers or [],
        default_unit="pcs",
    )


class DeterministicMatchTests(TestCase):
    def test_strong_unique_match_skips_the_llm_call(self):
        catalog_item = make_catalog_item(
            "cat-1",
            "OM-FAS-HB-M8X40-A2-D933",
            "Hex bolt M8x40 A2 DIN 933",
            attributes=[
                {"name": "thread", "value": "M8"},
                {"name": "length", "value": "40"},
                {"name": "material", "value": "A2 stainless steel"},
                {"name": "standard", "value": "DIN 933"},
            ],
            customer_part_numbers=["CUST-4481"],
        )
        extracted = {
            "description": "Hex bolt M8x40 A2 DIN 933",
            "customer_part_number": "CUST-4481",
            "requested_sku": None,
            "attributes": [
                {"name": "thread", "value": "M8"},
                {"name": "length", "value": "40"},
                {"name": "material", "value": "A2 stainless steel"},
                {"name": "standard", "value": "DIN 933"},
            ],
        }

        with patch("matching.pipeline._semantic_match_batch") as mock_semantic:
            results = match_order_lines([extracted], [catalog_item])

        mock_semantic.assert_not_called()
        candidates = results[0]
        self.assertEqual(len(candidates), 1)
        self.assertEqual(candidates[0].catalog_item.id, "cat-1")
        self.assertGreaterEqual(candidates[0].score, 92)
        self.assertTrue(
            any(item["kind"] == "customer-part-number" for item in candidates[0].proof_items)
        )

    def test_no_deterministic_signal_falls_back_to_semantic_match(self):
        catalog_item = make_catalog_item("cat-1", "OM-MISC-001", "Generic component")
        extracted = {
            "description": "some unlabeled part",
            "customer_part_number": None,
            "requested_sku": None,
            "attributes": [],
        }

        with patch("matching.pipeline._semantic_match_batch") as mock_semantic:
            mock_semantic.return_value = {
                0: [
                    {
                        "sku": "OM-MISC-001",
                        "confidence": 55,
                        "supports_match": True,
                        "reasons": [
                            {
                                "kind": "synonym",
                                "label": "Similar description",
                                "source_value": "some unlabeled part",
                                "catalog_value": "Generic component",
                            }
                        ],
                    }
                ]
            }
            results = match_order_lines([extracted], [catalog_item])

        mock_semantic.assert_called_once()
        candidates = results[0]
        self.assertEqual(len(candidates), 1)
        self.assertEqual(candidates[0].matched_via, "llm")
        self.assertEqual(candidates[0].score, 55)
        self.assertEqual(candidates[0].proof_items[0]["kind"], "synonym")

    def test_semantic_match_failure_falls_back_to_weak_deterministic_result(self):
        catalog_item = make_catalog_item(
            "cat-1",
            "OM-FAS-002",
            "Hex bolt M8x40 zinc DIN 933",
            attributes=[{"name": "thread", "value": "M8"}],
        )
        extracted = {
            "description": "some bolt",
            "customer_part_number": None,
            "requested_sku": None,
            "attributes": [{"name": "thread", "value": "M8"}],
        }

        with patch("matching.pipeline._semantic_match_batch", side_effect=MatchingError("boom")):
            results = match_order_lines([extracted], [catalog_item])

        candidates = results[0]
        self.assertEqual(len(candidates), 1)
        self.assertEqual(candidates[0].matched_via, "deterministic")

    def test_no_candidates_at_all_returns_empty_list(self):
        catalog_item = make_catalog_item("cat-1", "OM-MISC-002", "Unrelated item")
        extracted = {
            "description": "",
            "customer_part_number": None,
            "requested_sku": None,
            "attributes": [],
        }

        with patch("matching.pipeline._semantic_match_batch", return_value={}):
            results = match_order_lines([extracted], [catalog_item])

        self.assertEqual(results[0], [])


class BatchedMatchingTests(TestCase):
    def test_multiple_ambiguous_lines_use_exactly_one_combined_call(self):
        """The whole point of batching: an order with several ambiguous
        lines must make one semantic-match call covering all of them, not
        one call per line. A large order with many ambiguous lines used to
        mean that many sequential round trips, which scales badly.
        """
        catalog_item_a = make_catalog_item("cat-1", "OM-MISC-001", "Widget A")
        catalog_item_b = make_catalog_item("cat-2", "OM-MISC-002", "Widget B")
        line_a = {
            "description": "some widget",
            "customer_part_number": None,
            "requested_sku": None,
            "attributes": [],
        }
        line_b = {
            "description": "another widget",
            "customer_part_number": None,
            "requested_sku": None,
            "attributes": [],
        }

        def fake_batch(indexed_lines, catalog_items, memory_examples=None):
            return {
                index: [
                    {
                        "sku": "OM-MISC-001" if index == 0 else "OM-MISC-002",
                        "confidence": 60,
                        "supports_match": True,
                        "reasons": [],
                    }
                ]
                for index, _ in indexed_lines
            }

        with patch("matching.pipeline._semantic_match_batch", side_effect=fake_batch) as mock_batch:
            results = match_order_lines([line_a, line_b], [catalog_item_a, catalog_item_b])

        mock_batch.assert_called_once()
        called_indexed_lines = mock_batch.call_args[0][0]
        self.assertEqual([index for index, _ in called_indexed_lines], [0, 1])
        self.assertEqual(results[0][0].catalog_item.id, "cat-1")
        self.assertEqual(results[1][0].catalog_item.id, "cat-2")

    def test_confident_lines_are_excluded_from_the_batch(self):
        """A line resolved deterministically must never be sent to the
        semantic-match call at all, even when other lines in the same
        order do need it.
        """
        confident_item = make_catalog_item(
            "cat-1",
            "OM-FAS-001",
            "Hex bolt",
            customer_part_numbers=["CUST-1"],
        )
        ambiguous_item = make_catalog_item("cat-2", "OM-MISC-001", "Generic component")
        confident_line = {
            "description": "Hex bolt",
            "customer_part_number": "CUST-1",
            "requested_sku": "OM-FAS-001",
            "attributes": [],
        }
        ambiguous_line = {
            "description": "some unlabeled part",
            "customer_part_number": None,
            "requested_sku": None,
            "attributes": [],
        }

        with patch("matching.pipeline._semantic_match_batch", return_value={}) as mock_batch:
            match_order_lines([confident_line, ambiguous_line], [confident_item, ambiguous_item])

        mock_batch.assert_called_once()
        called_indexed_lines = mock_batch.call_args[0][0]
        self.assertEqual([index for index, _ in called_indexed_lines], [1])


class CustomerMemoryTests(TestCase):
    """The learning loop: a correction on one order must change the ranking
    on the next one, for that customer and not for anyone else.
    """

    def setUp(self):
        self.cheap = make_catalog_item(
            "cat-a", "OM-FAS-HB-M8X40-ZN-D933", "Hex bolt M8x40 zinc DIN 933"
        )
        self.premium = make_catalog_item(
            "cat-b", "OM-FAS-HB-M8X40-A4-D933", "Hex bolt M8x40 A4 DIN 933"
        )
        self.session = "sess-1"

    def _order_with_candidates(self, customer_name, text="hex bolt m8x40 500x"):
        """One order, one line, two candidates: the AI puts the zinc bolt on
        top, the A4 second. The realistic shape of the case brief's example.
        """
        from django.utils import timezone

        from matching.models import MatchCandidate
        from orders.models import OrderLineItem, OrderRecord

        order = OrderRecord.objects.create(
            id=f"ord-{customer_name}-{timezone.now().timestamp()}",
            demo_session_id=self.session,
            customer_name=customer_name,
            source="pasted-text",
            received_at=timezone.now(),
            currency="EUR",
            status="review-needed",
        )
        line = OrderLineItem.objects.create(
            id=f"{order.id}-line-1",
            order=order,
            line_number=1,
            original_text=text,
            status="review-needed",
        )
        for rank, item in enumerate([self.cheap, self.premium], start=1):
            MatchCandidate.objects.create(
                id=f"{line.id}-cand-{rank}",
                line_item=line,
                catalog_item=item,
                sku=item.sku,
                confidence_band="review-needed",
                score=80 - rank,
                rank=rank,
            )
        return line

    def test_correction_reranks_the_same_request_next_time(self):
        from matching.memory import apply_memory, load_customer_memory, record_correction
        from matching.pipeline import ScoredCandidate

        line = self._order_with_candidates("Vogt Hydraulik GmbH")
        chosen = line.match_candidates.get(rank=2)  # human picks the A4 bolt

        record_correction(session_id=self.session, line_item=line, chosen_candidate=chosen)

        memory = load_customer_memory(self.session, "Vogt Hydraulik GmbH")
        fresh = [
            ScoredCandidate(catalog_item=self.cheap, score=79.0),
            ScoredCandidate(catalog_item=self.premium, score=78.0),
        ]
        reranked = apply_memory(memory, "hex bolt m8x40 500x", fresh)

        self.assertEqual(reranked[0].catalog_item.sku, self.premium.sku)
        self.assertTrue(reranked[0].learned_signal["pinned"])
        self.assertEqual(reranked[0].learned_signal["timesChosen"], 1)
        # and the SKU the reviewer overruled is recorded as rejected
        self.assertEqual(reranked[1].learned_signal["timesRejected"], 1)

    def test_memory_does_not_leak_between_customers(self):
        """The whole reason this is scoped per customer: the same words mean
        a different grade to a different buyer.
        """
        from matching.memory import apply_memory, load_customer_memory, record_correction
        from matching.pipeline import ScoredCandidate

        line = self._order_with_candidates("Vogt Hydraulik GmbH")
        record_correction(
            session_id=self.session,
            line_item=line,
            chosen_candidate=line.match_candidates.get(rank=2),
        )

        other = load_customer_memory(self.session, "LakePort Maintenance Supply LLC")
        self.assertTrue(other.is_empty())

        fresh = [
            ScoredCandidate(catalog_item=self.cheap, score=79.0),
            ScoredCandidate(catalog_item=self.premium, score=78.0),
        ]
        unchanged = apply_memory(other, "hex bolt m8x40 500x", fresh)
        self.assertEqual(unchanged[0].catalog_item.sku, self.cheap.sku)

    def test_confirming_the_top_pick_is_logged_but_teaches_no_rejection(self):
        from matching.memory import load_customer_memory, record_correction

        line = self._order_with_candidates("Vogt Hydraulik GmbH")
        correction = record_correction(
            session_id=self.session,
            line_item=line,
            chosen_candidate=line.match_candidates.get(rank=1),
        )

        self.assertFalse(correction.was_correction)
        memory = load_customer_memory(self.session, "Vogt Hydraulik GmbH")
        self.assertEqual(memory.by_sku[self.cheap.sku]["chosen"], 1)
        self.assertNotIn(self.premium.sku, memory.by_sku)
        # a confirmation is not a correction, so it is not fed to the LLM
        self.assertEqual(memory.examples, [])

    def test_corrections_are_fed_to_the_llm_as_examples(self):
        from matching.memory import load_customer_memory, record_correction

        line = self._order_with_candidates("Vogt Hydraulik GmbH")
        record_correction(
            session_id=self.session,
            line_item=line,
            chosen_candidate=line.match_candidates.get(rank=2),
        )

        memory = load_customer_memory(self.session, "Vogt Hydraulik GmbH")
        self.assertEqual(len(memory.examples), 1)
        self.assertEqual(memory.examples[0]["ai_suggested_sku"], self.cheap.sku)
        self.assertEqual(memory.examples[0]["human_corrected_to_sku"], self.premium.sku)

    def test_normalization_recognizes_the_same_request_retyped(self):
        from matching.memory import normalize_request_text

        self.assertEqual(
            normalize_request_text("500x Hex Bolt, M8x40!"),
            normalize_request_text("  500x   hex bolt m8x40 "),
        )
