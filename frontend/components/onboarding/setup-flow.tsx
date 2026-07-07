"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Database,
  FileSpreadsheet,
  Loader2,
  Server,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { LabeledRangeSlider } from "@/components/ui/labeled-range-slider";
import { TransitionLink } from "@/components/view-transition-link";
import { catalogItems } from "@/data/catalog";
import {
  fetchSetupConfiguration,
  updateSetupConfiguration,
  type SetupConfiguration,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { useSlowLoad } from "@/lib/use-slow-load";

const SAVE_DEBOUNCE_MS = 500;

type SaveStatus = "idle" | "saving" | "saved" | "error";

type SetupPanelProps = {
  autoApproveThreshold: number;
  onAutoApproveThresholdChange: (value: number) => void;
  priceFlagThreshold: number;
  onPriceFlagThresholdChange: (value: number) => void;
  ruleToggles: Record<string, boolean>;
  onRuleToggleChange: (id: string, value: boolean) => void;
  baselineRan: boolean;
  onBaselineRanChange: (value: boolean) => void;
  saveStatus: SaveStatus;
};

/* Step 1: connect catalog ------------------------------------------ */

const CATALOG_SOURCES = [
  { id: "spreadsheet", label: "Spreadsheet export", icon: FileSpreadsheet, note: "CSV or Excel" },
  { id: "erp", label: "ERP feed", icon: Server, note: "SAP, Dynamics, NetSuite" },
  { id: "database", label: "Product database", icon: Database, note: "Direct connection" },
];

function ConnectCatalogPanel() {
  const [selected, setSelected] = useState("spreadsheet");

  return (
    <div className="flex flex-col gap-3">
      {CATALOG_SOURCES.map((source) => {
        const Icon = source.icon;
        const active = selected === source.id;
        return (
          <button
            key={source.id}
            type="button"
            onClick={() => setSelected(source.id)}
            className={cn(
              "flex items-center gap-3 rounded-xl border p-4 text-left transition-colors",
              active
                ? "border-[var(--om-accent)] bg-[var(--om-accent-softer)]"
                : "border-[var(--om-border)] bg-[var(--om-surface)] hover:border-[var(--om-border-strong)]",
            )}
          >
            <Icon
              aria-hidden="true"
              className={cn("size-5 shrink-0", active ? "text-[var(--om-accent)]" : "text-[var(--om-muted)]")}
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-[var(--om-text)]">{source.label}</span>
              <span className="block text-xs text-[var(--om-muted)]">{source.note}</span>
            </span>
            {active ? <Check aria-hidden="true" className="ml-auto size-4 shrink-0 text-[var(--om-accent)]" /> : null}
          </button>
        );
      })}
      <div className="flex items-center gap-2 rounded-lg border border-[rgba(var(--om-success-rgb),0.35)] bg-[rgba(var(--om-success-rgb),0.06)] px-4 py-3 text-sm">
        <Check aria-hidden="true" className="size-4 shrink-0 text-[var(--om-success)]" />
        <span className="text-[var(--om-text)]">
          Sample catalog loaded. {catalogItems.length} items ready to match.
        </span>
      </div>
    </div>
  );
}

/* Step 2: map fields ----------------------------------------------- */

const FIELD_MAP = [
  { from: "Art.-Nr.", to: "SKU" },
  { from: "Bezeichnung", to: "Product name" },
  { from: "Menge", to: "Quantity" },
  { from: "Einheit", to: "Unit" },
  { from: "Preis", to: "Unit price" },
];

function MapFieldsPanel() {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--om-border)]">
      {FIELD_MAP.map((row, index) => (
        <div
          key={row.from}
          className={cn(
            "grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3 text-sm",
            index % 2 === 0 ? "bg-[var(--om-surface)]" : "bg-[var(--om-surface-2)]",
          )}
        >
          <span className="truncate font-mono text-[var(--om-muted)]">{row.from}</span>
          <ArrowRight aria-hidden="true" className="size-4 text-[var(--om-subtle)]" />
          <span className="flex items-center justify-between gap-2 truncate font-semibold text-[var(--om-text)]">
            {row.to}
            <Check aria-hidden="true" className="size-3.5 shrink-0 text-[var(--om-success)]" />
          </span>
        </div>
      ))}
    </div>
  );
}

