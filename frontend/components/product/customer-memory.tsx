"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  FileText,
  Pencil,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { ContextMarkdown } from "@/components/product/context-markdown";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TransitionLink } from "@/components/view-transition-link";
import {
  editCustomerContext,
  fetchCustomerMemory,
  fetchCustomers,
  forgetCorrection,
  rebuildCustomerContext,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import type { CustomerMemory, CustomerMemorySummary } from "@/types/customer";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Rough, and labelled rough. The point is the order of magnitude: this file
 * is hundreds of tokens where the raw log would be thousands and growing. */
function estimateTokens(text: string) {
  return Math.max(1, Math.round(text.length / 4));
}

/* The context file. This is the thing worth looking at, so it gets the space,
 * the file chrome, and the top-left corner. ---------------------------------- */

function ContextFileCard({
  memory,
  onRebuild,
  onSave,
  busy,
}: {
  memory: CustomerMemory;
  onRebuild: () => void;
  onSave: (content: string) => void;
  busy: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const file = memory.contextFile;
  // The brief is only rebuilt when a reviewer actually overrules the AI. A
  // confirmation is logged but teaches the brief nothing, so comparing against
  // *every* decision made the file look stale the moment you accepted a correct
  // top pick, and nagged you to rebuild something that was already current.
  const fresh = file ? file.builtFromCorrections >= memory.corrections : false;

  return (
    <section className="overflow-hidden rounded-xl border border-[var(--om-border)] bg-[var(--om-surface)]">
      {/* File chrome. It is a file, so it should look like one. */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--om-border)] bg-[var(--om-surface-2)] px-4 py-3">
        <span className="flex min-w-0 items-center gap-2">
          <FileText className="size-4 shrink-0 text-[var(--om-accent)]" />
          <span className="truncate font-mono text-xs font-semibold text-[var(--om-text)]">
            {memory.customerKey}/context.md
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-2">
          {file ? (
            <span className="font-mono text-[11px] text-[var(--om-subtle)]">
              ~{estimateTokens(file.content)} tokens
            </span>
          ) : null}
          {file?.editedByHuman ? (
            <span className="rounded-full border border-[var(--om-border-strong)] px-2 py-0.5 text-[10px] font-semibold text-[var(--om-muted)]">
              edited by you
            </span>
          ) : null}

          {editing ? (
            <>
              <button
                type="button"
                onClick={() => {
                  onSave(draft);
                  setEditing(false);
                }}
                className="flex items-center gap-1 rounded-md bg-[var(--om-accent)] px-2.5 py-1 text-xs font-semibold text-[var(--om-accent-text)] hover:bg-[var(--om-accent-hover)]"
              >
                <Check className="size-3" />
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="flex items-center gap-1 rounded-md border border-[var(--om-border)] px-2.5 py-1 text-xs font-semibold text-[var(--om-muted)] hover:text-[var(--om-text)]"
              >
                <X className="size-3" />
              </button>
            </>
          ) : (
            <>
              {file ? (
                <button
                  type="button"
                  onClick={() => {
                    setDraft(file.content);
                    setEditing(true);
                  }}
                  className="flex items-center gap-1 rounded-md border border-[var(--om-border)] px-2.5 py-1 text-xs font-semibold text-[var(--om-muted)] transition-colors hover:border-[var(--om-accent)] hover:text-[var(--om-text)]"
                >
                  <Pencil className="size-3" />
                  Edit
                </button>
              ) : null}
              <button
                type="button"
                onClick={onRebuild}
                disabled={busy}
                className="flex items-center gap-1 rounded-md border border-[var(--om-border)] px-2.5 py-1 text-xs font-semibold text-[var(--om-muted)] transition-colors hover:border-[var(--om-accent)] hover:text-[var(--om-text)] disabled:opacity-40"
              >
                <RefreshCw className={cn("size-3", busy && "animate-spin")} />
                {file ? "Rebuild" : "Write it"}
              </button>
            </>
          )}
        </span>
      </header>

      <div className="p-5">
        {editing ? (
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={16}
            className="w-full resize-y rounded-md border border-[var(--om-border)] bg-[var(--om-bg)] p-3 font-mono text-xs leading-6 text-[var(--om-text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--om-accent)]"
          />
        ) : file && file.content ? (
          <ContextMarkdown content={file.content} />
        ) : (
          <p className="py-6 text-center text-sm text-[var(--om-muted)]">
            No brief written yet. Correct a match on one of this customer&apos;s orders, or write
            it now from what they have already taught us.
          </p>
        )}
      </div>

      {file ? (
        <footer className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-[var(--om-border)] bg-[var(--om-surface-2)] px-4 py-2.5 text-xs text-[var(--om-muted)]">
          <Sparkles className="size-3 shrink-0 text-[var(--om-accent)]" />
          <span>
            Written by the {file.generatedBy === "human" ? "reviewer" : "agent"} from{" "}
            <strong className="font-semibold text-[var(--om-text)]">
              {file.builtFromCorrections}
            </strong>{" "}
            correction{file.builtFromCorrections === 1 ? "" : "s"}.
          </span>
          {!fresh ? (
            <span className="flex items-center gap-1 text-amber-700">
              <AlertTriangle className="size-3" />
              New corrections since. Rebuild to fold them in.
            </span>
          ) : null}
          <span className="ml-auto">The matcher reads this on every order.</span>
        </footer>
      ) : null}
    </section>
  );
}

/* The deterministic half: exact wording to exact SKU. -------------------- */

function LearnedRules({ memory }: { memory: CustomerMemory }) {
  // Only what the reviewer actually chose. Every SKU the AI ranked above their
  // pick is also recorded, as a rejection, so the matcher stops re-suggesting
  // it — real signal, but internal. Rendering each one as its own card meant
  // correcting a rank-8 match spat out seven near-identical "chosen 0x /
  // rejected 1x" boxes and buried the one rule that matters. They are a count
  // now, not a wall.
  const chosen = memory.learnedRules.filter((rule) => rule.timesChosen > 0);
  const demoted = memory.learnedRules.filter(
    (rule) => rule.timesChosen === 0 && rule.timesRejected > 0,
  );

  if (chosen.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-[var(--om-border-strong)] p-4 text-xs text-[var(--om-muted)]">
        Nothing pinned yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {chosen.map((rule) => (
        <div
          key={`${rule.normalizedRequest}-${rule.sku}`}
          className={cn(
            "rounded-lg border p-3",
            rule.pinned
              ? "border-[var(--om-accent)] bg-[var(--om-accent-softer)]"
              : "border-[var(--om-border)] bg-[var(--om-surface)]",
          )}
        >
          <p className="truncate text-xs text-[var(--om-muted)]">
            &ldquo;{rule.normalizedRequest}&rdquo;
          </p>
          <p className="mt-1 flex items-center gap-1.5">
            <ArrowRight className="size-3 shrink-0 text-[var(--om-accent)]" />
            <span className="truncate font-mono text-xs font-semibold text-[var(--om-text)]">
              {rule.sku}
            </span>
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-[var(--om-subtle)]">
            {rule.pinned ? "pinned" : `chosen ${rule.timesChosen}x`}
          </p>
        </div>
      ))}

      {demoted.length > 0 ? (
        <p className="px-1 text-[11px] leading-5 text-[var(--om-subtle)]">
          {demoted.length} other SKU{demoted.length === 1 ? " was" : "s were"} demoted for these
          requests, because the AI ranked {demoted.length === 1 ? "it" : "them"} above what the
          reviewer picked.
        </p>
      ) : null}
    </div>
  );
}

function History({
  memory,
  onForget,
  forgettingId,
}: {
  memory: CustomerMemory;
  onForget: (id: string) => void;
  forgettingId: string | null;
}) {
  const [showAll, setShowAll] = useState(false);

  if (memory.history.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-[var(--om-border-strong)] p-4 text-xs text-[var(--om-muted)]">
        No decisions logged yet.
      </p>
    );
  }

  // The log grows forever, which is the point of it, but an unbounded list of
  // cards is not a UI. Show the recent ones; the rest are one click away.
  const visible = showAll ? memory.history : memory.history.slice(0, 6);
  const hidden = memory.history.length - visible.length;

  return (
    <div className="flex flex-col gap-1.5">
      {visible.map((entry) => (
        <div
          key={entry.id}
          className="group rounded-lg border border-[var(--om-border)] bg-[var(--om-surface)] p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 flex-1 truncate text-xs font-medium text-[var(--om-text)]">
              &ldquo;{entry.requestText}&rdquo;
            </p>
            <button
              type="button"
              onClick={() => onForget(entry.id)}
              disabled={forgettingId === entry.id}
              title="Forget this lesson"
              className="shrink-0 rounded p-1 text-[var(--om-subtle)] opacity-0 transition-opacity hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100 disabled:opacity-40"
            >
              <Trash2 className="size-3" />
            </button>
          </div>

          {entry.wasCorrection ? (
            <p className="mt-1.5 flex flex-wrap items-center gap-1 font-mono text-[11px]">
              <span className="text-[var(--om-subtle)] line-through">
                {entry.suggestedSku || "none"}
              </span>
              <ArrowRight className="size-3 text-[var(--om-accent)]" />
              <span className="font-semibold text-[var(--om-text)]">
                {entry.chosenSku || entry.customLabel}
              </span>
            </p>
          ) : (
            <p className="mt-1.5 flex items-center gap-1 text-[11px] text-[var(--om-muted)]">
              <Check className="size-3 text-green-600" />
              AI was right
            </p>
          )}

          <p className="mt-1 text-[10px] text-[var(--om-subtle)]">
            {entry.orderNumber ? `${entry.orderNumber} · ` : ""}
            {formatDate(entry.createdAt)}
          </p>
        </div>
      ))}

      {hidden > 0 ? (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="rounded-lg border border-dashed border-[var(--om-border-strong)] px-3 py-2 text-xs font-medium text-[var(--om-muted)] transition-colors hover:border-[var(--om-accent)] hover:text-[var(--om-text)]"
        >
          Show {hidden} older decision{hidden === 1 ? "" : "s"}
        </button>
      ) : null}
    </div>
  );
}

