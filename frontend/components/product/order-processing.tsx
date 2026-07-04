"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { MatchPickList } from "@/components/product/match-pick-list";
import { Button } from "@/components/ui/button";
import { TransitionLink } from "@/components/view-transition-link";
import type { SyntheticOrderRecord } from "@/data/orders";
import { formatDate, formatOrderSource } from "@/lib/formatters";
import {
  getCatalogItemById,
  getLineCandidates,
  getOrderById,
  getOrderSummaryHref,
  getOtherSampleOrders,
} from "@/lib/product-workflow";
import {
  saveProcessingResolutions,
  type ProcessingResolutions,
} from "@/lib/processing-state";
import { cn } from "@/lib/utils";
import type { MatchCandidate } from "@/types/match";

const HEADER_REVEAL_DELAY_MS = 300;
const LINE_REVEAL_INTERVAL_MS = 650;
const SETTLE_DELAY_MS = 500;

const RAIL_READING_BASE_MS = 1100;
const RAIL_READING_STEP_MS = 550;
const RAIL_MATCHING_BASE_MS = 1900;
const RAIL_MATCHING_STEP_MS = 700;

function isLineClear(status: string) {
  return status === "matched";
}

function RailOrderCard({ order, index }: { order: SyntheticOrderRecord; index: number }) {
  const [stage, setStage] = useState<"reading" | "matching" | "done">("reading");

  useEffect(() => {
    const toMatching = setTimeout(
      () => setStage("matching"),
      RAIL_READING_BASE_MS + index * RAIL_READING_STEP_MS,
    );
    const toDone = setTimeout(
      () => setStage("done"),
      RAIL_READING_BASE_MS +
        index * RAIL_READING_STEP_MS +
        RAIL_MATCHING_BASE_MS +
        index * RAIL_MATCHING_STEP_MS,
    );

    return () => {
      clearTimeout(toMatching);
      clearTimeout(toDone);
    };
  }, [index]);

  const flaggedCount = order.lineItems.filter((line) => !isLineClear(line.status)).length;

  return (
    <div className="rounded-lg border border-[var(--om-border)] bg-[var(--om-surface)] p-3">
      <p className="truncate text-sm font-semibold text-[var(--om-text)]">
        {order.header.customerName}
      </p>
      <div className="mt-1.5 flex items-center gap-1.5 text-xs">
        {stage === "done" ? (
          flaggedCount === 0 ? (
            <>
              <Check className="size-3 shrink-0 text-green-600" />
              <span className="text-green-700">Ready for ERP</span>
            </>
          ) : (
            <>
              <AlertTriangle className="size-3 shrink-0 text-amber-600" />
              <span className="text-amber-700">
                {flaggedCount} need{flaggedCount === 1 ? "s" : ""} review
              </span>
            </>
          )
        ) : (
          <>
            <span className="size-1.5 shrink-0 rounded-full bg-[var(--om-accent)] [animation:hero-dot_1.7s_ease-in-out_infinite]" />
            <span className="text-[var(--om-muted)]">
              {stage === "reading" ? "Reading order" : `Matching ${order.lineItems.length} items`}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function AlsoProcessingRail({ orders }: { orders: SyntheticOrderRecord[] }) {
  if (orders.length === 0) {
    return null;
  }

  return (
    <aside className="hidden lg:flex lg:w-[260px] lg:shrink-0 lg:flex-col lg:gap-3 lg:pt-1">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[var(--om-subtle)]">
        Also processing right now
      </p>
      {orders.map((order, index) => (
        <RailOrderCard key={order.id} order={order} index={index} />
      ))}
    </aside>
  );
}

export function OrderProcessing({ orderId }: { orderId: string }) {
  const order = getOrderById(orderId);
  const otherOrders = getOtherSampleOrders(order.id);
  const totalLines = order.lineItems.length;

  const [headerRevealed, setHeaderRevealed] = useState(false);
  const [revealedLines, setRevealedLines] = useState(0);
  const [settled, setSettled] = useState(false);
  const [resolutions, setResolutions] = useState<ProcessingResolutions>({});
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    const timer = setTimeout(() => setHeaderRevealed(true), HEADER_REVEAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    saveProcessingResolutions(order.id, resolutions);
  }, [order.id, resolutions]);

  useEffect(() => {
    if (!headerRevealed || settled) {
      return;
    }

    if (revealedLines >= totalLines) {
      const timer = setTimeout(() => setSettled(true), SETTLE_DELAY_MS);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => setRevealedLines((value) => value + 1), LINE_REVEAL_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [headerRevealed, revealedLines, totalLines, settled]);

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

  function deferLine(lineId: string) {
    setResolutions((prev) => ({ ...prev, [lineId]: { state: "deferred" } }));
  }

  function reopenLine(lineId: string) {
    setResolutions((prev) => {
      const next = { ...prev };
      delete next[lineId];
      return next;
    });
  }

  const unresolvedCount = order.lineItems.filter((line) => {
    if (isLineClear(line.status)) {
      return false;
    }
    return resolutions[line.id]?.state !== "resolved";
  }).length;

  return (
    <AppShell>
      <main
        id="main"
        className="mx-auto flex min-h-screen w-full max-w-screen-2xl flex-col px-6 py-10 text-[var(--om-text)] sm:px-10 lg:px-16"
      >
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start">
          <section className="flex flex-col gap-5">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-[var(--om-accent)]">
                Processing
              </p>
              <h1 className="mt-3 text-xl font-extrabold leading-snug text-[var(--om-text)] sm:text-2xl">
                Reading {order.header.customerName}&apos;s order
              </h1>
              <p className="mt-2 text-sm text-[var(--om-muted)]">
                {order.header.orderId} · {formatOrderSource(order.header.source)}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--om-surface-2)]">
                <div
                  className="h-full rounded-full bg-[var(--om-accent)] transition-all duration-500 ease-out"
                  style={{ width: `${Math.round((revealedLines / totalLines) * 100)}%` }}
                />
              </div>
              <span className="shrink-0 font-mono text-xs text-[var(--om-muted)]">
                {revealedLines} of {totalLines} checked
              </span>
            </div>

            <div
              className={cn(
                "flex flex-wrap gap-x-6 gap-y-1 border-b border-[var(--om-border)] pb-4 text-sm transition-opacity duration-500",
                headerRevealed ? "opacity-100" : "opacity-0",
              )}
            >
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
                  <span className="font-semibold text-[var(--om-text)]">
                    {order.header.deliveryLocation}
                  </span>
                </span>
              ) : null}
            </div>

            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[var(--om-muted)]">
                Matching each item to the catalog
              </p>
              <div className="mt-3 flex flex-col">
                {order.lineItems.map((line, index) => {
                  if (index >= revealedLines) {
                    return null;
                  }

                  const clear = isLineClear(line.status);
                  const resolution = clear ? undefined : resolutions[line.id] ?? { state: "open" as const };
                  const candidates = clear ? [] : getLineCandidates(order, line.id).slice(0, 3);
                  const isLastRendered = index === revealedLines - 1;

                  const rowClear = clear || resolution?.state === "resolved";

                  return (
                    <div
                      key={line.id}
                      className="relative flex gap-3 [animation:reveal-item_320ms_ease-out] motion-reduce:animate-none"
                    >
                      <div className="flex flex-col items-center">
                        <span
                          className={cn(
                            "flex size-6 shrink-0 items-center justify-center rounded-full border",
                            rowClear
                              ? "border-green-300 bg-green-50 text-green-700"
                              : "border-amber-300 bg-amber-50 text-amber-700",
                          )}
                        >
                          {rowClear ? (
                            <Check className="size-3.5" />
                          ) : (
                            <AlertTriangle className="size-3.5" />
                          )}
                        </span>
                        {!isLastRendered ? (
                          <span className="w-px flex-1 bg-[var(--om-border)]" />
                        ) : null}
                      </div>

                      <div className="min-w-0 flex-1 pb-5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-xs text-[var(--om-muted)]">{line.originalText}</p>
                            <p className="truncate text-sm font-semibold text-[var(--om-text)]">
                              {resolution?.state === "resolved"
                                ? resolution.label
                                : line.normalizedName ?? line.originalText}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold",
                              rowClear
                                ? "border-green-300 bg-green-50 text-green-700"
                                : "border-amber-300 bg-amber-50 text-amber-700",
                            )}
                          >
                            {rowClear ? <Check className="size-3" /> : <AlertTriangle className="size-3" />}
                            {clear ? "Matched" : resolution?.state === "resolved" ? "Confirmed" : "Needs a decision"}
                          </span>
                        </div>

                        {!clear && resolution?.state === "open" ? (
                          <MatchPickList
                            candidates={candidates}
                            customValue={customAnswers[line.id] ?? ""}
                            onCustomChange={(value) =>
                              setCustomAnswers((prev) => ({ ...prev, [line.id]: value }))
                            }
                            onCustomSubmit={() => resolveWithCustomAnswer(line.id)}
                            onDefer={() => deferLine(line.id)}
                            onPick={(candidateId) => {
                              const candidate = candidates.find((item) => item.id === candidateId);
                              if (candidate) {
                                resolveWithCandidate(line.id, candidate);
                              }
                            }}
                          />
                        ) : null}

                        {!clear && resolution?.state === "deferred" ? (
                          <button
                            type="button"
                            onClick={() => reopenLine(line.id)}
                            className="mt-1 text-xs font-medium text-[var(--om-accent)] hover:underline"
                          >
                            Review now
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {settled ? (
              <div className="flex flex-col items-center gap-4 [animation:reveal-item_320ms_ease-out] motion-reduce:animate-none">
                <div
                  className={cn(
                    "w-full rounded-lg border p-5 text-center",
                    unresolvedCount === 0 ? "border-green-300 bg-green-50" : "border-amber-300 bg-amber-50",
                  )}
                >
                  {unresolvedCount === 0 ? (
                    <p className="font-bold text-green-800">This order is ready for the ERP.</p>
                  ) : (
                    <p className="font-bold text-amber-800">
                      {unresolvedCount} item{unresolvedCount === 1 ? "" : "s"}{" "}
                      {unresolvedCount === 1 ? "still needs" : "still need"} a decision before this can go
                      to the ERP.
                    </p>
                  )}
                </div>

                <Button
                  asChild
                  className="h-10 bg-[var(--om-accent)] px-6 text-[var(--om-accent-text)] hover:bg-[var(--om-accent-hover)]"
                >
                  <TransitionLink href={getOrderSummaryHref(order.id)}>
                    Continue to order summary
                  </TransitionLink>
                </Button>
              </div>
            ) : null}
          </section>

          <AlsoProcessingRail orders={otherOrders} />
        </div>
      </main>
    </AppShell>
  );
}
