"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, ChevronDown, ChevronRight } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { MatchPickList } from "@/components/product/match-pick-list";
import { Button } from "@/components/ui/button";
import { TransitionLink } from "@/components/view-transition-link";
import { formatDate, formatOrderSource } from "@/lib/formatters";
import {
  getCatalogItemById,
  getLineCandidates,
  getOrderById,
  getWaitingQueueHref,
} from "@/lib/product-workflow";
import {
  getSentOrderIds,
  loadProcessingResolutions,
  markOrderSent,
  saveProcessingResolutions,
  type ProcessingResolutions,
} from "@/lib/processing-state";
import { cn } from "@/lib/utils";
import type { MatchCandidate } from "@/types/match";
import type { OrderLineItem } from "@/types/order";

type SendState = "idle" | "sending" | "sent";

function isLineClear(status: string) {
  return status === "matched";
}

function getLineDisplay(
  order: ReturnType<typeof getOrderById>,
  line: OrderLineItem,
  resolutions: ProcessingResolutions,
) {
  if (isLineClear(line.status)) {
    const candidate = order.matchCandidates.find(
      (item) => item.id === line.selectedMatchCandidateId,
    );
    return {
      status: "auto" as const,
      displayName: line.normalizedName ?? line.originalText,
      candidate,
    };
  }

  const stored = resolutions[line.id];

  if (stored?.state === "resolved") {
    const candidate = stored.candidateId
      ? order.matchCandidates.find((item) => item.id === stored.candidateId)
      : undefined;
    return {
      status: "confirmed" as const,
      displayName: stored.label ?? line.normalizedName ?? line.originalText,
      candidate,
    };
  }

  return {
    status: "needs-decision" as const,
    displayName: line.normalizedName ?? line.originalText,
    candidate: undefined as MatchCandidate | undefined,
  };
}

