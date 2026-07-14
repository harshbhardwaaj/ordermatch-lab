"use client";

import { ArrowRight } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { TransitionLink } from "@/components/view-transition-link";

/** The three difficulties, taken straight from the case brief. Cards rather
 * than a paragraph, because these are the three things worth remembering and a
 * block of prose hides them from anyone skimming. */
const DIFFICULTIES = [
  {
    stat: "10,000+",
    label: "items in the catalog",
    detail: "Too many to show a person. Too many to hand an AI in one go.",
  },
  {
    stat: "One job, many grades",
    label: "zinc / A2 / A4",
    detail: "The same bolt. Tougher metal, higher price. Which one did they mean?",
  },
  {
    stat: "Old parts, still listed",
    label: "superseded but active",
    detail: "The replacement is in the catalog. So is the thing it replaced.",
  },
];

export function PrototypeOrientation() {
  return (
    <AppShell>
      {/* Fluid, not boxed. The old max-w-4xl left half of a desktop screen
          empty; this scales with the viewport at every size instead of
          snapping between a couple of fixed breakpoints. */}
      <main
        id="main"
        className="flex min-h-dvh w-full flex-col justify-center px-[5vw] py-16 text-[var(--om-text)]"
      >
        <section className="flex w-full flex-col gap-8">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.24em] text-[var(--om-accent)] sm:text-sm">
            The problem you gave me
          </p>

          <div className="space-y-2">
            <h1 className="text-[clamp(1.55rem,3.2vw,3rem)] font-extrabold leading-[1.14] text-[var(--om-text)]">
              A customer writes
            </h1>
            <p className="text-[clamp(1.55rem,3.2vw,3rem)] font-extrabold leading-[1.14] text-[var(--om-accent)]">
              500x hex bolt M8x40, standard
            </p>
            <p className="text-[clamp(1.55rem,3.2vw,3rem)] font-extrabold leading-[1.14] text-[var(--om-text)]">
              and your catalog has that bolt three times over.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {DIFFICULTIES.map((card) => (
              <div
                key={card.stat}
                className="rounded-xl border border-[var(--om-border)] bg-[var(--om-surface)] p-5"
              >
                <p className="text-lg font-extrabold leading-tight text-[var(--om-text)]">
                  {card.stat}
                </p>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--om-accent)]">
                  {card.label}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--om-muted)]">{card.detail}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-[clamp(1rem,1.35vw,1.3rem)] leading-relaxed text-[var(--om-muted)]">
              No matcher gets this right the first time. It doesn&apos;t have to. Someone is
              already sitting there fixing it.
            </p>
            <p className="text-[clamp(1.15rem,1.7vw,1.65rem)] font-bold leading-snug text-[var(--om-text)]">
              The only question that matters is whether it remembers the fix.
            </p>
          </div>


          <Button
            asChild
            size="lg"
            className="mt-2 w-full bg-[var(--om-accent)] px-6 text-sm text-[var(--om-accent-text)] hover:bg-[var(--om-accent-hover)] sm:w-auto sm:self-start"
          >
            <TransitionLink href="/prototype/answer">
              So what did I do about it?
              <ArrowRight aria-hidden="true" />
            </TransitionLink>
          </Button>
        </section>
      </main>
    </AppShell>
  );
}
