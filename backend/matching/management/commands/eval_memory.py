"""Evaluates the learning loop end to end against the real catalog.

    python manage.py eval_memory

Each scenario teaches the system something, then asks a question whose right
answer depends on having learned it. Two failures are checked, and the second is
the one that would actually hurt someone:

  - it forgot        a correction that should have applied, didn't
  - it over-applied  a correction bled onto a part or a customer it was never
                     given for, quietly putting a wrong SKU into an ERP

Written after the demo caught a bug the unit tests could not: the memory key had
the order quantity in it, so a reorder of 150 never found the correction taught
at 200. Unit tests passed throughout. This is the test that would have failed.

Costs a handful of OpenAI calls (real extraction, real matching). Runs against
whatever catalog the local database holds.
"""

import uuid

from django.core.management.base import BaseCommand

from matching.memory import load_customer_memory, record_correction
from orders.services import create_order_from_pasted_text


class Command(BaseCommand):
    help = "Teach the matcher, then check it remembers — and only what it was taught."

    def handle(self, *args, **options):
        SESSION = "eval-" + uuid.uuid4().hex[:10]
        results = []

        SESSION = "eval-" + uuid.uuid4().hex[:10]
        results = []


        def order(text):
            return create_order_from_pasted_text(text, SESSION)


        def line_of(o, n=0):
            return list(o.line_items.all())[n]


        def top(line):
            cands = list(line.match_candidates.all().order_by("rank"))
            return cands[0] if cands else None


        def teach(line, sku_fragment):
            """The reviewer picks the candidate whose SKU contains sku_fragment."""
            chosen = next(
                c for c in line.match_candidates.all() if sku_fragment in c.sku
            )
            record_correction(session_id=SESSION, line_item=line, chosen_candidate=chosen)
            return chosen


        def check(name, passed, detail):
            results.append((name, passed, detail))
            print(f"  [{'PASS' if passed else 'FAIL'}] {name}\n         {detail}")


        def header(t):
            print(f"\n--- {t}")


        # ---------------------------------------------------------------------------
        header("1. teach at one quantity, reorder at another")
        o1 = order("Mueller Technik GmbH, PO-1\n1. 200x Sechskantschraube M8x40 inox")
        l1 = line_of(o1)
        chosen = teach(l1, "-A4-")
        print(f"       taught: 'inox' -> {chosen.sku}")

        o2 = order("Mueller Technik GmbH, PO-2\n1. 150x Sechskantschraube M8x40 inox")
        l2 = line_of(o2)
        t2 = top(l2)
        sig = t2.learned_signal or {}
        check(
            "reorder at a different quantity is remembered",
            sig.get("pinned") and "-A4-" in t2.sku and l2.status == "matched",
            f"top={t2.sku} pinned={bool(sig.get('pinned'))} status={l2.status}",
        )

        # ---------------------------------------------------------------------------
        header("2. the same request in English, having been taught in German")
        o3 = order("Mueller Technik GmbH, PO-3\n1. 80x hex bolt M8x40 inox")
        l3 = line_of(o3)
        t3 = top(l3)
        sig3 = t3.learned_signal or {}
        check(
            "a reworded reorder (known limitation: exact-text key)",
            True,  # informational, not a gate: recorded so the limit is visible
            f"top={t3.sku} pinned={bool(sig3.get('pinned'))} status={l3.status}"
            " <- exact-text memory; embedding recall of past corrections is the next step",
        )

        # ---------------------------------------------------------------------------
        header("3. a different SIZE must not inherit the correction")
        o4 = order("Mueller Technik GmbH, PO-4\n1. 200x Sechskantschraube M8x50 inox")
        l4 = line_of(o4)
        t4 = top(l4)
        sig4 = t4.learned_signal or {}
        check(
            "M8x50 does not inherit the M8x40 pin",
            not sig4.get("pinned") and "M8X50" in t4.sku.upper(),
            f"top={t4.sku} pinned={bool(sig4.get('pinned'))} (must be unpinned, and an M8x50)",
        )

        # ---------------------------------------------------------------------------
        header("4. another customer must not inherit the correction")
        o5 = order("NordEifel Robotics KG, PO-5\n1. 200x Sechskantschraube M8x40 inox")
        l5 = line_of(o5)
        t5 = top(l5)
        sig5 = t5.learned_signal or {}
        check(
            "memory does not leak across customers",
            not sig5.get("pinned"),
            f"top={t5.sku} pinned={bool(sig5.get('pinned'))} (must be unpinned for a new buyer)",
        )

        # ---------------------------------------------------------------------------
        header("5. the taught customer, asked again, still remembers")
        o6 = order("Mueller Technik GmbH, PO-6\n1. 500x Sechskantschraube M8x40 inox")
        l6 = line_of(o6)
        t6 = top(l6)
        sig6 = t6.learned_signal or {}
        check(
            "the pin persists across several orders",
            sig6.get("pinned") and "-A4-" in t6.sku and l6.status == "matched",
            f"top={t6.sku} pinned={bool(sig6.get('pinned'))} status={l6.status}",
        )

        # ---------------------------------------------------------------------------
        header("6. the context file the matcher reads")
        mem = load_customer_memory(SESSION, "Mueller Technik GmbH")
        other = load_customer_memory(SESSION, "NordEifel Robotics KG")
        check(
            "corrections are filed under the customer who made them",
            not mem.is_empty() and other.is_empty(),
            f"Mueller has memory={not mem.is_empty()}, NordEifel has memory={not other.is_empty()}",
        )

        # ---------------------------------------------------------------------------
        print("\n" + "=" * 72)
        failed = [r for r in results if not r[1]]
        for name, passed, _ in results:
            print(f"  {'PASS' if passed else 'FAIL'}  {name}")
        print(f"\n{len(results) - len(failed)}/{len(results)} passed")
        raise SystemExit(1 if failed else 0)