export function OrderSummary({ orderId }: { orderId: string }) {
  const order = getOrderById(orderId);

  const [resolutions, setResolutions] = useState<ProcessingResolutions>({});
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set());
  const [sendState, setSendState] = useState<SendState>("idle");
  const [hasLoadedResolutions, setHasLoadedResolutions] = useState(false);

  useEffect(() => {
    setResolutions(loadProcessingResolutions(order.id));
    setHasLoadedResolutions(true);

    if (getSentOrderIds().includes(order.id)) {
      setSendState("sent");
    }
  }, [order.id]);

  useEffect(() => {
    if (!hasLoadedResolutions) {
      return;
    }
    saveProcessingResolutions(order.id, resolutions);
  }, [order.id, resolutions, hasLoadedResolutions]);

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

  function resolveWithCandidate(lineId: string, candidate: MatchCandidate) {
    setResolutions((prev) => ({
      ...prev,
      [lineId]: {
        state: "resolved",
        label: getCatalogItemById(candidate.catalogItemId)?.name ?? candidate.sku ?? "Selected match",
        candidateId: candidate.id,
      },
    }));
  }

  function resolveWithCustomAnswer(lineId: string) {
    const text = (customAnswers[lineId] ?? "").trim();
    if (!text) {
      return;
    }
    setResolutions((prev) => ({ ...prev, [lineId]: { state: "resolved", label: text } }));
  }

  const lineDisplays = order.lineItems.map((line) => ({
    line,
    display: getLineDisplay(order, line, resolutions),
  }));

  const unresolvedCount = lineDisplays.filter(
    ({ display }) => display.status === "needs-decision",
  ).length;

  const title =
    sendState === "sent"
      ? `${order.header.customerName}'s order has been sent.`
      : unresolvedCount > 0
        ? "A few things need a decision before this can be sent."
        : `${order.header.customerName}'s order is ready for the ERP.`;

  if (sendState === "sent") {
    return (
      <AppShell>
        <main
          id="main"
          className="mx-auto flex min-h-screen w-full max-w-screen-2xl flex-col px-6 py-10 text-[var(--om-text)] sm:px-10 lg:px-16"
        >
          <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 text-center">
            <span className="flex size-16 items-center justify-center rounded-full border-2 border-green-300 bg-green-50 [animation:success-pop_500ms_cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:animate-none">
              <Check className="size-8 text-green-600" />
            </span>
            <div className="[animation:reveal-item_400ms_ease-out] motion-reduce:animate-none">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-[var(--om-accent)]">
                Sent
              </p>
              <h1 className="mt-3 text-xl font-extrabold leading-snug text-[var(--om-text)] sm:text-2xl">
                {title}
              </h1>
              <p className="mt-2 text-sm text-[var(--om-muted)]">
                Sent to the ERP as {order.header.orderId}.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 [animation:reveal-item_400ms_ease-out] motion-reduce:animate-none">
              <Button
                asChild
                className="h-10 bg-[var(--om-accent)] px-6 text-[var(--om-accent-text)] hover:bg-[var(--om-accent-hover)]"
              >
                <TransitionLink href={getWaitingQueueHref()}>
                  Handle what else needs you
                </TransitionLink>
              </Button>
              <Button asChild variant="outline" className="h-10 px-6">
                <TransitionLink href="/prototype/start">Start a new order</TransitionLink>
              </Button>
            </div>
            <div className="[animation:reveal-item_400ms_ease-out] motion-reduce:animate-none">
              <TransitionLink
                href="/prototype/setup"
                className="text-sm font-semibold text-[var(--om-accent)] underline-offset-4 hover:underline"
              >
                Set this up for your own catalog
              </TransitionLink>
            </div>
          </section>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main
        id="main"
        className="mx-auto flex min-h-screen w-full max-w-screen-2xl flex-col px-6 py-10 text-[var(--om-text)] sm:px-10 lg:px-16"
      >
        <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-[var(--om-accent)]">
              Summary
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

          <div className="rounded-lg border border-[var(--om-border)] bg-[var(--om-surface)] p-5 shadow-sm">
            {lineDisplays.map(({ line, display }, index) => {
              const proofItems = display.candidate?.proofItems ?? [];
              const expanded = expandedLines.has(line.id);
              const candidates = getLineCandidates(order, line.id).slice(0, 3);
              const rowClear = display.status !== "needs-decision";

              return (
                <div
                  key={line.id}
                  className={cn(
                    "py-4",
                    index === 0 ? "pt-0" : "",
                    index === lineDisplays.length - 1 ? "pb-0" : "border-b border-[var(--om-border)]",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs text-[var(--om-muted)]">{line.originalText}</p>
                      <p className="truncate text-sm font-semibold text-[var(--om-text)]">
                        {display.displayName}
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
                        {display.status === "auto"
                          ? "Matched"
                          : display.status === "confirmed"
                            ? "Confirmed"
                            : "Needs a decision"}
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
                              {proof.catalogValue ?? "—"}
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

                  {display.status === "needs-decision" ? (
                    <MatchPickList
                      candidates={candidates}
                      customValue={customAnswers[line.id] ?? ""}
                      onCustomChange={(value) =>
                        setCustomAnswers((prev) => ({ ...prev, [line.id]: value }))
                      }
                      onCustomSubmit={() => resolveWithCustomAnswer(line.id)}
                      onPick={(candidateId) => {
                        const candidate = candidates.find((item) => item.id === candidateId);
                        if (candidate) {
                          resolveWithCandidate(line.id, candidate);
                        }
                      }}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>

          {unresolvedCount > 0 ? (
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
                disabled={sendState === "sending"}
                onClick={() => {
                  setSendState("sending");
                  setTimeout(() => {
                    setSendState("sent");
                    markOrderSent(order.id);
                  }, 900);
                }}
                className="h-11 bg-[var(--om-accent)] px-8 text-[var(--om-accent-text)] hover:bg-[var(--om-accent-hover)]"
              >
                {sendState === "sending" ? "Sending to the ERP..." : "Send to ERP"}
              </Button>
            </div>
          )}
        </section>
      </main>
    </AppShell>
  );
}
