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

        def fake_batch(indexed_lines, catalog_items, memory_examples=None, shortlists=None, customer_context=""):
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

    def test_a_reorder_of_a_different_quantity_is_the_same_request(self):
        """The bug this exists to stop coming back.

        Nobody reorders the same count. A buyer who took 200 bolts in July and
        150 in August asked the same question twice — which grade did you mean —
        and the answer they gave in July has to still count in August. Keyed with
        the quantity in it, those were two different keys, so the pin never fired
        on any real reorder and the reviewer was asked a question they had
        already answered.
        """
        from matching.memory import normalize_request_text

        self.assertEqual(
            normalize_request_text("200x Sechskantschraube M8x40 inox"),
            normalize_request_text("150x Sechskantschraube M8x40 inox"),
        )
        self.assertEqual(
            normalize_request_text("24 pcs ball bearing 6204"),
            normalize_request_text("6 Stk ball bearing 6204"),
        )
        # The count is not always in front of the part.
        self.assertEqual(
            normalize_request_text("hex bolt m8x40 inox qty 500"),
            normalize_request_text("hex bolt m8x40 inox qty 300"),
        )
        self.assertEqual(
            normalize_request_text("kugellager 6205 2rs c3 40 stk"),
            normalize_request_text("kugellager 6205 2rs c3 12 stk"),
        )

    def test_stripping_the_quantity_never_eats_the_spec(self):
        """The sizes are the whole ballgame. An early cut of the trailing-quantity
        pattern matched the "x40" inside "hex bolt m8x40" and keyed it as
        "hex bolt m8", quietly merging M8x40 and M8x50 into one memory — teaching
        the reviewer's answer for one part to a different part. That is a worse
        bug than the one being fixed, so it gets its own test.
        """
        from matching.memory import normalize_request_text

        self.assertEqual(
            normalize_request_text("200x hex bolt m8x40"), "hex bolt m8x40"
        )
        self.assertNotEqual(
            normalize_request_text("200x hex bolt m8x40"),
            normalize_request_text("200x hex bolt m8x50"),
        )
        self.assertEqual(
            normalize_request_text("50x ball bearing 6204 2rs"), "ball bearing 6204 2rs"
        )
        # Trailing numbers that are specs, not counts, and must survive: the 70
        # is a shore hardness, the 100 is a length.
        self.assertNotEqual(
            normalize_request_text("o-ring 20x3 nbr 70"),
            normalize_request_text("o-ring 20x3 nbr 90"),
        )
        self.assertNotEqual(
            normalize_request_text("control cable 4g0.75 100"),
            normalize_request_text("control cable 4g0.75 50"),
        )

    def test_a_pinned_correction_survives_a_reorder_of_a_different_quantity(self):
        """End to end, and the case that was broken in production: teach it at
        one quantity, reorder at another, and the taught SKU must come back
        pinned and confidently ahead — not asked about again.
        """
        from matching.memory import apply_memory, load_customer_memory, record_correction
        from matching.pipeline import CONFIDENT_MARGIN, ScoredCandidate

        line = self._order_with_candidates(
            "Vogt Hydraulik GmbH", text="200x Sechskantschraube M8x40 inox"
        )
        record_correction(
            session_id=self.session,
            line_item=line,
            chosen_candidate=line.match_candidates.get(rank=2),  # the A4 bolt
        )

        memory = load_customer_memory(self.session, "Vogt Hydraulik GmbH")
        fresh = [
            ScoredCandidate(catalog_item=self.cheap, score=79.0),
            ScoredCandidate(catalog_item=self.premium, score=78.0),
        ]

        # The reorder: same part, same wording, different count.
        reranked = apply_memory(memory, "150x Sechskantschraube M8x40 inox", fresh)

        self.assertEqual(reranked[0].catalog_item.sku, self.premium.sku)
        self.assertTrue(
            reranked[0].learned_signal["pinned"],
            "a reorder of the same part must hit the pin, not just the soft boost",
        )
        self.assertGreaterEqual(
            reranked[0].score - reranked[1].score,
            CONFIDENT_MARGIN,
            "a pinned reorder has to clear the confidence margin, or the reviewer "
            "is asked a question they already answered",
        )


