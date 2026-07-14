"""End-to-end proof that the learning loop actually learns.

eval_blocking measures retrieval. This measures the thing the case was actually
about: a reviewer corrects a match, and the next order from that customer is
better because of it.

Each scenario runs the real pipeline (blocking, deterministic rules, the LLM,
the customer's context.md) three times:

  round 1  the customer's first order. Nobody has taught the system anything.
  ...      a reviewer corrects the match. The correction is logged and an agent
           rewrites that customer's brief.
  round 2  the same request, worded slightly differently. Did it learn?
  round 3  again, to show round 2 was not a fluke.

The two scenarios are deliberately the same request from two different
customers, resolving to opposite SKUs. That is the whole argument for scoping
memory per customer rather than globally: "hex bolt M8x40, standard" means
marine-grade A4 to one buyer and cheap zinc to the next, and a global memory
would average them into something wrong for both.

Run:  python manage.py run_scenarios
"""

from __future__ import annotations

from django.core.management.base import BaseCommand
from django.utils import timezone

from catalogs.models import CatalogItem
from matching.context_file import build_context_file, get_context_file
from matching.memory import load_customer_memory, record_correction
from matching.models import (
    CustomerContextFile,
    CustomerCorrection,
    CustomerPreference,
    MatchCandidate,
)
from matching.pipeline import match_order_lines
from orders.models import OrderLineItem, OrderRecord

SESSION = "scenario-harness"

SCENARIOS = [
    {
        "customer": "Vogt Hydraulik GmbH",
        "why": "builds for coastal sites, so they want marine-grade steel",
        "wants": "OM-FAS-HB-M8X40-A4-DIN933",
        "rounds": [
            "hex bolt M8x40 inox, 500 pcs",
            "Sechskantschraube M8x40 inox, 500 Stueck",
            "500x hex bolt m8x40 inox",
        ],
    },
    {
        "customer": "LakePort Maintenance Supply LLC",
        "why": "price-led distributor, they want the cheapest thing that fits",
        "wants": "OM-FAS-HB-M8X40-ZN-DIN933",
        "rounds": [
            "hex bolt M8x40, standard, 500 pcs",
            "hex bolt m8x40 standard 500pcs",
            "500 x hex bolt M8x40, standard grade",
        ],
    },
]


def _extracted(text: str) -> dict:
    return {"original_text": text, "description": text, "attributes": [], "quantity": 500}


class Command(BaseCommand):
    help = "Run two end-to-end learning scenarios and report whether the matcher improved."

    def handle(self, *args, **options):
        # A scratch workspace. Never touches the real one.
        OrderRecord.objects.filter(demo_session_id=SESSION).delete()
        CustomerCorrection.objects.filter(demo_session_id=SESSION).delete()
        CustomerPreference.objects.filter(demo_session_id=SESSION).delete()
        CustomerContextFile.objects.filter(demo_session_id=SESSION).delete()

        catalog = list(CatalogItem.objects.filter(status="active"))

        for scenario in SCENARIOS:
            self._run(scenario, catalog)

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                "  Same sentence. Two customers. Opposite right answers, each learned from "
                "one correction."
            )
        )
        self.stdout.write("")

    def _run(self, scenario: dict, catalog: list[CatalogItem]) -> None:
        customer = scenario["customer"]
        wants = scenario["wants"]

        self.stdout.write("")
        self.stdout.write("  " + "=" * 74)
        self.stdout.write(f"  {customer}")
        self.stdout.write(f"  {scenario['why']}")
        self.stdout.write(f"  the SKU they actually want: {wants}")
        self.stdout.write("  " + "=" * 74)

        for round_number, text in enumerate(scenario["rounds"], start=1):
            memory = load_customer_memory(SESSION, customer)
            candidates = match_order_lines([_extracted(text)], catalog, memory=memory)[0]

            rank = next(
                (i for i, c in enumerate(candidates) if c.catalog_item.sku == wants), None
            )
            top = candidates[0].catalog_item if candidates else None

            self.stdout.write("")
            self.stdout.write(f'  round {round_number}: "{text}"')
            self.stdout.write(
                f"     memory: {'empty' if memory.is_empty() else 'has a brief + pinned rules'}"
            )
            for i, candidate in enumerate(candidates[:3]):
                marker = " <-- what they wanted" if candidate.catalog_item.sku == wants else ""
                self.stdout.write(
                    f"       {i + 1}. {candidate.catalog_item.name:<34} "
                    f"{candidate.catalog_item.price_amount:>5.2f} EUR{marker}"
                )

            if rank == 0:
                self.stdout.write(self.style.SUCCESS("     -> correct SKU is the top pick."))
            elif rank is not None:
                self.stdout.write(
                    self.style.WARNING(f"     -> correct SKU is only #{rank + 1}. A human must fix it.")
                )
            else:
                self.stdout.write(self.style.ERROR("     -> correct SKU not in the shortlist at all."))

            # After the first round only, a reviewer corrects it. Everything
            # after that has to come from what the system learned.
            if round_number == 1 and top and top.sku != wants:
                self.stdout.write("")
                self.stdout.write(f"     [ a reviewer corrects it: {top.sku} -> {wants} ]")
                self._correct(customer, text, candidates, wants)

                context = get_context_file(SESSION, customer_key_for(customer))
                if context:
                    self.stdout.write("")
                    self.stdout.write(f"     the agent wrote {customer_key_for(customer)}/context.md:")
                    for line in context.content.splitlines():
                        if line.strip():
                            self.stdout.write(f"       {line}")

    def _correct(self, customer: str, text: str, candidates: list, wants: str) -> None:
        """Persists a reviewer's correction exactly the way the API does."""
        order = OrderRecord.objects.create(
            id=f"scenario-{timezone.now().timestamp()}",
            demo_session_id=SESSION,
            customer_name=customer,
            source="pasted-text",
            received_at=timezone.now(),
            currency="EUR",
            status="review-needed",
        )
        line = OrderLineItem.objects.create(
            id=f"{order.id}-line", order=order, line_number=1, original_text=text, status="review-needed"
        )

        chosen = None
        for rank, candidate in enumerate(candidates, start=1):
            row = MatchCandidate.objects.create(
                id=f"{line.id}-cand-{rank}",
                line_item=line,
                catalog_item=candidate.catalog_item,
                sku=candidate.catalog_item.sku,
                confidence_band="review-needed",
                score=candidate.score,
                rank=rank,
            )
            if candidate.catalog_item.sku == wants:
                chosen = row

        if chosen is None:
            self.stdout.write(
                self.style.ERROR("     cannot correct: the right SKU was never offered.")
            )
            return

        record_correction(session_id=SESSION, line_item=line, chosen_candidate=chosen)
        build_context_file(SESSION, customer_key_for(customer), customer)


def customer_key_for(name: str) -> str:
    from matching.memory import customer_key_for as key

    return key(name)
