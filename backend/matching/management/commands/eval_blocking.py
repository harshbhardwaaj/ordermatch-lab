"""Measures whether blocking actually retrieves the right SKU, instead of me
squinting at a shortlist and deciding it looks about right.

Blocking has exactly one job: get the correct catalog item *into* the shortlist
the matcher sees. If it fails, no amount of cleverness downstream can recover —
the LLM is never shown the right answer, and the reviewer cannot pick it. So the
number that matters is recall: how often is the right SKU in the 40?

The cases are deliberately split into three kinds, because they stress different
retrievers and averaging them together would hide exactly what you need to know:

- identifier: "hex bolt M8x40 A2 DIN 933". Lexical should win, and a vector
  should not be allowed to blur M8x40 into M8x50.
- german: "Sechskantschraube M8x40 Edelstahl". No shared word with the catalog
  except the size. This is what embeddings are for.
- vague: "the usual bearing, sealed". What a real inbox looks like.

Run:  python manage.py eval_blocking
"""

from __future__ import annotations

from django.core.management.base import BaseCommand

from catalogs.models import CatalogItem
from matching.blocking import SHORTLIST_SIZE, build_index

# (query, the SKU that is actually correct, kind)
CASES = [
    # --- identifiers present: lexical territory ---
    ("hex bolt M8x40 A2 DIN 933, 500 pcs", "OM-FAS-HB-M8X40-A2-DIN933", "identifier"),
    ("socket cap screw M6x20 12.9 DIN 912", "OM-FAS-SC-M6X20-129-DIN912", "identifier"),
    ("deep groove ball bearing 6205 2RS C3", "OM-BRG-6205-2RS-C3", "identifier"),
    ("O-ring 10x2 FKM", "OM-SEA-OR-10X2-FKM", "identifier"),
    ("ball valve DN25 brass", "OM-VAL-BALL-DN25-BRASS", "identifier"),
    ("M12 sensor cable 4-pin PUR 5 m", "OM-CAB-M12-4P-PUR-5M", "identifier"),
    ("three-phase motor 0.75 kW B14 IE3", "OM-MOT-3PH-075KW-B14-IE3-4P", "identifier"),
    ("inductive sensor M12 PNP NO 4mm", "OM-SEN-IND-M12-PNP-NO-4MM", "identifier"),

    # --- German: no shared word except the size. Embeddings territory. ---
    ("Sechskantschraube M8x40 Edelstahl A2", "OM-FAS-HB-M8X40-A2-DIN933", "german"),
    ("Kugellager 6205 2RS C3, 40 Stueck", "OM-BRG-6205-2RS-C3", "german"),
    ("Dichtring 10x2 aus Viton", "OM-SEA-OR-10X2-FKM", "german"),
    ("Absperrhahn DN25 Messing", "OM-VAL-BALL-DN25-BRASS", "german"),
    ("Zylinderschraube M6x20 12.9", "OM-FAS-SC-M6X20-129-DIN912", "german"),
    ("Sensorkabel M12 4-polig PUR 5m", "OM-CAB-M12-4P-PUR-5M", "german"),
    ("Drehstrommotor 0,75 kW B14 IE3", "OM-MOT-3PH-075KW-B14-IE3-4P", "german"),
    ("Gewindestange M10 A2, 1 Meter", "OM-FAS-ROD-M10-A2-1M", "german"),

    # --- vague / synonymous: what an inbox actually looks like ---
    ("stainless hex bolts, M8, 40mm long", "OM-FAS-HB-M8X40-A2-DIN933", "vague"),
    ("inox bolt M8x40", "OM-FAS-HB-M8X40-A2-DIN933", "vague"),
    ("viton o-ring, 10mm bore, 2mm section", "OM-SEA-OR-10X2-FKM", "vague"),
    ("sealed bearing 6205, C3 clearance", "OM-BRG-6205-2RS-C3", "vague"),
    ("brass shutoff valve, 25mm", "OM-VAL-BALL-DN25-BRASS", "vague"),
    ("marine grade bolt M8x40", "OM-FAS-HB-M8X40-A4-DIN933", "vague"),
]


def _rank_of(shortlist, expected_sku: str) -> int | None:
    for rank, item in enumerate(shortlist):
        if item.sku == expected_sku:
            return rank
    return None


