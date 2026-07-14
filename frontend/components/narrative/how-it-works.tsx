"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  Brain,
  Check,
  FileText,
  Filter,
  RotateCcw,
  Ruler,
  UserRound,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { TransitionLink } from "@/components/view-transition-link";
import { cn } from "@/lib/utils";

/* Every number on these slides is measured against the real 10,202-item
 * catalog (matching/blocking.py), not illustrative. The whole argument is that
 * the expensive model runs last, so the figures had better be checkable. */

function FunnelVisual() {
  const stages = [
    { label: "Catalog", value: "10,202", width: "100%", tone: "muted" },
    { label: "After blocking", value: "40", width: "24%", tone: "accent" },
    { label: "Reach the model", value: "only the unclear", width: "12%", tone: "accent" },
    { label: "Reach a person", value: "the genuinely ambiguous", width: "6%", tone: "solid" },
  ];

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--om-border)] bg-[var(--om-surface)] p-5">
      {stages.map((stage) => (
        <div key={stage.label}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--om-subtle)]">
              {stage.label}
            </span>
            <span className="text-sm font-bold text-[var(--om-text)]">{stage.value}</span>
          </div>
          <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-[var(--om-surface-3)]">
            <div
              style={{ width: stage.width }}
              className={cn(
                "h-full rounded-full",
                stage.tone === "muted" && "bg-[var(--om-border-strong)]",
                stage.tone === "accent" && "bg-[var(--om-accent)] opacity-60",
                stage.tone === "solid" && "bg-[var(--om-accent)]",
              )}
            />
          </div>
        </div>
      ))}
      <p className="mt-1 text-xs leading-5 text-[var(--om-muted)]">
        Each step is cheaper than the one after it, so the expensive ones see the least work.
      </p>
    </div>
  );
}

function TokenVisual() {
  return (
    <div className="flex flex-col gap-5 rounded-xl border border-[var(--om-border)] bg-[var(--om-surface)] p-5">
      <div>
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--om-subtle)]">
            Whole catalog in the prompt
          </span>
          <span className="font-mono text-sm font-bold text-[var(--om-text)]">~907,000</span>
        </div>
        <div className="mt-2 h-8 w-full rounded-md bg-[var(--om-border-strong)]" />
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-700">
          <Ban className="size-3 shrink-0" />
          Past the context limit. Not expensive, impossible.
        </p>
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--om-subtle)]">
            After blocking
          </span>
          <span className="font-mono text-sm font-bold text-[var(--om-accent)]">~12,600</span>
        </div>
        <div className="mt-2 h-8 w-[1.4%] min-w-[6px] rounded-md bg-[var(--om-accent)]" />
        <p className="mt-1.5 text-xs text-[var(--om-muted)]">
          98.6% fewer tokens. One inverted index, about a millisecond, no model.
        </p>
      </div>
    </div>
  );
}

function RulesVisual() {
  const rows = [
    { label: "Customer part number", value: "CUST-VH-4481", hit: true },
    { label: "Thread and length", value: "M8 x 40 mm", hit: true },
    { label: "Material synonym", value: "inox to A2 stainless", hit: true },
    { label: "Standard", value: "DIN 933", hit: true },
    { label: "Unit price", value: "0.18 EUR", hit: true },
  ];

  return (
    <div className="rounded-xl border border-[var(--om-border)] bg-[var(--om-surface)] p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--om-subtle)]">
        Resolved without a model
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-[var(--om-muted)]">{row.label}</span>
            <span className="flex items-center gap-1.5 font-medium text-[var(--om-text)]">
              {row.value}
              <Check className="size-3.5 shrink-0 text-green-600" />
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 border-t border-[var(--om-border)] pt-3 text-xs text-[var(--om-muted)]">
        Five matching signals, zero API calls. A named part number is not a hint, it is an answer.
      </p>
    </div>
  );
}

function BatchVisual() {
  return (
    <div className="rounded-xl border border-[var(--om-border)] bg-[var(--om-surface)] p-5">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 flex-col gap-1.5">
          {["line 10", "line 20", "line 30", "line 40"].map((line) => (
            <span
              key={line}
              className="rounded-md border border-[var(--om-border)] bg-[var(--om-surface-2)] px-2 py-1 text-center font-mono text-[11px] text-[var(--om-muted)]"
            >
              {line}
            </span>
          ))}
        </div>
        <ArrowRight className="size-4 shrink-0 text-[var(--om-accent)]" />
        <div className="flex-1 rounded-lg border border-[var(--om-accent)] bg-[var(--om-accent-softer)] p-3 text-center">
          <Brain className="mx-auto size-5 text-[var(--om-accent)]" />
          <p className="mt-1.5 text-xs font-bold text-[var(--om-text)]">One call</p>
          <p className="font-mono text-[10px] text-[var(--om-muted)]">~12.6k tokens</p>
        </div>
      </div>
      <p className="mt-4 text-xs leading-5 text-[var(--om-muted)]">
        A twenty-line order should not mean twenty round trips. Every unresolved line goes in one
        batched call, together with what we know about this customer.
      </p>
    </div>
  );
}

