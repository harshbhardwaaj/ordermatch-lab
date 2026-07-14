"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, Sparkles, Trash2, Users } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchCustomerMemory, fetchCustomers, forgetCorrection } from "@/lib/api";
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

function CustomerList({
  customers,
  selectedKey,
  onSelect,
}: {
  customers: CustomerMemorySummary[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
}) {
  return (
    <aside className="w-full shrink-0 md:w-72">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--om-muted)]">
        <Users className="size-3.5" />
        Customers
      </p>
      <div className="mt-2 flex flex-col gap-1.5">
        {customers.map((customer) => (
          <button
            key={customer.customerKey}
            type="button"
            onClick={() => onSelect(customer.customerKey)}
            className={cn(
              "rounded-md border px-3 py-2 text-left transition-colors",
              customer.customerKey === selectedKey
                ? "border-[var(--om-accent)] bg-[var(--om-accent-softer)]"
                : "border-[var(--om-border)] bg-[var(--om-surface)] hover:border-[var(--om-accent)]",
            )}
          >
            <p className="truncate text-sm font-semibold text-[var(--om-text)]">
              {customer.customerName}
            </p>
            <p className="mt-0.5 text-xs text-[var(--om-muted)]">
              {customer.corrections} correction{customer.corrections === 1 ? "" : "s"} ·{" "}
              {customer.totalDecisions} decision{customer.totalDecisions === 1 ? "" : "s"}
            </p>
          </button>
        ))}
      </div>
    </aside>
  );
}

/** The lessons the matcher actually reads back before it ranks anything.
 * Shown separately from the raw history because they are different things:
 * history is what happened, this is what the system concluded from it. */
function LearnedRules({ memory }: { memory: CustomerMemory }) {
  if (memory.learnedRules.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-[var(--om-border-strong)] p-3 text-xs text-[var(--om-muted)]">
        Nothing learned yet. Correct a match on one of this customer&apos;s orders and the rule
        will appear here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {memory.learnedRules.map((rule) => (
        <div
          key={`${rule.normalizedRequest}-${rule.sku}`}
          className="rounded-md border border-[var(--om-border)] bg-[var(--om-surface)] p-3"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 flex-1 text-xs text-[var(--om-muted)]">
              When they write{" "}
              <span className="font-medium text-[var(--om-text)]">
                &ldquo;{rule.normalizedRequest}&rdquo;
              </span>
            </p>
            {rule.pinned ? (
              <span className="flex shrink-0 items-center gap-1 rounded-full border border-[var(--om-accent)] bg-[var(--om-accent-softer)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--om-accent)]">
                <Sparkles className="size-2.5" />
                Pinned
              </span>
            ) : null}
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-sm">
            <ArrowRight className="size-3.5 shrink-0 text-[var(--om-muted)]" />
            <span className="font-mono text-xs font-semibold text-[var(--om-text)]">{rule.sku}</span>
          </p>
          <p className="mt-1 text-xs text-[var(--om-subtle)]">
            chosen {rule.timesChosen}× · rejected {rule.timesRejected}×
          </p>
        </div>
      ))}
    </div>
  );
}