class Command(BaseCommand):
    help = "Measure blocking recall: how often the correct SKU reaches the shortlist."

    def handle(self, *args, **options):
        catalog = list(CatalogItem.objects.filter(status="active"))
        lines = [
            {"original_text": query, "description": "", "attributes": []}
            for query, _, _ in CASES
        ]

        missing = [sku for _, sku, _ in CASES if not any(c.sku == sku for c in catalog)]
        if missing:
            self.stdout.write(self.style.ERROR(f"Expected SKUs not in the catalog: {missing}"))
            return

        # Lexical only: same catalog with the vectors hidden, so the semantic
        # half genuinely cannot run rather than merely being ignored.
        lexical_catalog = list(CatalogItem.objects.filter(status="active"))
        for item in lexical_catalog:
            item.embedding = None
        lexical = build_index(lexical_catalog)

        hybrid = build_index(catalog, lines)
        if hybrid.semantic is None:
            self.stdout.write(
                self.style.WARNING(
                    "No vectors. Run `python manage.py embed_catalog` first, or this only "
                    "measures the lexical half."
                )
            )

        results: dict[str, dict[str, list]] = {}
        for index, (query, expected, kind) in enumerate(CASES):
            lex_rank = _rank_of(lexical.shortlist(lines[index]), expected)
            hyb_rank = _rank_of(hybrid.shortlist(lines[index], line_index=index), expected)

            results.setdefault(kind, {"lex": [], "hyb": [], "rows": []})
            results[kind]["lex"].append(lex_rank)
            results[kind]["hyb"].append(hyb_rank)
            results[kind]["rows"].append((query, lex_rank, hyb_rank))

        def summarize(ranks: list[int | None]) -> tuple[float, float, float]:
            found = [r for r in ranks if r is not None]
            recall = len(found) / len(ranks) * 100
            top10 = sum(1 for r in found if r < 10) / len(ranks) * 100
            mrr = sum(1 / (r + 1) for r in found) / len(ranks)
            return recall, top10, mrr

        self.stdout.write("")
        self.stdout.write(
            f"  Blocking recall over {len(CASES)} cases, {len(catalog)} active items, "
            f"shortlist = {SHORTLIST_SIZE}"
        )
        self.stdout.write("  " + "=" * 76)
        self.stdout.write(
            f"  {'':<12} {'recall@40':>22} {'recall@10':>22} {'MRR':>16}"
        )
        self.stdout.write(
            f"  {'kind':<12} {'lexical':>10} {'hybrid':>11} {'lexical':>10} {'hybrid':>11}"
            f" {'lexical':>7} {'hybrid':>8}"
        )
        self.stdout.write("  " + "-" * 76)

        all_lex: list[int | None] = []
        all_hyb: list[int | None] = []

        for kind in ("identifier", "german", "vague"):
            if kind not in results:
                continue
            lex_r, lex_10, lex_mrr = summarize(results[kind]["lex"])
            hyb_r, hyb_10, hyb_mrr = summarize(results[kind]["hyb"])
            all_lex += results[kind]["lex"]
            all_hyb += results[kind]["hyb"]

            self.stdout.write(
                f"  {kind:<12} {lex_r:>9.0f}% {hyb_r:>10.0f}% {lex_10:>9.0f}% {hyb_10:>10.0f}%"
                f" {lex_mrr:>7.2f} {hyb_mrr:>8.2f}"
            )

        lex_r, lex_10, lex_mrr = summarize(all_lex)
        hyb_r, hyb_10, hyb_mrr = summarize(all_hyb)
        self.stdout.write("  " + "-" * 76)
        self.stdout.write(
            self.style.SUCCESS(
                f"  {'ALL':<12} {lex_r:>9.0f}% {hyb_r:>10.0f}% {lex_10:>9.0f}% {hyb_10:>10.0f}%"
                f" {lex_mrr:>7.2f} {hyb_mrr:>8.2f}"
            )
        )

        # The failures are the interesting part, so print them rather than
        # burying them under an average.
        self.stdout.write("")
        self.stdout.write("  Cases where the right SKU never reached the shortlist:")
        any_miss = False
        for kind in results:
            for query, lex_rank, hyb_rank in results[kind]["rows"]:
                if lex_rank is None or hyb_rank is None:
                    any_miss = True
                    lex_text = "MISS" if lex_rank is None else f"#{lex_rank + 1}"
                    hyb_text = "MISS" if hyb_rank is None else f"#{hyb_rank + 1}"
                    self.stdout.write(
                        f"    [{kind:<10}] lexical {lex_text:<5} hybrid {hyb_text:<5}  \"{query}\""
                    )
        if not any_miss:
            self.stdout.write("    none. Both retrievers found every case.")
        self.stdout.write("")
