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

        def fake_batch(indexed_lines, catalog_items):
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
