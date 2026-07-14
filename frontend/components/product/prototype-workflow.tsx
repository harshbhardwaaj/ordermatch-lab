"use client";

import { useState } from "react";
import {
  ArrowRight,
  Ban,
  Brain,
  ChevronDown,
  Filter,
  RotateCcw,
  Ruler,
  UserRound,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { TransitionLink } from "@/components/view-transition-link";
import { cn } from "@/lib/utils";

/** The pipeline, with the numbers it actually produces. Every figure here is
 * measured against the real 10,202-item catalog, not illustrative: the
 * shortlist size, the timings and the token counts all come out of
 * matching/blocking.py. The argument the page is making is that the expensive
 * model is the last thing to run, not the first, so the numbers had better be
 * real. */
const STAGES = [
  {
    id: "block",
    icon: Filter,
    kicker: "Step 1",
    title: "Narrow 10,202 down to 40",
    cost: "~1 ms · no model · €0",
    from: "10,202 SKUs",
    to: "40 candidates",
    summary:
      "An inverted index over the catalog. The customer's words are scored against it, rare words counting for most.",
    detail:
      "This is the step that makes a big catalog possible at all. Handing 10,202 items to a language model is roughly 907,000 tokens per call, which is past the context limit, not merely expensive. So the model never sees the catalog. It sees forty rows. Rare words carry the signal here: \"m8x40\" appears in a handful of items and tells you almost everything, \"bolt\" appears in thousands and tells you nothing, and weighting by rarity is what encodes that difference. It costs no API call and about a millisecond.",
    caveat:
      "The honest weakness: this matches on words. A customer who writes \"Kugellager\" shares no word with \"ball bearing\", so it falls back to a slower fuzzy sweep. Embedding the request is the real fix, and it slots in exactly here.",
  },
  {
    id: "rules",
    icon: Ruler,
    kicker: "Step 2",
    title: "Let plain code answer what it can",
    cost: "~0 ms · no model · €0",
    from: "40 candidates",
    to: "most lines resolved",
    summary:
      "Part numbers, SKUs, threads, materials and standards are compared directly. If one candidate wins clearly, the line is done.",
    detail:
      "If a customer names their own part number, that is not a hint, it is an answer. No model is needed to look it up, and using one would be slower, costlier and less reliable than a dictionary. A line only escalates when the deterministic score is genuinely close, which is exactly the situation a language model is good at and code is not.",
    caveat: null,
  },
  {
    id: "llm",
    icon: Brain,
    kicker: "Step 3",
    title: "The model only sees what is still ambiguous",
    cost: "~12.6k tokens · one call per order",
    from: "the leftovers",
    to: "ranked candidates + reasons",
    summary:
      "Every unresolved line in the order goes in one batched call, along with the customer's context.md.",
    detail:
      "One call for the whole order, not one per line: a twenty-line order should not mean twenty round trips. The prompt carries only the union of the shortlists, so it is about 12,600 tokens rather than 907,000, a 98.6% cut. It also carries the brief written about this customer, which is why the model stops proposing the SKU they keep overruling instead of merely being overruled faster.",
    caveat: null,
  },
  {
    id: "human",
    icon: UserRound,
    kicker: "Step 4",
    title: "A person decides the ones that are genuinely unclear",
    cost: "the only expensive step",
    from: "ranked candidates",
    to: "a decision",
    summary:
      "The reviewer sees the top pick, the alternatives, the price of each, and the evidence behind every one.",
    detail:
      "\"500x hex bolt M8x40, standard\" legitimately matches fifteen SKUs from 0.06 to 0.27 EUR. No matcher can resolve that, because the information is not in the sentence. It is in the customer's head. So the job is not to guess better, it is to ask well: show the shortlist, show the price, show the reasoning, and make the correction take one click.",
    caveat: null,
  },
  {
    id: "learn",
    icon: RotateCcw,
    kicker: "Step 5",
    title: "The correction is written down and reused",
    cost: "flat, forever",
    from: "a decision",
    to: "a better step 3",
    summary:
      "The decision is logged against that customer. An agent rewrites their brief. The next order reads it.",
    detail:
      "Two things are kept, deliberately. The exact wording is pinned to the exact SKU, so an identical request is never re-litigated and costs nothing. And the reason behind it is distilled into a short brief, because a reason generalizes to line items the counters have never seen. The brief is rewritten rather than appended to, so a customer with three hundred corrections costs the same to know as one with three.",
    caveat: null,
  },
];

function StageCard({ stage, index }: { stage: (typeof STAGES)[number]; index: number }) {
  const [open, setOpen] = useState(false);
  const Icon = stage.icon;
  const last = index === STAGES.length - 1;

  return (
    <div className="relative flex gap-4">
      {/* The spine. It literally connects the steps, so it should be a line. */}
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl border",
            last
              ? "border-[var(--om-accent)] bg-[var(--om-accent)] text-[var(--om-accent-text)]"
              : "border-[var(--om-border)] bg-[var(--om-surface)] text-[var(--om-accent)]",
          )}
        >
          <Icon className="size-5" />
        </span>
        {!last ? <span className="w-px flex-1 bg-[var(--om-border-strong)]" /> : null}
      </div>

      <div className="min-w-0 flex-1 pb-8">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--om-subtle)]">
          {stage.kicker}
        </p>
        <h2 className="mt-1 text-[clamp(1.05rem,1.6vw,1.4rem)] font-bold leading-snug text-[var(--om-text)]">
          {stage.title}
        </h2>

        {/* from -> to, with the cost. The three things you'd actually ask. */}
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2">
          <span className="rounded-md border border-[var(--om-border)] bg-[var(--om-surface)] px-2 py-1 font-mono text-xs text-[var(--om-muted)]">
            {stage.from}
          </span>
          <ArrowRight className="size-3.5 shrink-0 text-[var(--om-accent)]" />
          <span className="rounded-md border border-[var(--om-accent)] bg-[var(--om-accent-softer)] px-2 py-1 font-mono text-xs font-semibold text-[var(--om-accent)]">
            {stage.to}
          </span>
          <span className="ml-auto font-mono text-[11px] text-[var(--om-subtle)]">{stage.cost}</span>
        </div>

        <p className="mt-3 text-sm leading-6 text-[var(--om-muted)]">{stage.summary}</p>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="mt-2 flex items-center gap-1 text-xs font-semibold text-[var(--om-accent)] hover:underline"
        >
          {open ? "Less" : "Why it works this way"}
          <ChevronDown className={cn("size-3 transition-transform", open && "rotate-180")} />
        </button>

        {open ? (
          <div className="mt-3 rounded-lg border-l-2 border-[var(--om-accent)] bg-[var(--om-surface)] p-4">
            <p className="text-sm leading-6 text-[var(--om-muted)]">{stage.detail}</p>
            {stage.caveat ? (
              <p className="mt-3 flex gap-2 text-sm leading-6 text-[var(--om-muted)]">
                <Ban className="mt-1 size-3.5 shrink-0 text-amber-600" />
                <span>{stage.caveat}</span>
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function PrototypeWorkflow() {
  return (
    <AppShell>
      <main id="main" className="w-full px-[5vw] py-12 text-[var(--om-text)]">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.24em] text-[var(--om-accent)]">
          How I solved it
        </p>
        <h1 className="mt-3 text-[clamp(1.6rem,3.2vw,2.8rem)] font-extrabold leading-[1.14]">
          The expensive part runs last.
        </h1>
        <p className="mt-3 text-[clamp(1rem,1.3vw,1.2rem)] leading-relaxed text-[var(--om-muted)]">
          You liked that the first build used the model only where it earned its keep. A
          ten-thousand item catalog makes that a requirement rather than a preference: the whole
          catalog in a prompt is about 907,000 tokens, so the model has to be the last thing that
          runs, not the first.
        </p>

        {/* The headline number. It is the argument, so it goes above the fold. */}
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {[
            { value: "10,202", label: "SKUs in the catalog" },
            { value: "40", label: "the model ever sees" },
            { value: "98.6%", label: "fewer tokens per call" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-[var(--om-border)] bg-[var(--om-surface)] p-5"
            >
              <p className="text-[clamp(1.6rem,2.6vw,2.2rem)] font-extrabold leading-none text-[var(--om-accent)]">
                {stat.value}
              </p>
              <p className="mt-2 text-sm text-[var(--om-muted)]">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col">
          {STAGES.map((stage, index) => (
            <StageCard key={stage.id} stage={stage} index={index} />
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-[var(--om-accent)] bg-[var(--om-accent-softer)] p-6">
          <p className="text-[clamp(1.05rem,1.6vw,1.35rem)] font-bold leading-snug text-[var(--om-text)]">
            Step 5 feeds step 3. That loop is the whole product.
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--om-muted)]">
            Everything above it is plumbing that keeps the loop cheap enough to run on a real
            catalog. The reviewer was always going to fix the bad matches. The only question was
            whether anything was listening.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-5 bg-[var(--om-accent)] px-6 text-sm text-[var(--om-accent-text)] hover:bg-[var(--om-accent-hover)]"
          >
            <TransitionLink href="/prototype/start">
              Try it, then teach it
              <ArrowRight aria-hidden="true" />
            </TransitionLink>
          </Button>
        </div>
      </main>
    </AppShell>
  );
}
