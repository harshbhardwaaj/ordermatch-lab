import { TransitionLink } from "@/components/view-transition-link";
import { Button } from "@/components/ui/button";
import { icons } from "@/lib/icons";

const learnedItems = [
  {
    title: "Intake is messy",
    detail:
      "Orders can arrive as email text, PDFs, spreadsheets, or RFQs, and each customer writes line items differently.",
  },
  {
    title: "Extraction is only step one",
    detail:
      "A parsed order still needs field completeness, original text, quantities, units, prices, and delivery context.",
  },
  {
    title: "Matching needs reasons",
    detail:
      "SKU suggestions should expose size, material, unit, customer part number, catalog attributes, and alternates.",
  },
  {
    title: "ERP-ready means validated",
    detail:
      "An order should move downstream only after blocking exceptions, low confidence, and missing fields are handled.",
  },
] as const;

export function WhatILearnedSection() {
  const ArrowRight = icons.action;

  return (
    <section className="mt-10 rounded-2xl border border-[var(--om-border)] bg-[var(--om-surface)]/82">
      <div className="mx-auto w-full max-w-screen-2xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold text-[var(--om-accent)]">
              Simple version
            </p>
            <h2 className="mt-3 max-w-xl text-2xl font-bold leading-tight tracking-normal text-[var(--om-text)] sm:text-3xl">
              The product is about review, not magic.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--om-muted)] sm:text-base">
              A customer sends an order. The system reads it, suggests products,
              explains uncertainty, and shows what still needs a person before
              the order can move forward.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="w-full bg-[var(--om-accent)] text-[var(--om-accent-text)] hover:bg-[var(--om-accent-hover)] sm:w-auto">
                <TransitionLink href="/prototype">
                  What I built
                  <ArrowRight aria-hidden="true" />
                </TransitionLink>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full border-[var(--om-border)] bg-[var(--om-surface)]/80 text-[var(--om-muted)] hover:bg-[var(--om-surface-2)] hover:text-[var(--om-text)] sm:w-auto"
              >
                <TransitionLink href="/thesis">How it works</TransitionLink>
              </Button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {learnedItems.map((item) => (
              <article
                key={item.title}
                className="rounded-xl border border-[var(--om-border)] bg-[var(--om-surface-2)]/82 p-4"
              >
                <h3 className="text-sm font-semibold text-[var(--om-text)]">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[var(--om-muted)]">
                  {item.detail}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
