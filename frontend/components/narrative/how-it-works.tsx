"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, ExternalLink, Layers, Search, ShieldCheck } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { LabeledRangeSlider } from "@/components/ui/labeled-range-slider";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { TransitionLink } from "@/components/view-transition-link";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Slide: reading the order (extraction + normalization)              */
/* ------------------------------------------------------------------ */

const RAW_ORDER = `Betreff: Nachbestellung, gleiche Teile wie PO 4471

Kugellager 6205 2RS C3        40 Stk
Sechskantschraube M8x40 A2    200 Stk
Lieferung: Hamburg Werk 2`;

const EXTRACTED_FIELDS = [
  { field: "Product", value: "Deep groove ball bearing 6205-2RS C3", from: "Kugellager 6205 2RS C3" },
  { field: "Quantity", value: "40", from: "40 Stk" },
  { field: "Unit", value: "pcs", from: "Stk" },
  { field: "Product", value: "Hex bolt M8x40 A2 stainless", from: "Sechskantschraube M8x40 A2" },
  { field: "Quantity", value: "200", from: "200 Stk" },
  { field: "Deliver to", value: "Hamburg, Plant 2", from: "Hamburg Werk 2" },
];

type ExtractionView = "raw" | "structured";

const EXTRACTION_VIEWS: { id: ExtractionView; label: string }[] = [
  { id: "raw", label: "What arrives" },
  { id: "structured", label: "What the system reads" },
];