/* Step 3: customer names ------------------------------------------- */

const ALIASES = [
  { alias: "KL-6205", meaning: "Deep groove ball bearing 6205-2RS C3" },
  { alias: "Kugellager", meaning: "Ball bearing (product family)" },
  { alias: "M8er", meaning: "Hex bolt M8" },
  { alias: "same as last time", meaning: "Look up the customer's previous order" },
];

function AliasesPanel() {
  return (
    <div className="flex flex-col gap-2">
      {ALIASES.map((row) => (
        <div
          key={row.alias}
          className="flex items-center gap-3 rounded-lg border border-[var(--om-border)] bg-[var(--om-surface)] px-4 py-3 text-sm"
        >
          <span className="shrink-0 rounded-md bg-[var(--om-surface-3)] px-2 py-1 font-mono text-xs font-semibold text-[var(--om-text)]">
            {row.alias}
          </span>
          <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-[var(--om-subtle)]" />
          <span className="min-w-0 truncate text-[var(--om-muted)]">{row.meaning}</span>
        </div>
      ))}
    </div>
  );
}

/* Step 4: rules and thresholds ------------------------------------- */

const RULE_TOGGLES = [
  { id: "discontinued", label: "Always stop discontinued items", defaultOn: true },
  { id: "noncatalog", label: "Always review items not in the catalog", defaultOn: true },
  { id: "duplicate", label: "Flag duplicate lines on one order", defaultOn: true },
];

