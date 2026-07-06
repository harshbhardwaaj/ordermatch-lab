from unittest.mock import patch

from django.test import TestCase

from catalogs.models import CatalogItem

from .pipeline import MatchingError, match_line_item


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

        with patch("matching.pipeline._semantic_match") as mock_semantic:
            candidates = match_line_item(extracted, [catalog_item])

        mock_semantic.assert_not_called()
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

        with patch("matching.pipeline._semantic_match") as mock_semantic:
            mock_semantic.return_value = [
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
            candidates = match_line_item(extracted, [catalog_item])

        mock_semantic.assert_called_once()
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

        with patch("matching.pipeline._semantic_match", side_effect=MatchingError("boom")):
            candidates = match_line_item(extracted, [catalog_item])

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

        with patch("matching.pipeline._semantic_match", return_value=[]):
            candidates = match_line_item(extracted, [catalog_item])

        self.assertEqual(candidates, [])
