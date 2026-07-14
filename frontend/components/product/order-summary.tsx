"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { MatchPickList } from "@/components/product/match-pick-list";
import { Button } from "@/components/ui/button";
import { TransitionLink } from "@/components/view-transition-link";
import type { SyntheticOrderRecord } from "@/data/orders";
import { formatDate, formatOrderSource } from "@/lib/formatters";
import { getLineCandidates, getOrderIntakeHref, getWaitingQueueHref } from "@/lib/product-workflow";
import {
  ApiError,
  decideLineItem,
  deferLineItem,
  fetchOrder,
  reopenLineItem,
  sendOrderToErp,
} from "@/lib/api";
import { cn } from "@/lib/utils";

function isLineClear(status: string) {
  return status === "matched";
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; order: SyntheticOrderRecord };

export function OrderSummary({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set());
  const [deferredLineIds, setDeferredLineIds] = useState<Set<string>>(new Set());
  const [pendingLineId, setPendingLineId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    // The catalog is no longer preloaded: candidates carry their own name and
    // price now, and pulling all 10,389 items meant a 6 MB download per page.
    fetchOrder(orderId)
      .then((order) => {
        if (cancelled) return;
        setState({ status: "success", order });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message =
          error instanceof ApiError
            ? error.detail
            : "Could not load this order. The backend may be offline.";
        setState({ status: "error", message });
      });
    return () => {
      cancelled = true;
    };
  }, [orderId, retryKey]);

  function toggleExpanded(lineId: string) {
    setExpandedLines((prev) => {
      const next = new Set(prev);
      if (next.has(lineId)) {
        next.delete(lineId);
      } else {
        next.add(lineId);
      }
      return next;
    });
  }

  function updateLineItem(lineId: string, patch: Partial<SyntheticOrderRecord["lineItems"][number]>) {
    setState((prev) => {
      if (prev.status !== "success") return prev;
      return {
        ...prev,
        order: {
          ...prev.order,
          lineItems: prev.order.lineItems.map((li) => (li.id === lineId ? { ...li, ...patch } : li)),
        },
      };
    });
  }

  async function resolveWithCandidate(lineId: string, candidateId: string) {
    setActionError(null);
    setPendingLineId(lineId);
    try {
      const updated = await decideLineItem(lineId, { candidateId });
      updateLineItem(lineId, updated);
      setDeferredLineIds((prev) => {
        const next = new Set(prev);
        next.delete(lineId);
        return next;
      });
    } catch (error) {
      setActionError(error instanceof ApiError ? error.detail : "Could not save that decision.");
    } finally {
      setPendingLineId(null);
    }
  }

  async function resolveWithCustomAnswer(lineId: string) {
    const text = (customAnswers[lineId] ?? "").trim();
    if (!text) {
      return;
    }
    setActionError(null);
    setPendingLineId(lineId);
    try {
      const updated = await decideLineItem(lineId, { customLabel: text });
      updateLineItem(lineId, updated);
      setDeferredLineIds((prev) => {
        const next = new Set(prev);
        next.delete(lineId);
        return next;
      });
    } catch (error) {
      setActionError(error instanceof ApiError ? error.detail : "Could not save that decision.");
    } finally {
      setPendingLineId(null);
    }
  }

  async function deferLine(lineId: string) {
    setActionError(null);
    setPendingLineId(lineId);
    try {
      await deferLineItem(lineId);
      setDeferredLineIds((prev) => new Set(prev).add(lineId));
    } catch (error) {
      setActionError(error instanceof ApiError ? error.detail : "Could not defer this line.");
    } finally {
      setPendingLineId(null);
    }
  }

  async function reopenLine(lineId: string) {
    setActionError(null);
    setPendingLineId(lineId);
    try {
      const updated = await reopenLineItem(lineId);
      updateLineItem(lineId, updated);
      setDeferredLineIds((prev) => {
        const next = new Set(prev);
        next.delete(lineId);
        return next;
      });
    } catch (error) {
      setActionError(error instanceof ApiError ? error.detail : "Could not reopen this line.");
    } finally {
      setPendingLineId(null);
    }
  }

  async function handleSendToErp() {
    if (state.status !== "success") return;
    setActionError(null);
    setSending(true);
    try {
      const updated = await sendOrderToErp(state.order.id);
      setState({ status: "success", order: updated });
    } catch (error) {
      setActionError(
        error instanceof ApiError ? error.detail : "Could not send this order to the ERP.",
      );
    } finally {
      setSending(false);
    }
  }

  if (state.status === "loading") {
    return (
      <AppShell>
        <main
          id="main"
          className="mx-auto flex min-h-dvh w-full max-w-screen-2xl flex-col px-6 py-10 text-[var(--om-text)] sm:px-10 lg:px-16"
        >
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5">
            <div className="h-6 w-40 animate-pulse rounded bg-[var(--om-surface-2)]" />
            <div className="h-10 w-96 animate-pulse rounded bg-[var(--om-surface-2)]" />
            <div className="h-64 animate-pulse rounded-lg bg-[var(--om-surface-2)]" />
          </div>
        </main>
      </AppShell>
    );
  }

  if (state.status === "error") {
    return (
      <AppShell>
        <main
          id="main"
          className="mx-auto flex min-h-dvh w-full max-w-screen-2xl flex-col px-6 py-10 text-[var(--om-text)] sm:px-10 lg:px-16"
        >
          <div className="mx-auto flex w-full max-w-2xl flex-col items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-5 text-sm text-amber-800">
            <p>{state.message}</p>
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

  const { order } = state;
  const sent = order.status === "erp-ready";
  const unresolvedCount = order.lineItems.filter((line) => !isLineClear(line.status)).length;

  const title = sent
    ? `${order.header.customerName}'s order has been sent.`
    : unresolvedCount > 0
      ? "A few things need a decision before this can be sent."
      : `${order.header.customerName}'s order is ready for the ERP.`;

  return (
    <AppShell>
      <main
        id="main"
        className="mx-auto flex min-h-dvh w-full max-w-screen-2xl flex-col px-6 py-10 text-[var(--om-text)] sm:px-10 lg:px-16"
      >
        <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex w-fit items-center gap-1 text-sm font-medium text-[var(--om-muted)] hover:text-[var(--om-text)]"
          >
            <ChevronLeft className="size-4" />
            Back
          </button>

          {sent ? (
            <div className="flex items-center gap-3 rounded-lg border border-green-300 bg-green-50 p-4 [animation:reveal-item_400ms_ease-out] motion-reduce:animate-none">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-green-300 bg-white [animation:success-pop_500ms_cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:animate-none">
                <Check className="size-4 text-green-600" />
              </span>
              <p className="text-sm font-semibold text-green-800">
                Sent to the ERP as {order.header.orderId}.
              </p>
            </div>
          ) : null}

          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-[var(--om-accent)]">
              {sent ? "Sent" : "Summary"}
            </p>
            <h1 className="mt-3 text-xl font-extrabold leading-snug text-[var(--om-text)] sm:text-2xl">
              {title}
            </h1>
            <p className="mt-2 text-sm text-[var(--om-muted)]">
              {order.header.orderId} · {formatOrderSource(order.header.source)}
            </p>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-lg border border-[var(--om-border)] bg-[var(--om-surface)] p-4 text-sm shadow-sm">
            <span>
              <span className="text-[var(--om-muted)]">Customer </span>
              <span className="font-semibold text-[var(--om-text)]">{order.header.customerName}</span>
            </span>
            {order.header.requestedDeliveryDate ? (
              <span>
                <span className="text-[var(--om-muted)]">Deliver by </span>
                <span className="font-semibold text-[var(--om-text)]">
                  {formatDate(order.header.requestedDeliveryDate)}
                </span>
              </span>
            ) : null}
            {order.header.deliveryLocation ? (
              <span>
                <span className="text-[var(--om-muted)]">Deliver to </span>
                <span className="font-semibold text-[var(--om-text)]">{order.header.deliveryLocation}</span>
              </span>
            ) : null}
          </div>

          {actionError ? (
            <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {actionError}
            </p>
          ) : null}

          <div className="rounded-lg border border-[var(--om-border)] bg-[var(--om-surface)] p-5 shadow-sm">
            {order.lineItems.map((line, index) => {
              const rowClear = isLineClear(line.status);
              const originallyClear = rowClear && !line.resolvedByDecision;
              const candidate = order.matchCandidates.find(
                (item) => item.id === line.selectedMatchCandidateId,
              );
              const proofItems = candidate?.proofItems ?? [];
              const expanded = expandedLines.has(line.id);
              const candidates = originallyClear ? [] : getLineCandidates(order, line.id).slice(0, 10);
              const isPending = pendingLineId === line.id;
              const isDeferred = deferredLineIds.has(line.id);

              return (
                <div
                  key={line.id}
                  className={cn(
                    "py-4",
                    index === 0 ? "pt-0" : "",
                    index === order.lineItems.length - 1 ? "pb-0" : "border-b border-[var(--om-border)]",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs text-[var(--om-muted)]">{line.originalText}</p>
                      <p className="truncate text-sm font-semibold text-[var(--om-text)]">
                        {line.normalizedName ?? line.originalText}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={cn(
                          "flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold",
                          rowClear
                            ? "border-green-300 bg-green-50 text-green-700"
                            : "border-amber-300 bg-amber-50 text-amber-700",
                        )}
                      >
                        {rowClear ? <Check className="size-3" /> : <AlertTriangle className="size-3" />}
                        {originallyClear ? "Matched" : rowClear ? "Confirmed" : "Needs a decision"}
                      </span>
                      {proofItems.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => toggleExpanded(line.id)}
                          className="flex items-center gap-1 text-xs font-medium text-[var(--om-muted)] hover:text-[var(--om-text)]"
                        >
                          Why this matched
                          {expanded ? (
                            <ChevronDown className="size-3.5" />
                          ) : (
                            <ChevronRight className="size-3.5" />
                          )}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {expanded && proofItems.length > 0 ? (
                    <div className="mt-3 rounded-md border border-[var(--om-border)] bg-[var(--om-surface-2)] p-3">
                      <ul className="flex flex-col gap-1.5">
                        {proofItems.map((proof) => (
                          <li
                            key={proof.id}
                            className="flex items-center justify-between gap-3 text-xs"
                          >
                            <span className="text-[var(--om-muted)]">{proof.label}</span>
                            <span className="flex items-center gap-1.5 font-medium text-[var(--om-text)]">
                              {proof.sourceValue}
                              <span className="text-[var(--om-subtle)]">to</span>
                              {proof.catalogValue ?? "n/a"}
                              {proof.supportsMatch ? (
                                <Check className="size-3 text-green-600" />
                              ) : (
                                <AlertTriangle className="size-3 text-amber-600" />
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {!originallyClear && !rowClear && !isDeferred ? (
                    <MatchPickList
                      candidates={candidates}
                      customValue={customAnswers[line.id] ?? ""}
                      onCustomChange={(value) =>
                        setCustomAnswers((prev) => ({ ...prev, [line.id]: value }))
                      }
                      onCustomSubmit={() => resolveWithCustomAnswer(line.id)}
                      onDefer={() => deferLine(line.id)}
                      onPick={(candidateId) => resolveWithCandidate(line.id, candidateId)}
                    />
                  ) : null}

                  {!originallyClear && !rowClear && isDeferred ? (
                    <button
                      type="button"
                      onClick={() => reopenLine(line.id)}
                      className="mt-1 text-xs font-medium text-[var(--om-accent)] hover:underline"
                    >
                      Review now
                    </button>
                  ) : null}

                  {isPending ? (
                    <p className="mt-1 text-xs text-[var(--om-muted)]">Saving...</p>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* Every decision above was logged against this customer and will
              re-rank their next order. Say so where the decisions were made,
              not on a settings page nobody opens. */}
          <TransitionLink
            href="/prototype/customers"
            className="flex items-center justify-between gap-3 rounded-md border border-[var(--om-border)] bg-[var(--om-surface)] px-4 py-3 transition-colors hover:border-[var(--om-accent)]"
          >
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-[var(--om-text)]">
                <Sparkles className="size-3.5 text-[var(--om-accent)]" />
                What we&apos;ve learned about {order.header.customerName}
              </span>
              <span className="mt-0.5 block text-xs text-[var(--om-muted)]">
                Your decisions here train the next order from this customer.
              </span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-[var(--om-muted)]" />
          </TransitionLink>

          {sent ? (
            <div className="flex flex-col items-center gap-3">
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button
                  asChild
                  className="h-10 bg-[var(--om-accent)] px-6 text-[var(--om-accent-text)] hover:bg-[var(--om-accent-hover)]"
                >
                  <TransitionLink href={getWaitingQueueHref()}>
                    Handle what else needs you
                  </TransitionLink>
                </Button>
                <Button asChild variant="outline" className="h-10 px-6">
                  <TransitionLink href={getOrderIntakeHref()}>Start a new order</TransitionLink>
                </Button>
              </div>
              <TransitionLink
                href="/prototype/setup"
                className="text-sm font-semibold text-[var(--om-accent)] underline-offset-4 hover:underline"
              >
                Set this up for your own catalog
              </TransitionLink>
            </div>
          ) : unresolvedCount > 0 ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-5 text-center">
              <p className="font-bold text-amber-800">
                {unresolvedCount} item{unresolvedCount === 1 ? "" : "s"}{" "}
                {unresolvedCount === 1 ? "still needs" : "still need"} a decision before this can be sent
                to the ERP.
              </p>
            </div>
          ) : (
            <div className="flex justify-center">
              <Button
                type="button"
                disabled={sending}
                onClick={handleSendToErp}
                className="h-11 bg-[var(--om-accent)] px-8 text-[var(--om-accent-text)] hover:bg-[var(--om-accent-hover)]"
              >
                {sending ? "Sending to the ERP..." : "Send to ERP"}
              </Button>
            </div>
          )}
        </section>
      </main>
    </AppShell>
  );
}