function RulesPanel({
  autoApproveThreshold,
  onAutoApproveThresholdChange,
  priceFlagThreshold,
  onPriceFlagThresholdChange,
  ruleToggles,
  onRuleToggleChange,
  saveStatus,
}: SetupPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-[var(--om-border)] bg-[var(--om-surface)] p-4">
        <LabeledRangeSlider
          id="setup-auto-approve"
          label="Auto-approve above"
          min={60}
          max={99}
          value={autoApproveThreshold}
          onChange={onAutoApproveThresholdChange}
        />
        <div className="mt-4">
          <LabeledRangeSlider
            id="setup-price-flag"
            label="Flag price below catalog by"
            min={5}
            max={40}
            value={priceFlagThreshold}
            onChange={onPriceFlagThresholdChange}
          />
        </div>
      </div>

      <p
        aria-live="polite"
        className="text-xs font-medium text-[var(--om-muted)]"
      >
        {saveStatus === "saving"
          ? "Saving..."
          : saveStatus === "saved"
            ? "Saved. These thresholds now gate real order routing."
            : saveStatus === "error"
              ? "Could not save. The backend may be offline."
              : null}
      </p>

      <div className="flex flex-col gap-2">
        {RULE_TOGGLES.map((rule) => {
          const on = ruleToggles[rule.id];
          return (
            <button
              key={rule.id}
              type="button"
              onClick={() => onRuleToggleChange(rule.id, !on)}
              className="flex items-center justify-between gap-3 rounded-lg border border-[var(--om-border)] bg-[var(--om-surface)] px-4 py-3 text-left text-sm"
            >
              <span className="text-[var(--om-text)]">{rule.label}</span>
              <span
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
                  on ? "bg-[var(--om-accent)]" : "bg-[var(--om-border-strong)]",
                )}
              >
                <span
                  className={cn(
                    "inline-block size-4 rounded-full bg-white transition-transform",
                    on ? "translate-x-4" : "translate-x-0.5",
                  )}
                />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* Step 5: baseline check ------------------------------------------- */

const BASELINE_CHECKS = [
  "Extraction read every field on the labeled sample orders.",
  "Known ambiguous lines were correctly held for review.",
  "No confident wrong matches on the sample set.",
  "Non-catalog hose assembly was routed to a person, not guessed.",
];

function BaselinePanel({ baselineRan, onBaselineRanChange }: SetupPanelProps) {
  const [running, setRunning] = useState(false);

  if (!baselineRan) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-[var(--om-border-strong)] bg-[var(--om-surface)] p-6">
        <p className="text-sm text-[var(--om-muted)]">
          Run the system against the labeled sample orders and check the results against the known
          answers.
        </p>
        <Button
          type="button"
          disabled={running}
          onClick={() => {
            setRunning(true);
            setTimeout(() => onBaselineRanChange(true), 600);
          }}
          className="bg-[var(--om-accent)] text-[var(--om-accent-text)] hover:bg-[var(--om-accent-hover)]"
        >
          {running ? "Running benchmark..." : "Run sample benchmark"}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--om-border)] bg-[var(--om-surface)] p-4 [animation:reveal-item_360ms_ease-out] motion-reduce:animate-none">
      <p className="mb-3 text-sm font-semibold text-[var(--om-text)]">Sample benchmark complete</p>
      <ul className="flex flex-col gap-2">
        {BASELINE_CHECKS.map((check) => (
          <li key={check} className="flex items-start gap-2 text-sm text-[var(--om-muted)]">
            <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[var(--om-success)]" />
            {check}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-[var(--om-muted)]">
        The point of the baseline is safety, not a headline score. It proves the system stops when it
        should before anyone trusts it.
      </p>
    </div>
  );
}

/* Step 6: readiness ------------------------------------------------ */

function ReadinessPanel({ autoApproveThreshold, baselineRan }: SetupPanelProps) {
  const items = [
    { label: "Catalog connected", detail: `${catalogItems.length} items`, complete: true },
    { label: "Fields mapped", detail: "5 fields", complete: true },
    { label: "Customer names loaded", detail: "4 aliases", complete: true },
    { label: "Rules and thresholds set", detail: `${autoApproveThreshold}% auto-approve`, complete: true },
    {
      label: baselineRan ? "Baseline check passed" : "Baseline check not run yet",
      detail: baselineRan ? "4 checks" : "go back to step 5",
      complete: baselineRan,
    },
  ];

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            "flex items-center gap-3 rounded-lg border px-4 py-3",
            item.complete
              ? "border-[var(--om-border)] bg-[var(--om-surface)]"
              : "border-amber-300 bg-amber-50",
          )}
        >
          {item.complete ? (
            <Check aria-hidden="true" className="size-4 shrink-0 text-[var(--om-success)]" />
          ) : (
            <AlertTriangle aria-hidden="true" className="size-4 shrink-0 text-amber-600" />
          )}
          <span className={cn("text-sm font-medium", item.complete ? "text-[var(--om-text)]" : "text-amber-800")}>
            {item.label}
          </span>
          <span
            className={cn(
              "ml-auto font-mono text-xs",
              item.complete ? "text-[var(--om-muted)]" : "text-amber-700",
            )}
          >
            {item.detail}
          </span>
        </div>
      ))}
    </div>
  );
}

/* Steps ------------------------------------------------------------ */

type Step = {
  title: string;
  lead: string[];
  Panel: React.ComponentType<SetupPanelProps>;
};

const STEPS: Step[] = [
  {
    title: "Connect catalog",
    lead: [
      "Point the system at the customer's product list. In a real setup this is where you connect a spreadsheet, an ERP feed, or a product database.",
      "This walkthrough uses the sample catalog. The options here just show the step, nothing uploads and nothing leaves your browser.",
    ],
    Panel: ConnectCatalogPanel,
  },
  {
    title: "Map fields",
    lead: [
      "Every customer names their columns differently. Tell the system which column is what, once, and it holds for every future order.",
    ],
    Panel: MapFieldsPanel,
  },
  {
    title: "Customer names",
    lead: [
      "Teach it how this customer talks. Their part numbers, their shorthand, their names for things. This is what turns a vague line into a real match.",
    ],
    Panel: AliasesPanel,
  },
  {
    title: "Rules and thresholds",
    lead: ["Set the guardrails. What auto-approves, and what always stops for a person."],
    Panel: RulesPanel,
  },
  {
    title: "Baseline check",
    lead: [
      "Before going live, run it against known orders where the right answer is already known. This is the baseline you measure against later.",
    ],
    Panel: BaselinePanel,
  },
  {
    title: "Ready to go live",
    lead: ["Confirm it is safe to turn on. Each step above has to be in place first."],
    Panel: ReadinessPanel,
  },
];