function History({
  memory,
  onForget,
  forgettingId,
}: {
  memory: CustomerMemory;
  onForget: (correctionId: string) => void;
  forgettingId: string | null;
}) {
  if (memory.history.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-[var(--om-border-strong)] p-3 text-xs text-[var(--om-muted)]">
        No decisions logged for this customer yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {memory.history.map((entry) => (
        <div
          key={entry.id}
          className={cn(
            "rounded-md border p-3",
            entry.wasCorrection
              ? "border-amber-300 bg-amber-50/40"
              : "border-[var(--om-border)] bg-[var(--om-surface)]",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-[var(--om-muted)]">
                {entry.orderNumber ? `${entry.orderNumber} · ` : ""}
                {formatDate(entry.createdAt)}
              </p>
              <p className="mt-0.5 truncate text-sm font-medium text-[var(--om-text)]">
                &ldquo;{entry.requestText}&rdquo;
              </p>
            </div>
            <button
              type="button"
              onClick={() => onForget(entry.id)}
              disabled={forgettingId === entry.id}
              title="Forget this lesson"
              className="shrink-0 rounded-md border border-[var(--om-border)] p-1.5 text-[var(--om-muted)] transition-colors hover:border-red-300 hover:text-red-600 disabled:opacity-40"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>

          {entry.wasCorrection ? (
            <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
              <AlertTriangle className="size-3 shrink-0 text-amber-600" />
              <span className="text-[var(--om-muted)]">AI said</span>
              <span className="font-mono text-[var(--om-text)] line-through">
                {entry.suggestedSku || "—"}
              </span>
              <ArrowRight className="size-3 shrink-0 text-[var(--om-muted)]" />
              <span className="text-[var(--om-muted)]">human chose</span>
              <span className="font-mono font-semibold text-[var(--om-text)]">
                {entry.chosenSku || entry.customLabel || "—"}
              </span>
              {entry.chosenRank ? (
                <span className="text-[var(--om-subtle)]">(was ranked #{entry.chosenRank})</span>
              ) : null}
            </p>
          ) : (
            <p className="mt-2 text-xs text-[var(--om-muted)]">
              Confirmed the AI&apos;s top pick:{" "}
              <span className="font-mono text-[var(--om-text)]">{entry.chosenSku || "—"}</span>
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

export function CustomerMemoryView() {
  const [customers, setCustomers] = useState<CustomerMemorySummary[] | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [memory, setMemory] = useState<CustomerMemory | null>(null);
  const [forgettingId, setForgettingId] = useState<string | null>(null);

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

  async function handleForget(correctionId: string) {
    if (!selectedKey) return;
    setForgettingId(correctionId);
    await forgetCorrection(selectedKey, correctionId);
    const [refreshed, refreshedCustomers] = await Promise.all([
      fetchCustomerMemory(selectedKey),
      fetchCustomers(),
    ]);
    setMemory(refreshed);
    setCustomers(refreshedCustomers);
    setForgettingId(null);
  }

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-bold text-[var(--om-text)]">What the matcher has learned</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--om-muted)]">
          Every match decision a reviewer makes is remembered against that customer. The next order
          from them is ranked with it — the same wording gets the SKU they picked last time, not the
          one the AI guessed. Memory is per customer on purpose: &ldquo;M8 bolt, standard&rdquo;
          means a different grade to different buyers.
        </p>

        {customers === null ? (
          <Skeleton className="mt-6 h-64 w-full" />
        ) : customers.length === 0 ? (
          <p className="mt-6 rounded-md border border-dashed border-[var(--om-border-strong)] p-6 text-center text-sm text-[var(--om-muted)]">
            Nothing learned yet. Resolve a flagged line on any order and it shows up here.
          </p>
        ) : (
          <div className="mt-6 flex flex-col gap-6 md:flex-row">
            <CustomerList
              customers={customers}
              selectedKey={selectedKey}
              onSelect={setSelectedKey}
            />

            <div className="min-w-0 flex-1">
              {memory === null ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h2 className="text-lg font-bold text-[var(--om-text)]">
                      {memory.customerName}
                    </h2>
                    <p className="text-xs text-[var(--om-muted)]">
                      {memory.corrections} of {memory.totalDecisions} decisions overruled the AI
                    </p>
                  </div>

                  <section className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--om-muted)]">
                      Learned rules — what the matcher reads back
                    </p>
                    <div className="mt-2">
                      <LearnedRules memory={memory} />
                    </div>
                  </section>

                  <section className="mt-6">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--om-muted)]">
                      Decision history — what actually happened
                    </p>
                    <div className="mt-2">
                      <History
                        memory={memory}
                        onForget={handleForget}
                        forgettingId={forgettingId}
                      />
                    </div>
                  </section>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}