function LadderVisual() {
  const ladder = [
    { sku: "OM-FAS-HB-M8X40-ZN", grade: "zinc", price: "0.06" },
    { sku: "OM-FAS-HB-M8X40-88", grade: "8.8", price: "0.09" },
    { sku: "OM-FAS-HB-M8X40-A2", grade: "A2", price: "0.13" },
    { sku: "OM-FAS-HB-M8X40-129", grade: "12.9", price: "0.17" },
    { sku: "OM-FAS-HB-M8X40-A4", grade: "A4", price: "0.24", pick: true },
  ];

  return (
    <div className="rounded-xl border border-[var(--om-border)] bg-[var(--om-surface)] p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--om-subtle)]">
        &ldquo;500x hex bolt M8x40, standard&rdquo;
      </p>
      <ul className="mt-3 flex flex-col gap-1.5">
        {ladder.map((row) => (
          <li
            key={row.sku}
            className={cn(
              "flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm",
              row.pick
                ? "border-[var(--om-accent)] bg-[var(--om-accent-softer)]"
                : "border-[var(--om-border)]",
            )}
          >
            <span className="font-medium text-[var(--om-text)]">{row.grade}</span>
            <span className="flex items-center gap-2">
              {row.pick ? (
                <span className="rounded-full bg-[var(--om-accent)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--om-accent-text)]">
                  they meant this
                </span>
              ) : null}
              <span className="font-mono text-xs font-semibold text-[var(--om-text)]">
                {row.price} €
              </span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs leading-5 text-[var(--om-muted)]">
        Fifteen SKUs fit that sentence, at four times the price spread. The answer is not in the
        text. It is in the customer&apos;s head.
      </p>
    </div>
  );
}

/** The cost argument, made by the picture rather than by three paragraphs. The
 * slide used to state the same thing twice, once in prose and once in a card,
 * and read as a wall. The two panels ARE the argument: the naive way grows
 * without limit, the brief does not. */
function ContextVisual() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="flex flex-col rounded-xl border border-[var(--om-border-strong)] bg-[var(--om-surface)] p-5">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--om-subtle)]">
          Put every correction in the prompt
        </p>

        <div className="mt-4 flex flex-1 items-end gap-1.5">
          {[14, 26, 40, 58, 78, 100].map((height, index) => (
            <div key={height} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                style={{ height: `${height}px` }}
                className="w-full rounded-t bg-[var(--om-border-strong)]"
              />
              <span className="font-mono text-[9px] text-[var(--om-subtle)]">
                {[1, 10, 50, 100, 200, 300][index]}
              </span>
            </div>
          ))}
        </div>

        <p className="mt-3 border-t border-[var(--om-border)] pt-3 text-xs leading-5 text-[var(--om-muted)]">
          Three hundred corrections means three hundred examples in every prompt, forever.
        </p>
        <p className="mt-1.5 font-mono text-sm font-bold text-amber-700">cost grows with trust</p>
      </div>

      <div className="flex flex-col rounded-xl border border-[var(--om-accent)] bg-[var(--om-accent-softer)] p-5">
        <p className="flex items-center justify-between gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--om-accent)]">
          <span className="flex items-center gap-1.5">
            <FileText className="size-3" />
            context.md
          </span>
          <span className="font-normal text-[var(--om-subtle)]">~150 tokens</span>
        </p>

        <div className="mt-4 flex flex-1 items-end gap-1.5">
          {[1, 10, 50, 100, 200, 300].map((corrections) => (
            <div key={corrections} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="h-[22px] w-full rounded-t bg-[var(--om-accent)]" />
              <span className="font-mono text-[9px] text-[var(--om-subtle)]">{corrections}</span>
            </div>
          ))}
        </div>

        <p className="mt-3 border-t border-[var(--om-accent)]/30 pt-3 text-xs leading-5 text-[var(--om-muted)]">
          One brief, rewritten. &ldquo;inox&rdquo; means{" "}
          <strong className="font-semibold text-[var(--om-text)]">A4</strong>, never A2. The rule,
          not the list.
        </p>
        <p className="mt-1.5 font-mono text-sm font-bold text-[var(--om-accent)]">
          cost stays flat forever
        </p>
      </div>
    </div>
  );
}