class BlockingTests(TestCase):
    """Blocking is what makes a 10k catalog possible at all: it has to get the
    right SKU into a ~40-row shortlist without an LLM, and it must never let
    the full catalog reach the prompt.
    """

    def setUp(self):
        from matching.blocking import build_index

        # The case's own example: one request, many legitimate answers.
        self.grades = ["ZN", "88", "A2", "A4"]
        for grade in self.grades:
            make_catalog_item(
                f"cat-{grade}",
                f"OM-FAS-HB-M8X40-{grade}",
                f"Hex bolt M8x40 {grade} DIN 933",
                attributes=[{"name": "thread", "value": "M8"}, {"name": "material", "value": grade}],
            )
        # Plenty of noise the blocker has to reject.
        for i in range(200):
            make_catalog_item(f"noise-{i}", f"OM-BRG-{6000 + i}-2RS", f"Deep groove ball bearing {6000 + i}-2RS")

        self.catalog = list(CatalogItem.objects.all())
        self.index = build_index(self.catalog)

    def test_shortlist_retrieves_the_whole_grade_ladder(self):
        """Every grade of the requested bolt must survive blocking. If one is
        missing the reviewer cannot pick it, and the correction they wanted to
        make is impossible.
        """
        shortlist = self.index.shortlist({"original_text": "500x hex bolt M8x40, standard"})

        skus = {item.sku for item in shortlist}
        for grade in self.grades:
            self.assertIn(f"OM-FAS-HB-M8X40-{grade}", skus)

    def test_shortlist_is_capped_far_below_the_catalog(self):
        shortlist = self.index.shortlist({"original_text": "hex bolt M8x40"})

        self.assertGreater(len(self.catalog), 200)
        self.assertLessEqual(len(shortlist), 40)

    def test_a_stated_sku_is_always_shortlisted(self):
        """A named identifier is an answer, not a hint. It must survive blocking
        even when the free text around it scores badly.
        """
        shortlist = self.index.shortlist(
            {"original_text": "the usual thing", "requested_sku": "OM-FAS-HB-M8X40-A4"}
        )

        self.assertIn("OM-FAS-HB-M8X40-A4", {item.sku for item in shortlist})

    def test_synonyms_with_no_shared_token_still_retrieve_something(self):
        """The known hole in lexical blocking: "Kugellager" shares no token with
        "ball bearing". It must degrade to a fuzzy sweep rather than hand the
        reviewer an empty picker.
        """
        shortlist = self.index.shortlist({"original_text": "Kugellager"})

        self.assertGreater(len(shortlist), 0)

    def test_the_llm_never_sees_the_whole_catalog(self):
        """The invariant the whole design rests on. If this breaks, a 10k
        catalog is ~900k tokens per call and the app simply stops working.
        """
        captured = {}

        def fake_batch(indexed_lines, catalog_items, memory_examples=None, shortlists=None, customer_context=""):
            union = {item.sku for index, _ in indexed_lines for item in shortlists[index]}
            captured["prompt_rows"] = len(union)
            return {}

        line = {"description": "hex bolt M8x40", "original_text": "hex bolt M8x40", "attributes": []}
        with patch("matching.pipeline._semantic_match_batch", side_effect=fake_batch):
            match_order_lines([line], self.catalog)

        self.assertLessEqual(captured["prompt_rows"], 40)
        self.assertLess(captured["prompt_rows"], len(self.catalog))


