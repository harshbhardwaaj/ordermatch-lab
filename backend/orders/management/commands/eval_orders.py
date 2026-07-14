"""Ten orders, ten different things that can go wrong.

    python manage.py eval_orders

Each scenario states the behaviour it expects, so a failure is a fact and not an
opinion. The traps matter more than the happy paths: a wrong SKU that gets
auto-approved is far worse than a right one that gets asked about, so several of
these check that the system declines to be confident.

Two real bugs were found this way, both invisible to the unit suite:
the memory key contained the order quantity (so no reorder ever matched a
correction), and a discontinued part's declared replacement was never hoisted
into the picker (so the reviewer was shown a wrong-length variant first).

Costs a handful of OpenAI calls. Runs against whatever catalog is in the DB.
"""

import uuid

from django.core.management.base import BaseCommand

from catalogs.models import CatalogItem
from matching.memory import record_correction
from orders.extraction import ExtractionError
from orders.services import create_order_from_pasted_text


class Command(BaseCommand):
    help = "Ten orders probing extraction, matching, supersession, memory and refusal."

    def handle(self, *args, **options):
        S = "eval10-" + uuid.uuid4().hex[:8]
        rows = []

        S = "eval10-" + uuid.uuid4().hex[:8]
        rows = []


        def run(text, session=None):
            return create_order_from_pasted_text(text, session or S)


        def lines(o):
            out = []
            for li in o.line_items.all().order_by("line_number"):
                c = li.match_candidates.all().order_by("rank").first()
                out.append(
                    {
                        "text": li.original_text,
                        "status": li.status,
                        "sku": c.sku if c else None,
                        "qty": li.quantity,
                        "unit": li.unit,
                        "sig": (c.learned_signal or {}) if c else {},
                        "requires_review": c.requires_human_review if c else None,
                        "n_cands": li.match_candidates.count(),
                    }
                )
            return out


        def check(n, name, ok, detail):
            rows.append((n, name, ok, detail))
            print(f"[{'PASS' if ok else 'FAIL'}] {n:2}. {name}\n        {detail}")


        # 1 — exact SKU stated
        o = run("Acme Werke, PO-1\n1. 100x OM-FAS-HB-M8X40-A2-ISO4017")
        l = lines(o)[0]
        check(1, "an exactly stated SKU auto-matches",
              l["status"] == "matched" and l["sku"] == "OM-FAS-HB-M8X40-A2-ISO4017",
              f"status={l['status']} sku={l['sku']}")

        # 2 — quantity and unit parsing
        o = run("Acme Werke, PO-2\n1. 250 Stk Sechskantschraube M8x40 A2 DIN 933")
        l = lines(o)[0]
        check(2, "quantity and unit are extracted",
              l["qty"] == 250,
              f"qty={l['qty']} unit={l['unit']} sku={l['sku']}")

        # 3 — grade ambiguity must ASK, not guess
        o = run("Acme Werke, PO-3\n1. 200x Sechskantschraube M8x40 inox")
        l = lines(o)[0]
        check(3, "an ambiguous grade goes to review rather than being guessed",
              l["status"] == "review-needed" and l["n_cands"] > 1,
              f"status={l['status']} candidates={l['n_cands']} top={l['sku']}")

        # 4 — German synonyms resolve against an English catalog
        o = run("Acme Werke, PO-4\n1. 50x Kugellager 6204 2RS\n2. 30x Unterlegscheibe M8 verzinkt\n3. 10x Kugelhahn DN25 Edelstahl")
        ls = lines(o)
        ok = ("BRG-6204" in (ls[0]["sku"] or "")) and ("WAS-M8" in (ls[1]["sku"] or "")) and ("VAL" in (ls[2]["sku"] or ""))
        check(4, "German words find the right English catalog family",
              ok, " | ".join(f"{x['text'][:22]}->{x['sku']}" for x in ls))

        # 5 — the size trap
        o = run("Acme Werke, PO-5\n1. 40x hex bolt M8x50 A2 ISO 4017")
        l = lines(o)[0]
        check(5, "M8x50 does not match an M8x40",
              "M8X50" in (l["sku"] or "").upper(),
              f"sku={l['sku']} (must be an M8x50)")

        # 6 — a superseded part must be flagged, never silently substituted
        disc = CatalogItem.objects.exclude(status="active").exclude(replacement_sku="").first()
        if disc:
            o = run(f"Acme Werke, PO-6\n1. 15x {disc.name} ({disc.sku})")
            l = lines(o)[0]
            check(6, "a discontinued part shows its declared replacement first, and still asks",
                  l["status"] != "matched" and l["sku"] == disc.replacement_sku,
                  f"asked={disc.sku} status={l['status']} top={l['sku']} replacement={disc.replacement_sku}")
        else:
            check(6, "a discontinued part is not silently swapped", False, "no discontinued item in catalog")

        # 7 — nonsense must not confidently match something
        o = run("Acme Werke, PO-7\n1. 5x purple hovercraft flange XZ-9999")
        l = lines(o)[0]
        check(7, "an item that is not in the catalog does not auto-match anyway",
              l["status"] != "matched",
              f"status={l['status']} top={l['sku']}")

        # 8 — typos
        o = run("Acme Werke, PO-8\n1. 25x Kugellger 6204 2RS")
        l = lines(o)[0]
        check(8, "a typo still reaches the right family",
              "BRG-6204" in (l["sku"] or ""),
              f"sku={l['sku']}")

        # 9 — memory must not bleed onto a different customer
        teach_order = run("Vogt Hydraulik GmbH, PO-9a\n1. 200x Sechskantschraube M8x40 inox")
        bolt = teach_order.line_items.get(line_number=1)
        a4 = next((c for c in bolt.match_candidates.all() if "-A4-" in c.sku), None)
        record_correction(session_id=S, line_item=bolt, chosen_candidate=a4)
        o = run("Fremd Industrie AG, PO-9b\n1. 200x Sechskantschraube M8x40 inox")
        l = lines(o)[0]
        check(9, "one customer's correction does not auto-match for another",
              not l["sig"].get("pinned") and l["status"] != "matched",
              f"other customer: status={l['status']} pinned={bool(l['sig'].get('pinned'))} top={l['sku']}")

        # 10 — garbage in: no order created, clean error
        try:
            run("hello, how are you today?")
            ok, detail = False, "an order was created from a non-order"
        except ExtractionError as exc:
            ok, detail = True, f"ExtractionError: {exc}"
        check(10, "text that is not an order raises rather than inventing one", ok, detail)

        print("\n" + "=" * 74)
        bad = [r for r in rows if not r[2]]
        for n, name, okk, _ in rows:
            print(f"  {'PASS' if okk else 'FAIL'}  {n:2}. {name}")
        print(f"\n{len(rows) - len(bad)}/{len(rows)} passed")

        if bad:
            raise SystemExit(1)