type Slide = {
  id: string;
  icon: typeof Filter;
  eyebrow: string;
  title: string;
  lead: string[];
  note?: string;
  visual: () => React.JSX.Element;
  layout: "split" | "stacked";
};

const SLIDES: Slide[] = [
  {
    id: "shape",
    icon: Filter,
    eyebrow: "The shape of it",
    title: "The expensive part runs last.",
    lead: [
      "You liked that the first build used the model only where it earned its keep. A ten-thousand item catalog turns that from a preference into a requirement: the whole catalog in a prompt is about 907,000 tokens, so the model simply cannot be the first thing that runs.",
      "So the pipeline is a funnel. Each stage is cheaper than the one after it, and each one hands the next as little work as it can get away with. By the time anything expensive happens, almost everything has already been decided for free.",
    ],
    note: "The last stage, a person, is the most expensive of all. Which is why the whole point is to make their answer count more than once.",
    visual: FunnelVisual,
    layout: "split",
  },
  {
    id: "blocking",
    icon: Filter,
    eyebrow: "Blocking",
    title: "Narrow 10,202 down to 40, with no model at all.",
    lead: [
      "An inverted index over the catalog. The customer's words are scored against it, with rare words counting for most: \"m8x40\" appears in a handful of items and tells you almost everything, \"bolt\" appears in thousands and tells you nothing.",
      "It takes about a millisecond, costs nothing, and it is the single thing that makes a big catalog workable. The model never sees the catalog. It sees forty rows.",
    ],
    note: "The honest weakness: this matches on words. Someone writing \"Kugellager\" shares no word with \"ball bearing\", so it falls back to a slower fuzzy sweep. A small embedding model is the real fix, and it slots in exactly here.",
    visual: TokenVisual,
    layout: "split",
  },
  {
    id: "rules",
    icon: Ruler,
    eyebrow: "Deterministic rules",
    title: "Let plain code answer whatever it can.",
    lead: [
      "Part numbers, SKUs, threads, materials and standards get compared directly against those forty rows. If one candidate wins clearly, the line is finished and nothing else runs.",
      "A customer who names their own part number has not given you a hint, they have given you the answer. Reaching for a language model there would be slower, costlier and less reliable than a dictionary lookup.",
    ],
    note: "A line only escalates when the score is genuinely close. Which is exactly the situation a model is good at and code is not.",
    visual: RulesVisual,
    layout: "split",
  },
  {
    id: "model",
    icon: Brain,
    eyebrow: "The model",
    title: "The model only sees what is still ambiguous.",
    lead: [
      "Every unresolved line in the order goes into one batched call, not one call per line. A twenty-line order should not mean twenty sequential round trips.",
      "The prompt carries only the union of those lines' shortlists, so it is roughly 12,600 tokens instead of 907,000. It also carries the brief written about this customer, which is why the model stops proposing the SKU they keep overruling, rather than merely being overruled faster.",
    ],
    visual: BatchVisual,
    layout: "split",
  },
  {
    id: "human",
    icon: UserRound,
    eyebrow: "The human",
    title: "A person decides the ones that are genuinely unclear.",
    lead: [
      "\"500x hex bolt M8x40, standard\" legitimately matches fifteen SKUs in this catalog, from 0.06 to 0.27 EUR. No matcher can resolve that, however clever, because the information is not in the sentence.",
      "So the job stops being guess better and starts being ask well. Show the shortlist. Show the price, because in a grade ladder the price is the decision. Show the evidence behind each option. Make the correction one click.",
    ],
    note: "And their answer is not spent once. It is the only step that produces something new, so it is the only step worth remembering: what they pick here is what makes the AI pick better next time, for this customer, without anyone being asked twice.",
    visual: LadderVisual,
    layout: "split",
  },
  {
    id: "context",
    icon: RotateCcw,
    eyebrow: "Context engineering",
    title: "The answer is written down, not re-bought.",
    lead: [
      "The reviewer was always going to fix that bad match. The only question worth asking is whether anything was listening.",
      "So an agent reads their corrections and writes down the rule behind them. It rewrites that brief each time rather than adding to it, which is the whole trick: a correction log grows forever, a brief does not.",
    ],
    visual: ContextVisual,
    layout: "stacked",
  },
];