class HybridBlockingTests(TestCase):
    """The two retrievers, and the fusion between them.

    The measured story lives in `python manage.py eval_blocking` (22 cases,
    hybrid gets 100% recall@40 against lexical's 95%). These tests guard the
    behaviours that eval depends on, so a regression fails the build rather than
    quietly costing recall.
    """

    def setUp(self):
        make_catalog_item("cat-brg", "OM-BRG-6205-2RS-C3", "Deep groove ball bearing 6205-2RS C3")
        make_catalog_item("cat-or", "OM-SEA-OR-10X2-FKM", "O-ring 10x2 FKM 75")
        for i in range(60):
            make_catalog_item(f"noise-{i}", f"OM-FAS-HB-M{i}X40-ZN", f"Hex bolt M{i}x40 zinc")
        self.catalog = list(CatalogItem.objects.all())

    def test_a_bare_series_number_finds_a_compound_identifier(self):
        """The catalog writes "6205-2RS" as one token, so a customer asking for
        plain "6205" used to match nothing at all — which is the single most
        common way anyone names a bearing. Caught by the eval, not by review.
        """
        from matching.blocking import build_index

        shortlist = build_index(self.catalog).shortlist({"original_text": "sealed bearing 6205"})

        self.assertIn("OM-BRG-6205-2RS-C3", {item.sku for item in shortlist})

    def test_a_number_wearing_a_unit_finds_the_bare_dimension(self):
        """The catalog spells it "10x2"; the customer writes "10mm bore, 2mm
        section". Without unit stripping they share no size token whatsoever.
        """
        from matching.blocking import build_index

        shortlist = build_index(self.catalog).shortlist(
            {"original_text": "viton o-ring, 10mm bore, 2mm section"}
        )

        self.assertIn("OM-SEA-OR-10X2-FKM", {item.sku for item in shortlist})

    def test_only_identifier_shaped_tokens_are_split(self):
        """Splitting a compound token is what lets a bare "6205" find
        "6205-2RS". It has to be limited to tokens carrying a digit.

        Splitting alphabetic compounds too was tried and measurably hurt recall,
        because it shreds prose into fragments that match everything. A SKU still
        yields its own prefix fragments ("om", "sea"), and that is harmless for a
        reason worth stating: those appear in every row, so their IDF is zero and
        they contribute no score at all. It is the parts that discriminate —
        "10x2", "fkm" — that carry the weight.
        """
        from matching.blocking import build_index, tokenize

        tokens = tokenize("OM-SEA-OR-10X2-FKM")
        self.assertIn("10x2", tokens)
        self.assertIn("fkm", tokens)

        # A purely alphabetic compound keeps its shape rather than being shredded.
        self.assertNotIn("sealed", tokenize("rubber-sealed"))

        # And the fragments a SKU does emit are worthless by construction: every
        # generated SKU starts "om-", so it discriminates nothing.
        index = build_index(self.catalog)
        self.assertAlmostEqual(index.idf.get("om", 0.0), 0.0, places=6)

    def test_no_vectors_means_lexical_only_rather_than_no_results(self):
        """A catalog that was never embedded (no API key, embed_catalog never
        run) must degrade, not break. This is the whole reason the two
        retrievers are independent.
        """
        from matching.blocking import build_index

        for item in self.catalog:
            item.embedding = None

        index = build_index(self.catalog, [{"original_text": "bearing 6205"}])

        self.assertIsNone(index.semantic)
        self.assertGreater(len(index.shortlist({"original_text": "bearing 6205"})), 0)

    def test_fusion_rewards_agreement_between_the_retrievers(self):
        """Reciprocal Rank Fusion, not concatenation. An item both retrievers
        rank highly must beat one that only appears near the top of a single
        list, or the semantic half would be unable to correct a confidently
        wrong lexical ranking.
        """
        from matching.blocking import _merge

        agreed = self.catalog[0]
        lexical_only = self.catalog[1]
        semantic_only = self.catalog[2]

        merged = _merge([lexical_only, agreed], [semantic_only, agreed], limit=3)

        self.assertEqual(merged[0].sku, agreed.sku)


class PinnedLineAutoMatchTests(TestCase):
    """A pin has to survive the confidence gate, or the loop leans without ever
    learning.

    The gate exists for a good reason: an LLM-resolved line can come back with
    several closely-ranked candidates and no margin between them, and
    auto-approving one of those is how a wrong SKU reaches the ERP. But a pinned
    candidate is not a close call the model is unsure about. It is the answer a
    reviewer already gave to this exact request, and the ambiguity that made the
    line hard the first time (four grades of the same bolt) is exactly why the
    runner-up still scores close on the reorder. Applying the margin to a pin
    means the reviewer is asked, forever, a question they answered in July.
    """

    def test_a_pinned_top_candidate_clears_the_gate_despite_a_close_runner_up(self):
        from orders.services import _is_confidently_ahead

        class FakeCandidate:
            def __init__(self, score, pinned=False):
                self.score = score
                self.learned_signal = {"pinned": True} if pinned else {}

        # The realistic shape: four near-identical grades, so the runner-up is
        # always within the margin. Without the pin this is a review.
        close_call = [FakeCandidate(99.0), FakeCandidate(92.0)]
        self.assertFalse(_is_confidently_ahead(close_call))

        pinned = [FakeCandidate(99.0, pinned=True), FakeCandidate(92.0)]
        self.assertTrue(
            _is_confidently_ahead(pinned),
            "the reviewer already answered this exact request; do not ask again",
        )

    def test_an_unpinned_close_call_still_goes_to_review(self):
        """The gate must still do its job for everything that is not a pin."""
        from orders.services import _is_confidently_ahead

        class FakeCandidate:
            def __init__(self, score, pinned=False):
                self.score = score
                self.learned_signal = {"pinned": True} if pinned else {}

        self.assertFalse(_is_confidently_ahead([FakeCandidate(88.0), FakeCandidate(87.0)]))
        self.assertTrue(_is_confidently_ahead([FakeCandidate(95.0), FakeCandidate(60.0)]))