function ExtractionDemo() {
  const [view, setView] = useState<ExtractionView>("raw");
  const structured = view === "structured";

  return (
    <div className="rounded-xl border border-[var(--om-border)] bg-[var(--om-surface)] p-4 shadow-sm sm:p-5">
      <div className="mb-4">
        <SegmentedToggle options={EXTRACTION_VIEWS} value={view} onChange={setView} />
      </div>

      {!structured ? (
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-[var(--om-border)] bg-[var(--om-surface-2)] p-4 font-mono text-xs leading-6 text-[var(--om-muted)]">
          {RAW_ORDER}
        </pre>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[var(--om-border)]">
          {EXTRACTED_FIELDS.map((row, index) => (
            <div
              key={`${row.field}-${index}`}
              className={cn(
                "grid grid-cols-[7rem_1fr] gap-3 px-4 py-2.5 text-sm [animation:reveal-item_360ms_ease-out] motion-reduce:animate-none",
                index % 2 === 0 ? "bg-[var(--om-surface)]" : "bg-[var(--om-surface-2)]",
              )}
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--om-subtle)]">
                {row.field}
              </span>
              <span className="min-w-0">
                <span className="font-semibold text-[var(--om-text)]">{row.value}</span>
                <span className="ml-2 text-xs text-[var(--om-subtle)]">from &ldquo;{row.from}&rdquo;</span>
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-xs leading-5 text-[var(--om-muted)]">
        Every field is checked against a strict format before anything downstream uses it. Units and
        German get standardized by plain rules, so &ldquo;40 Stk&rdquo; becomes &ldquo;40 pcs&rdquo;.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Slide: matching (hybrid search)                                     */
/* ------------------------------------------------------------------ */

type MatchVerdict = "best" | "ok" | "wrong";

type MatchMode = "keyword" | "semantic" | "hybrid";

const MATCH_QUERY = "6205 sealed bearing, C3 clearance";

const MATCH_MODES: { id: MatchMode; label: string }[] = [
  { id: "keyword", label: "Keyword only" },
  { id: "semantic", label: "Similarity only" },
  { id: "hybrid", label: "Hybrid (both)" },
];

const MATCH_RESULTS: Record<
  MatchMode,
  { caption: string; items: { name: string; note: string; verdict: MatchVerdict }[] }
> = {
  keyword: {
    caption:
      "Finds every product with 6205 in the code, but cannot tell a sealed bearing from a shielded one. If the customer had not typed the number, it would find nothing.",
    items: [
      { name: "6205-ZZ (metal shields)", note: "Wrong seal, ranked too high", verdict: "wrong" },
      { name: "6205-2RS C3 (sealed)", note: "The right one, but buried", verdict: "ok" },
      { name: "6205 open (no seal)", note: "Same code, wrong type", verdict: "wrong" },
    ],
  },
  semantic: {
    caption: "Understands sealed and C3, but can drift to a similar product in the wrong size.",
    items: [
      { name: "6305-2RS (sealed, C3)", note: "Right type, wrong size", verdict: "wrong" },
      { name: "6205-2RS C3 (sealed)", note: "Correct, but tied with a wrong size", verdict: "ok" },
      { name: "6205-ZZ (metal shields)", note: "Close in meaning", verdict: "wrong" },
    ],
  },
  hybrid: {
    caption:
      "Exact code and meaning together. The right product is clearly on top, with the near matches kept visible as alternates.",
    items: [
      { name: "6205-2RS C3 (sealed)", note: "Exact code, sealed, C3. Top match.", verdict: "best" },
      { name: "6205-ZZ (metal shields)", note: "Same code, shown as an alternate", verdict: "ok" },
      { name: "6305-2RS (sealed)", note: "Similar type, different size", verdict: "ok" },
    ],
  },
};

function verdictStyles(verdict: MatchVerdict) {
  if (verdict === "best") {
    return "border-[rgba(var(--om-success-rgb),0.45)] bg-[rgba(var(--om-success-rgb),0.08)]";
  }
  if (verdict === "wrong") {
    return "border-amber-300/60 bg-amber-50/40 dark:bg-amber-500/5";
  }
  return "border-[var(--om-border)] bg-[var(--om-surface-2)]";
}

function MatchingDemo() {
  const [mode, setMode] = useState<MatchMode>("hybrid");
  const result = MATCH_RESULTS[mode];

  return (
    <div className="rounded-xl border border-[var(--om-border)] bg-[var(--om-surface)] p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-2 rounded-lg border border-[var(--om-border)] bg-[var(--om-surface-2)] px-3 py-2.5">
        <Search aria-hidden="true" className="size-4 shrink-0 text-[var(--om-subtle)]" />
        <span className="font-mono text-sm text-[var(--om-text)]">{MATCH_QUERY}</span>
      </div>

      <div className="mt-4">
        <SegmentedToggle options={MATCH_MODES} value={mode} onChange={setMode} variant="accent" />
      </div>

      <div key={mode} className="mt-4 flex flex-col gap-2 [animation:reveal-item_320ms_ease-out] motion-reduce:animate-none">
        {result.items.map((item, index) => (
          <div
            key={item.name}
            className={cn(
              "flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5",
              verdictStyles(item.verdict),
            )}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--om-surface)] text-xs font-bold text-[var(--om-muted)]">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--om-text)]">{item.name}</p>
                <p className="truncate text-xs text-[var(--om-muted)]">{item.note}</p>
              </div>
            </div>
            {item.verdict === "best" ? (
              <Check aria-hidden="true" className="size-4 shrink-0 text-[var(--om-success)]" />
            ) : item.verdict === "wrong" ? (
              <AlertTriangle aria-hidden="true" className="size-4 shrink-0 text-amber-600" />
            ) : null}
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs leading-5 text-[var(--om-muted)]">{result.caption}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Slide: confidence + the human layer                                 */
/* ------------------------------------------------------------------ */

type ConfLine = {
  id: string;
  name: string;
  confidence: number;
  correct: boolean;
  flag: string | null;
};

const CONF_LINES: ConfLine[] = [
  { id: "bolt", name: "Hex bolt M8x40 A2 stainless", confidence: 96, correct: true, flag: null },
  { id: "bearing", name: "Ball bearing 6205, sealed vs shielded", confidence: 72, correct: true, flag: null },
  { id: "motor", name: "DC gear motor 24V, missing speed and quantity", confidence: 48, correct: false, flag: null },
  { id: "cable", name: "M12 sensor cable, price 28% below catalog", confidence: 82, correct: true, flag: "Price flag" },
];

function ConfidenceDemo() {
  const [threshold, setThreshold] = useState(85);

  const classified = CONF_LINES.map((line) => {
    const autoApproved = line.confidence >= threshold && line.flag === null;
    return { ...line, autoApproved };
  });

  const autoApproved = classified.filter((line) => line.autoApproved);
  const inReview = classified.filter((line) => !line.autoApproved);

  const wrongSlippedThrough = autoApproved.some((line) => !line.correct);
  const everythingInReview = autoApproved.length === 0;

  return (
    <div className="rounded-xl border border-[var(--om-border)] bg-[var(--om-surface)] p-4 shadow-sm sm:p-5">
      <LabeledRangeSlider
        id="conf-threshold"
        label="Review threshold"
        min={40}
        max={99}
        value={threshold}
        onChange={setThreshold}
      />
      <p className="mt-1 text-xs text-[var(--om-muted)]">
        Above the bar and clean, a line is auto-approved. Below it, or carrying a risk flag, it goes
        to a person.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-[rgba(var(--om-success-rgb),0.35)] bg-[rgba(var(--om-success-rgb),0.06)] p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--om-success)]">
            Auto-approved ({autoApproved.length})
          </p>
          <div className="flex flex-col gap-1.5">
            {autoApproved.length === 0 ? (
              <p className="text-xs text-[var(--om-muted)]">Nothing. Every line waits on a person.</p>
            ) : (
              autoApproved.map((line) => (
                <div key={line.id} className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-[var(--om-subtle)]">{line.confidence}%</span>
                  <span className={cn("truncate", line.correct ? "text-[var(--om-text)]" : "font-semibold text-amber-700")}>
                    {line.name}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-[var(--om-border)] bg-[var(--om-surface-2)] p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--om-muted)]">
            Sent to review ({inReview.length})
          </p>
          <div className="flex flex-col gap-1.5">
            {inReview.map((line) => (
              <div key={line.id} className="flex items-center gap-2 text-xs">
                <span className="font-mono text-[var(--om-subtle)]">{line.confidence}%</span>
                <span className="truncate text-[var(--om-text)]">{line.name}</span>
                {line.flag ? (
                  <span className="shrink-0 rounded border border-amber-300 px-1 text-[10px] font-semibold text-amber-700">
                    {line.flag}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      {wrongSlippedThrough ? (
        <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs font-medium text-amber-800">
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          A wrong match just auto-approved. That is what setting the bar too low costs.
        </p>
      ) : everythingInReview ? (
        <p className="mt-3 flex items-start gap-2 rounded-lg border border-[var(--om-border)] bg-[var(--om-surface-2)] p-3 text-xs font-medium text-[var(--om-muted)]">
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          Everything now needs a person. Set the bar this high and the team drowns, then starts
          rubber-stamping.
        </p>
      ) : (
        <p className="mt-3 text-xs leading-5 text-[var(--om-muted)]">
          Notice the price-flagged cable. It has decent confidence but still goes to review, because
          a risk flag overrides the score. One number is not enough on its own.
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Slide: evals over time                                              */
/* ------------------------------------------------------------------ */

type EvalPattern = "bearing" | "unit" | "price";

const EVAL_RUNS: { id: number; ok: boolean; pattern: EvalPattern }[] = [
  { id: 1, ok: true, pattern: "bearing" },
  { id: 2, ok: false, pattern: "bearing" },
  { id: 3, ok: true, pattern: "price" },
  { id: 4, ok: false, pattern: "unit" },
  { id: 5, ok: true, pattern: "bearing" },
  { id: 6, ok: false, pattern: "bearing" },
  { id: 7, ok: true, pattern: "price" },
  { id: 8, ok: false, pattern: "price" },
  { id: 9, ok: true, pattern: "unit" },
  { id: 10, ok: false, pattern: "unit" },
  { id: 11, ok: true, pattern: "bearing" },
  { id: 12, ok: false, pattern: "bearing" },
];

const EVAL_PATTERN_LABELS: Record<EvalPattern, string> = {
  bearing: "Near-neighbor bearing picks",
  unit: "Missing unit on motor lines",
  price: "Price below catalog",
};

type EvalsView = "every-run" | "grouped";

const EVALS_VIEWS: { id: EvalsView; label: string }[] = [
  { id: "every-run", label: "Every run" },
  { id: "grouped", label: "Grouped into patterns" },
];

function EvalsDemo() {
  const [view, setView] = useState<EvalsView>("every-run");
  const grouped = view === "grouped";

  const failing = EVAL_RUNS.filter((run) => !run.ok);
  const patternCounts = (Object.keys(EVAL_PATTERN_LABELS) as EvalPattern[]).map((pattern) => ({
    pattern,
    count: failing.filter((run) => run.pattern === pattern).length,
  }));

  return (
    <div className="rounded-xl border border-[var(--om-border)] bg-[var(--om-surface)] p-4 shadow-sm sm:p-5">
      <div className="mb-4">
        <SegmentedToggle options={EVALS_VIEWS} value={view} onChange={setView} />
      </div>

      {!grouped ? (
        <div>
          <div className="grid grid-cols-6 gap-2">
            {EVAL_RUNS.map((run) => (
              <div
                key={run.id}
                title={`Run ${run.id}: ${run.ok ? "pass" : "fail"}`}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-md border text-xs font-semibold",
                  run.ok
                    ? "border-[rgba(var(--om-success-rgb),0.35)] bg-[rgba(var(--om-success-rgb),0.08)] text-[var(--om-success)]"
                    : "border-amber-300 bg-amber-50 text-amber-700",
                )}
              >
                {run.ok ? <Check className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-[var(--om-muted)]">
            One tile per run. At real volume this is thousands of them. Reading each one does not
            scale, and the pattern is hard to see.
          </p>
        </div>
      ) : (
        <div>
          <div className="flex flex-col gap-2 [animation:reveal-item_320ms_ease-out] motion-reduce:animate-none">
            {patternCounts.map((row) => (
              <div
                key={row.pattern}
                className="flex items-center justify-between rounded-lg border border-[var(--om-border)] bg-[var(--om-surface-2)] px-3 py-2.5"
              >
                <span className="text-sm font-semibold text-[var(--om-text)]">
                  {EVAL_PATTERN_LABELS[row.pattern]}
                </span>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700">
                  {row.count} runs
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-[var(--om-muted)]">
            The same failures collapse into a few recurring problems. Now you fix three things, not
            three thousand. This needs a real volume of runs first, so it is a later step, not day
            one.
          </p>
        </div>
      )}

      <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-[var(--om-accent)]/30 bg-[var(--om-accent-soft)] p-3">
        <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[var(--om-accent)]" />
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--om-accent)]">
            Real eval, not simulated
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--om-muted)]">
            The grouping above illustrates the method. Separately, a real eval suite runs this
            pipeline against labeled sample orders and checks the results, not just demoed once.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Slide visuals without their own interaction                         */
/* ------------------------------------------------------------------ */

function EngineVisual() {
  return (
    <div className="rounded-xl border border-[var(--om-border)] bg-[var(--om-surface-2)] p-5 text-sm leading-6 text-[var(--om-muted)]">
      <p className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--om-subtle)]">
        The five steps
      </p>
      <ol className="flex flex-col gap-2">
        {[
          "Read the order.",
          "Match each line to a product.",
          "Decide what needs a person.",
          "Keep it honest over time.",
          "Set it up for a new customer.",
        ].map((item, index) => (
          <li key={item} className="flex items-center gap-3 text-[var(--om-text)]">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--om-accent-soft)] text-xs font-bold text-[var(--om-accent)]">
              {index + 1}
            </span>
            {item}
          </li>
        ))}
      </ol>
    </div>
  );
}

function RealVisual() {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-[var(--om-border)] bg-[var(--om-surface)] p-4 shadow-sm sm:p-5">
        <p className="text-sm font-semibold text-[var(--om-text)]">Walk through the setup steps</p>
        <p className="mt-1 text-sm text-[var(--om-muted)]">
          Connect a catalog, map fields, teach it customer-specific names, set the rules, and check
          it is ready before going live.
        </p>
        <Button
          asChild
          className="mt-4 bg-[var(--om-accent)] text-[var(--om-accent-text)] hover:bg-[var(--om-accent-hover)]"
        >
          <TransitionLink href="/prototype/setup">
            Open setup
            <ArrowRight aria-hidden="true" />
          </TransitionLink>
        </Button>
      </div>
      <div className="rounded-xl border border-[var(--om-border)] bg-[var(--om-surface-2)] p-4">
        <p className="text-sm font-semibold text-[var(--om-text)]">Real ERP write-back is per customer</p>
        <p className="mt-1 text-xs leading-5 text-[var(--om-muted)]">
          SAP, Dynamics, and NetSuite all write differently. The plan is to prove matching on one
          real catalog, land a pilot, integrate deeply with their ERP, then generalize.
        </p>
      </div>
      <div className="rounded-xl border border-[var(--om-border)] bg-[var(--om-surface-2)] p-4">
        <p className="text-sm font-semibold text-[var(--om-text)]">Failure handling is designed, not faked</p>
        <p className="mt-1 text-xs leading-5 text-[var(--om-muted)]">
          A preview that will not load, a matching service that is down, stale data. These get real
          fallbacks once there is a backend that can actually fail.
        </p>
      </div>
    </div>
  );
}

const SOURCES = [
  {
    label: "Xu et al., Large Language Models for Generative Information Extraction: A Survey (2023)",
    backs: "Reading the order",
    href: "https://arxiv.org/abs/2312.17617",
  },
  {
    label: "Ubrangala et al., Searching, fast and slow, through product catalogs (2024)",
    backs: "Matching, SKU catalog search",
    href: "https://arxiv.org/abs/2401.00737",
  },
  {
    label: "Guo et al., On Calibration of Modern Neural Networks (ICML 2017)",
    backs: "Confidence, a model can be confidently wrong",
    href: "https://arxiv.org/abs/1706.04599",
  },
  {
    label: "Geifman and El-Yaniv, Selective Classification for Deep Neural Networks (NeurIPS 2017)",
    backs: "The human layer, abstaining when unsure",
    href: "https://arxiv.org/abs/1705.08500",
  },
  {
    label: "Grootendorst, BERTopic: Neural topic modeling with a class-based TF-IDF procedure (2022)",
    backs: "Evals, grouping failures into patterns",
    href: "https://arxiv.org/abs/2203.05794",
  },
  {
    label: "OpenAI Cookbook, Macro Evals for Agentic Systems, runnable notebook on GitHub",
    backs: "Evals, the applied worked example",
    href: "https://github.com/openai/openai-cookbook/blob/main/examples/partners/macro_evals_for_agentic_systems/macro_evals_for_agentic_systems.ipynb",
  },
];

function SourcesVisual() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {SOURCES.map((source) => (
        <li key={source.href}>
          <a
            href={source.href}
            target="_blank"
            rel="noreferrer"
            className="flex h-full items-start gap-3 rounded-lg border border-[var(--om-border)] bg-[var(--om-surface)] px-4 py-3 transition-colors hover:border-[var(--om-border-strong)]"
          >
            <Layers aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[var(--om-accent)]" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-[var(--om-text)]">{source.label}</span>
              <span className="mt-0.5 block text-xs text-[var(--om-subtle)]">Backs: {source.backs}</span>
            </span>
            <ExternalLink aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-[var(--om-subtle)]" />
          </a>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Slides                                                              */
/* ------------------------------------------------------------------ */

type Slide = {
  id: string;
  eyebrow: string;
  title: string;
  lead: string[];
  note?: string;
  visual: React.ComponentType;
  layout?: "split" | "stacked";
};

const SLIDES: Slide[] = [
  {
    id: "engine",
    eyebrow: "How it works",
    title: "You used the front of this. Here is the engine behind it.",
    lead: [
      "The prototype reads a messy order and gets it ready for the ERP. On screen that looks simple. Making it reliable on real orders, at real volume, is the actual work.",
      "The next few screens walk through the parts that matter. For each one, there is a real company already running it in production, so this is not a guess about what could work.",
    ],
    visual: EngineVisual,
  },
  {
    id: "reading",
    eyebrow: "Reading the order",
    title: "First, read the order the way a person would.",
    lead: [
      "Orders arrive as email text, PDFs, spreadsheets, sometimes a photo. The job is to turn that into clean fields: product, quantity, unit, delivery. A language model is good at pulling those out of free text. Nothing it produces is trusted raw.",
    ],
    note: "Conexiom reads orders from PDF, Excel, email, and even handwritten notes. Rossum and Nanonets do the same, and send anything they are unsure about to a person.",
    visual: ExtractionDemo,
  },
  {
    id: "matching",
    eyebrow: "Matching",
    title: "Match each line to the right product, without guessing.",
    lead: [
      "This is the hard part, and the place people assume you throw everything at an AI. You do not. Good matching runs two searches and combines them: exact search for codes and part numbers, similarity search for items a customer described in their own words.",
    ],
    note: "Combining both is called hybrid search, and it is the production default across the main search engines. The AI's real job here is not brute-forcing every match. It is explaining why a line is unclear, so a person knows what to check.",
    visual: MatchingDemo,
  },
  {
    id: "trust",
    eyebrow: "Knowing when to trust it",
    title: "Decide what is safe to auto-approve, and what needs a person.",
    lead: [
      "A match comes with a confidence score, but a score alone is not enough. A model can be confident and wrong. So the system uses two signals: is this a clean match, and does this line carry a red flag. Drag the bar and watch what moves.",
    ],
    note: "Conexiom ships exactly this as three modes: Co-Pilot, where a person reviews flagged issues, Dynamic, where automation scales to how confident it is, and Autopilot, fully automated. A person can act on a flag because every match shows its reasons, the same panel you saw in the prototype.",
    visual: ConfidenceDemo,
  },
  {
    id: "keeps-working",
    eyebrow: "Keeping it honest",
    title: "Prove it keeps working, not just that it worked once.",
    lead: [
      "Two things keep an order safe. Before it can be sent, a readiness gate blocks it while any line is unresolved. You saw this as the greyed-out Send to ERP button. After launch, you watch quality over time by grouping failures into a few recurring patterns instead of reading every run.",
    ],
    note: "This grouping approach is the macro-evals method from OpenAI's cookbook. It is honest about its limits: it needs a real population of runs before patterns mean anything, and a pattern is a place to look, not automatically a defect.",
    visual: EvalsDemo,
  },
  {
    id: "real",
    eyebrow: "Making it real",
    title: "Setting this up for a real customer.",
    lead: [
      "Everything so far ran on one sample catalog. To run on a real customer's products, you connect their catalog first. That is the real first step of onboarding, not a checkbox.",
    ],
    visual: RealVisual,
  },
  {
    id: "sources",
    eyebrow: "References",
    title: "Where this is grounded.",
    lead: [
      "Every method here comes from published research, not opinion. Each one below is linked to the step it backs.",
    ],
    visual: SourcesVisual,
    layout: "stacked",
  },
];

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */

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
        className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-8 text-[var(--om-text)] sm:px-8"
      >
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(1000px_460px_at_60%_12%,rgba(var(--om-accent-rgb),0.10),transparent_62%),var(--om-bg)]" />

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

        <div className="flex flex-1 items-center py-6">
          {slide.layout === "stacked" ? (
            <section
              key={slide.id}
              className="flex w-full flex-col [animation:reveal-item_400ms_ease-out] motion-reduce:animate-none"
            >
              <p className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.2em] text-[var(--om-accent)]">
                <BrandMark className="size-4" />
                {slide.eyebrow}
              </p>
              <h1 className="mt-4 text-2xl font-extrabold leading-tight tracking-normal text-[var(--om-text)] sm:text-[2rem]">
                {slide.title}
              </h1>
              {slide.lead.map((paragraph) => (
                <p key={paragraph.slice(0, 24)} className="mt-4 max-w-none text-base leading-7 text-[var(--om-muted)]">
                  {paragraph}
                </p>
              ))}
              {slide.note ? (
                <p className="mt-5 max-w-none border-l-2 border-[var(--om-accent-soft)] pl-4 text-sm leading-6 text-[var(--om-muted)]">
                  {slide.note}
                </p>
              ) : null}

              <div className="mt-8">
                <Visual />
              </div>
            </section>
          ) : (
            <section
              key={slide.id}
              className="grid w-full min-w-0 items-center gap-8 [animation:reveal-item_400ms_ease-out] motion-reduce:animate-none lg:grid-cols-2 lg:gap-12"
            >
              <div className="flex min-w-0 flex-col">
                <p className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.2em] text-[var(--om-accent)]">
                  <BrandMark className="size-4" />
                  {slide.eyebrow}
                </p>
                <h1 className="mt-4 text-2xl font-extrabold leading-tight tracking-normal text-[var(--om-text)] sm:text-[2rem]">
                  {slide.title}
                </h1>
                {slide.lead.map((paragraph) => (
                  <p key={paragraph.slice(0, 24)} className="mt-4 text-base leading-7 text-[var(--om-muted)]">
                    {paragraph}
                  </p>
                ))}
                {slide.note ? (
                  <p className="mt-5 border-l-2 border-[var(--om-accent-soft)] pl-4 text-sm leading-6 text-[var(--om-muted)]">
                    {slide.note}
                  </p>
                ) : null}
              </div>

              <div className="min-w-0">
                <Visual />
              </div>
            </section>
          )}
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
              <TransitionLink href="/proof">
                See why me
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