function stepFromParam(raw: string | null) {
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed >= SLIDES.length) {
    return 0;
  }
  return parsed;
}

export function HowItWorks() {
  const searchParams = useSearchParams();
  const stepParam = searchParams.get("step");
  const [step, setStep] = useState(() => stepFromParam(stepParam));

  useEffect(() => {
    setStep(stepFromParam(stepParam));
  }, [stepParam]);

  const slide = SLIDES[step];
  const Visual = slide.visual;
  const isFirst = step === 0;
  const isLast = step === SLIDES.length - 1;

  return (
    <AppShell>
      <main
        id="main"
        className="relative flex min-h-dvh w-full flex-col px-[5vw] py-8 text-[var(--om-text)]"
      >
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(1000px_460px_at_60%_12%,rgba(var(--om-accent-rgb),0.08),transparent_62%),var(--om-bg)]" />

        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--om-subtle)]">
            Step {step + 1} of {SLIDES.length}
          </span>
          <div className="flex items-center gap-1.5">
            {SLIDES.map((item, index) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Go to step ${index + 1}`}
                aria-current={index === step ? "step" : undefined}
                onClick={() => setStep(index)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  index === step
                    ? "w-6 bg-[var(--om-accent)]"
                    : "w-1.5 bg-[var(--om-border-strong)] hover:bg-[var(--om-muted)]",
                )}
              />
            ))}
          </div>
        </div>

        {/* A stacked slide gives the prose the full width and drops the visual
            underneath it. Squeezing a long argument into a half-width column
            beside a small card wasted most of the screen and made the text
            harder to read than the diagram it was explaining. */}
        <div className="flex flex-1 items-center py-6">
          <section
            key={slide.id}
            className={cn(
              "w-full min-w-0 [animation:reveal-item_400ms_ease-out] motion-reduce:animate-none",
              slide.layout === "stacked"
                ? "flex flex-col gap-8"
                : "grid items-center gap-8 lg:grid-cols-2 lg:gap-14",
            )}
          >
            <div className="flex min-w-0 flex-col">
              <p className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.2em] text-[var(--om-accent)]">
                <BrandMark className="size-4" />
                {slide.eyebrow}
              </p>
              <h1 className="mt-4 text-[clamp(1.5rem,2.6vw,2.3rem)] font-extrabold leading-[1.16] text-[var(--om-text)]">
                {slide.title}
              </h1>
              {/* CSS columns rather than a grid: a grid puts one paragraph per
                  cell, so a short first paragraph leaves a hole beside it.
                  Columns flow and balance the text, which is what you actually
                  want when prose runs the full width. */}
              <div
                className={
                  slide.layout === "stacked"
                    ? "mt-2 lg:columns-2 lg:gap-12 [&>p]:break-inside-avoid"
                    : undefined
                }
              >
                {slide.lead.map((paragraph) => (
                  <p
                    key={paragraph.slice(0, 24)}
                    className="mt-4 text-[clamp(0.95rem,1.1vw,1.1rem)] leading-7 text-[var(--om-muted)]"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
              {slide.note ? (
                <p className="mt-5 border-l-2 border-[var(--om-accent)] pl-4 text-sm leading-6 text-[var(--om-muted)]">
                  {slide.note}
                </p>
              ) : null}
            </div>

            <div className="min-w-0">
              <Visual />
            </div>
          </section>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-[var(--om-border)] pt-5">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep((current) => Math.max(0, current - 1))}
            disabled={isFirst}
            className="border-[var(--om-border)] bg-[var(--om-surface)] text-[var(--om-muted)] hover:text-[var(--om-text)] disabled:opacity-40"
          >
            <ArrowLeft aria-hidden="true" />
            Back
          </Button>

          {isLast ? (
            <Button
              asChild
              className="bg-[var(--om-accent)] text-[var(--om-accent-text)] hover:bg-[var(--om-accent-hover)]"
            >
              <TransitionLink href="/prototype/customers">
                See it remember
                <ArrowRight aria-hidden="true" />
              </TransitionLink>
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => setStep((current) => Math.min(SLIDES.length - 1, current + 1))}
              className="bg-[var(--om-accent)] text-[var(--om-accent-text)] hover:bg-[var(--om-accent-hover)]"
            >
              Next
              <ArrowRight aria-hidden="true" />
            </Button>
          )}
        </footer>
      </main>
    </AppShell>
  );
}