/* Shell ------------------------------------------------------------ */

type ConfigLoadState = "loading" | "error" | "ready";

export function SetupFlow() {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [configId, setConfigId] = useState<number | null>(null);
  const [configLoadState, setConfigLoadState] = useState<ConfigLoadState>("loading");
  const [autoApproveThreshold, setAutoApproveThreshold] = useState(85);
  const [priceFlagThreshold, setPriceFlagThreshold] = useState(15);
  const [ruleToggles, setRuleToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(RULE_TOGGLES.map((rule) => [rule.id, rule.defaultOn])),
  );
  const [baselineRan, setBaselineRan] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [retryKey, setRetryKey] = useState(0);
  const hasLoadedRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSlow = useSlowLoad(configLoadState === "loading");

  useEffect(() => {
    let cancelled = false;
    setConfigLoadState("loading");
    fetchSetupConfiguration()
      .then((config: SetupConfiguration) => {
        if (cancelled) return;
        setConfigId(config.id);
        setAutoApproveThreshold(config.autoApproveThreshold);
        setPriceFlagThreshold(config.priceFlagThreshold);
        setRuleToggles({
          discontinued: config.stopDiscontinuedItems,
          noncatalog: config.reviewNoncatalogItems,
          duplicate: config.flagDuplicateLines,
        });
        setConfigLoadState("ready");
        // Defer marking "loaded" past this render so the effect below
        // doesn't immediately re-save the values it just set.
        setTimeout(() => {
          hasLoadedRef.current = true;
        }, 0);
      })
      .catch(() => {
        if (!cancelled) setConfigLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  useEffect(() => {
    if (!hasLoadedRef.current || configId === null) {
      return;
    }
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    setSaveStatus("saving");
    saveTimeoutRef.current = setTimeout(() => {
      updateSetupConfiguration(configId, {
        autoApproveThreshold,
        priceFlagThreshold,
        stopDiscontinuedItems: ruleToggles.discontinued,
        reviewNoncatalogItems: ruleToggles.noncatalog,
        flagDuplicateLines: ruleToggles.duplicate,
      })
        .then(() => setSaveStatus("saved"))
        .catch(() => setSaveStatus("error"));
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [autoApproveThreshold, priceFlagThreshold, ruleToggles, configId]);

  const current = STEPS[step];
  const Panel = current.Panel;
  const isLast = step === STEPS.length - 1;

  const panelProps: SetupPanelProps = {
    autoApproveThreshold,
    onAutoApproveThresholdChange: setAutoApproveThreshold,
    priceFlagThreshold,
    onPriceFlagThresholdChange: setPriceFlagThreshold,
    ruleToggles,
    onRuleToggleChange: (id, value) => setRuleToggles((prev) => ({ ...prev, [id]: value })),
    baselineRan,
    onBaselineRanChange: setBaselineRan,
    saveStatus,
  };

  if (configLoadState === "loading") {
    return (
      <AppShell>
        <main
          id="main"
          className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-5 py-10 text-[var(--om-text)] sm:px-8"
        >
          <div className="h-8 w-64 animate-pulse rounded bg-[var(--om-surface-2)]" />
          <p className="mt-3 flex items-center gap-2 text-sm font-medium text-[var(--om-accent)]">
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            {isSlow
              ? "Taking longer than usual. The backend sleeps when idle and can take up to a minute to wake up."
              : "Loading setup..."}
          </p>
        </main>
      </AppShell>
    );
  }

  if (configLoadState === "error") {
    return (
      <AppShell>
        <main
          id="main"
          className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center px-5 py-10 text-[var(--om-text)] sm:px-8"
        >
          <div className="flex flex-col items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-5 text-sm text-amber-800">
            <p>Could not load setup configuration. The backend may be offline.</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRetryKey((key) => key + 1)}
              className="h-9 border-amber-300 bg-white px-4 text-xs text-amber-800 hover:bg-amber-100"
            >
              Try again
            </Button>
          </div>
        </main>
      </AppShell>
    );
  }

  if (done) {
    return (
      <AppShell>
        <main
          id="main"
          className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center px-5 py-10 text-center text-[var(--om-text)] sm:px-8"
        >
          <span className="flex size-16 items-center justify-center rounded-full border-2 border-[rgba(var(--om-success-rgb),0.45)] bg-[rgba(var(--om-success-rgb),0.08)] [animation:success-pop_500ms_cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:animate-none">
            <Check className="size-8 text-[var(--om-success)]" />
          </span>
          <h1 className="mt-5 text-2xl font-extrabold text-[var(--om-text)]">Setup is ready to go live.</h1>
          <p className="mt-2 max-w-md text-sm text-[var(--om-muted)]">
            This is the repeatable part. The same steps set up the next customer, and the next.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button asChild className="bg-[var(--om-accent)] text-[var(--om-accent-text)] hover:bg-[var(--om-accent-hover)]">
              <TransitionLink href="/prototype/start">Back to a new order</TransitionLink>
            </Button>
            <Button asChild variant="outline">
              <TransitionLink href="/thesis">See how it works</TransitionLink>
            </Button>
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main
        id="main"
        className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-8 text-[var(--om-text)] sm:px-8"
      >
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(1000px_460px_at_60%_12%,rgba(var(--om-accent-rgb),0.10),transparent_62%),var(--om-bg)]" />

        <div className="flex flex-wrap items-center gap-3">
          <p className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.2em] text-[var(--om-accent)]">
            <BrandMark className="size-4" />
            Setting up a new customer
          </p>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--om-border)] bg-[var(--om-surface)] px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--om-muted)]">
            <span className="size-1.5 rounded-full bg-[var(--om-accent)]" />
            Sample walkthrough
          </span>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-2">
          {STEPS.map((item, index) => {
            const state = index < step ? "done" : index === step ? "current" : "todo";
            return (
              <button
                key={item.title}
                type="button"
                onClick={() => setStep(index)}
                className="flex items-center gap-2"
                aria-current={state === "current" ? "step" : undefined}
              >
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full text-xs font-bold transition-colors",
                    state === "done" && "bg-[var(--om-accent)] text-[var(--om-accent-text)]",
                    state === "current" && "border-2 border-[var(--om-accent)] text-[var(--om-accent)]",
                    state === "todo" && "border border-[var(--om-border-strong)] text-[var(--om-subtle)]",
                  )}
                >
                  {state === "done" ? <Check className="size-3.5" /> : index + 1}
                </span>
                <span
                  className={cn(
                    "hidden text-xs font-semibold sm:inline",
                    state === "current" ? "text-[var(--om-text)]" : "text-[var(--om-subtle)]",
                  )}
                >
                  {item.title}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-1 items-center py-6">
          <section
            key={step}
            className="grid w-full items-center gap-8 [animation:reveal-item_400ms_ease-out] motion-reduce:animate-none lg:grid-cols-2 lg:gap-12"
          >
            <div className="flex flex-col">
              <h1 className="text-2xl font-extrabold leading-tight tracking-normal text-[var(--om-text)] sm:text-[2rem]">
                {current.title}
              </h1>
              {current.lead.map((paragraph) => (
                <p key={paragraph.slice(0, 24)} className="mt-4 text-base leading-7 text-[var(--om-muted)]">
                  {paragraph}
                </p>
              ))}
            </div>

            <div>
              <Panel {...panelProps} />
            </div>
          </section>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-[var(--om-border)] pt-5">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep((value) => Math.max(0, value - 1))}
            disabled={step === 0}
            className="border-[var(--om-border)] bg-[var(--om-surface)] text-[var(--om-muted)] hover:text-[var(--om-text)] disabled:opacity-40"
          >
            <ArrowLeft aria-hidden="true" />
            Back
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (isLast) {
                setDone(true);
              } else {
                setStep((value) => value + 1);
              }
            }}
            className="bg-[var(--om-accent)] text-[var(--om-accent-text)] hover:bg-[var(--om-accent-hover)]"
          >
            {isLast ? "Finish setup" : "Next"}
            <ArrowRight aria-hidden="true" />
          </Button>
        </footer>
      </main>
    </AppShell>
  );
}