export function CustomerMemoryView() {
  const [customers, setCustomers] = useState<CustomerMemorySummary[] | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [memory, setMemory] = useState<CustomerMemory | null>(null);
  const [forgettingId, setForgettingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchCustomers().then((rows) => {
      setCustomers(rows);
      if (rows.length > 0) setSelectedKey(rows[0].customerKey);
    });
  }, []);

  useEffect(() => {
    if (!selectedKey) return;
    setMemory(null);
    fetchCustomerMemory(selectedKey).then(setMemory);
  }, [selectedKey]);

  async function refresh() {
    if (!selectedKey) return;
    const [next, rows] = await Promise.all([fetchCustomerMemory(selectedKey), fetchCustomers()]);
    setMemory(next);
    setCustomers(rows);
  }

  async function handleRebuild() {
    if (!selectedKey) return;
    setBusy(true);
    try {
      await rebuildCustomerContext(selectedKey, true);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleSave(content: string) {
    if (!selectedKey) return;
    setBusy(true);
    try {
      await editCustomerContext(selectedKey, content);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleForget(id: string) {
    if (!selectedKey) return;
    setForgettingId(id);
    try {
      await forgetCorrection(selectedKey, id);
      await refresh();
    } finally {
      setForgettingId(null);
    }
  }

  return (
    <AppShell>
      <main id="main" className="w-full px-[4vw] py-10 text-[var(--om-text)]">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.24em] text-[var(--om-accent)]">
          The part that matters
        </p>
        <h1 className="mt-3 text-[clamp(1.6rem,3vw,2.6rem)] font-extrabold leading-[1.14]">
          The context window <span className="text-[var(--om-accent)]">is the product.</span>
        </h1>
        <p className="mt-3 text-[clamp(0.95rem,1.2vw,1.1rem)] leading-relaxed text-[var(--om-muted)]">
          Every decision a reviewer makes is logged against that customer, then an agent distills
          the log into a short brief. The matcher reads the brief on every future order. It stays
          the same size whether the customer has made three corrections or three hundred, so
          knowing them well never gets more expensive.
        </p>

        {customers === null ? (
          <Skeleton className="mt-8 h-96 w-full" />
        ) : customers.length === 0 ? (
          <p className="mt-8 rounded-xl border border-dashed border-[var(--om-border-strong)] p-10 text-center text-sm text-[var(--om-muted)]">
            Nothing learned yet. Resolve a flagged line on any order and it appears here.
          </p>
        ) : (
          <>
            {/* Customers as cards, not a sidebar list: with two of them the
                contradiction between them is the point, and a row puts them
                side by side where you can see it. */}
            <div className="mt-8 flex flex-wrap gap-3">
              {customers.map((customer) => {
                const active = customer.customerKey === selectedKey;
                return (
                  <button
                    key={customer.customerKey}
                    type="button"
                    onClick={() => setSelectedKey(customer.customerKey)}
                    className={cn(
                      "min-w-56 flex-1 rounded-xl border p-4 text-left transition-all",
                      active
                        ? "border-[var(--om-accent)] bg-[var(--om-accent-softer)] shadow-sm"
                        : "border-[var(--om-border)] bg-[var(--om-surface)] hover:border-[var(--om-border-strong)]",
                    )}
                  >
                    <p className="truncate font-semibold text-[var(--om-text)]">
                      {customer.customerName}
                    </p>
                    <p className="mt-1 flex items-baseline gap-1.5">
                      <span
                        className={cn(
                          "text-2xl font-extrabold leading-none",
                          active ? "text-[var(--om-accent)]" : "text-[var(--om-text)]",
                        )}
                      >
                        {customer.corrections}
                      </span>
                      <span className="text-xs text-[var(--om-muted)]">
                        correction{customer.corrections === 1 ? "" : "s"} taught
                      </span>
                    </p>
                  </button>
                );
              })}
            </div>

            {memory === null ? (
              <Skeleton className="mt-6 h-96 w-full" />
            ) : (
              <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                <ContextFileCard
                  memory={memory}
                  onRebuild={handleRebuild}
                  onSave={handleSave}
                  busy={busy}
                />

                <div className="flex flex-col gap-6">
                  <section>
                    <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--om-muted)]">
                      Pinned exactly
                    </h2>
                    <p className="mt-1 text-xs text-[var(--om-subtle)]">
                      Same wording, same SKU, no model call.
                    </p>
                    <div className="mt-3">
                      <LearnedRules memory={memory} />
                    </div>
                  </section>

                  <section>
                    <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--om-muted)]">
                      Decision log
                    </h2>
                    <p className="mt-1 text-xs text-[var(--om-subtle)]">
                      The raw truth. The brief is rebuilt from this.
                    </p>
                    <div className="mt-3">
                      <History
                        memory={memory}
                        onForget={handleForget}
                        forgettingId={forgettingId}
                      />
                    </div>
                  </section>
                </div>
              </div>
            )}

            {/* Somewhere to go next. Landing here from an order summary and
                hitting a dead end is the fastest way to lose a reader. */}
            <div className="mt-10 flex flex-col items-start gap-4 rounded-xl border border-[var(--om-border)] bg-[var(--om-surface)] p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-base font-bold text-[var(--om-text)]">
                  Want the engineering behind it?
                </p>
                <p className="mt-1 text-sm text-[var(--om-muted)]">
                  How 10,202 SKUs become 40, why the model runs last, and what this costs.
                </p>
              </div>
              <Button
                asChild
                size="lg"
                className="shrink-0 bg-[var(--om-accent)] px-6 text-sm text-[var(--om-accent-text)] hover:bg-[var(--om-accent-hover)]"
              >
                <TransitionLink href="/thesis">
                  See how it works
                  <ArrowRight aria-hidden="true" />
                </TransitionLink>
              </Button>
            </div>
          </>
        )}
      </main>
    </AppShell>
  );
}