class ExactSkuAndAttributeMatchTests(TestCase):
    """Two bugs found by running the same order many times and watching the
    routing flip. Both made an exactly-stated SKU — the strongest signal a
    customer can give — resolve non-deterministically.
    """

    def setUp(self):
        self.item = make_catalog_item(
            "cat-sku",
            "OM-FAS-HB-M8X40-A2-ISO4017",
            "Hex bolt M8x40 A2 ISO 4017",
            attributes=[
                {"name": "length", "value": "40 mm"},
                {"name": "material", "value": "A2 stainless steel"},
                {"name": "standard", "value": "ISO 4017"},
            ],
        )

    def test_values_agree_treats_shorthand_as_agreement_not_conflict(self):
        from matching.pipeline import _values_agree

        # These are agreement, and exact equality wrongly called them conflicts.
        self.assertTrue(_values_agree("40", "40 mm"))
        self.assertTrue(_values_agree("a2", "a2 stainless steel"))
        self.assertTrue(_values_agree("iso4017", "iso 4017"))
        # These are genuine conflicts and must stay conflicts.
        self.assertFalse(_values_agree("a4", "a2 stainless steel"))
        self.assertFalse(_values_agree("40", "400 mm"))
        self.assertFalse(_values_agree("m8", "m80"))

    def test_an_exact_sku_auto_matches_regardless_of_attribute_phrasing(self):
        from matching.pipeline import _deterministic_candidates, _is_confident

        # The customer named the SKU and described it in their own shorthand.
        extracted = {
            "requested_sku": "OM-FAS-HB-M8X40-A2-ISO4017",
            "original_text": "100x OM-FAS-HB-M8X40-A2-ISO4017",
            "customer_part_number": None,
            "description": "",
            "attributes": [
                {"name": "length", "value": "40"},
                {"name": "material", "value": "A2"},
                {"name": "standard", "value": "ISO4017"},
            ],
        }
        candidates = _deterministic_candidates(extracted, [self.item])
        self.assertEqual(candidates[0].catalog_item.sku, "OM-FAS-HB-M8X40-A2-ISO4017")
        self.assertGreaterEqual(candidates[0].score, 92)
        self.assertTrue(_is_confident(candidates))
        self.assertEqual(candidates[0].missing_evidence, [])

    def test_an_exact_sku_dropped_by_the_extractor_is_recovered_from_raw_text(self):
        """The extractor occasionally fails to route the SKU into requested_sku.
        A SKU is a distinctive whole token, so it is recovered from the raw line
        rather than left to the extractor's variance."""
        from matching.pipeline import _deterministic_candidates, _is_confident

        extracted = {
            "requested_sku": None,  # the extractor dropped it
            "original_text": "100x OM-FAS-HB-M8X40-A2-ISO4017",
            "customer_part_number": None,
            "description": "",
            "attributes": [],
        }
        candidates = _deterministic_candidates(extracted, [self.item])
        self.assertEqual(candidates[0].catalog_item.sku, "OM-FAS-HB-M8X40-A2-ISO4017")
        self.assertTrue(_is_confident(candidates))

    def test_a_stated_sku_with_a_conflicting_attribute_still_asks(self):
        """The safety valve: 'SKU X but in A4' when X is the A2 row is a real
        contradiction and must reach a human, not auto-approve on the SKU."""
        from matching.pipeline import _deterministic_candidates, _is_confident

        extracted = {
            "requested_sku": "OM-FAS-HB-M8X40-A2-ISO4017",
            "original_text": "100x OM-FAS-HB-M8X40-A2-ISO4017 but A4",
            "customer_part_number": None,
            "description": "",
            "attributes": [{"name": "material", "value": "A4"}],
        }
        candidates = _deterministic_candidates(extracted, [self.item])
        self.assertFalse(_is_confident(candidates))
        self.assertTrue(candidates[0].missing_evidence)

    def test_a_sku_is_recovered_only_as_a_whole_token_never_a_substring(self):
        """Recovery must not fire on a SKU that is merely a substring of some
        other text, or a longer code containing this SKU would false-match."""
        from matching.pipeline import _deterministic_candidates

        extracted = {
            "requested_sku": None,
            "original_text": "100x OM-FAS-HB-M8X40-A2-ISO4017-EXTENDED-VARIANT",
            "customer_part_number": None,
            "description": "",
            "attributes": [],
        }
        candidates = _deterministic_candidates(extracted, [self.item])
        top = candidates[0] if candidates else None
        # The exact SKU is not a standalone token here, so no exact-match proof.
        if top:
            self.assertFalse(
                any(p.get("label") == "Requested SKU matches catalog SKU" for p in top.proof_items)
            )
