"use client";

import { useEffect, useState } from "react";

import { sampleOrders, type SyntheticOrderRecord } from "@/data/orders";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TransitionLink } from "@/components/view-transition-link";
import { EmptyState, ProductPanel, StatusPill } from "@/components/product/product-ui";
import {
  formatConfidence,
  formatDate,
  formatStatus,
  formatStatusFromSlug,
} from "@/lib/formatters";
import {
  getEstimatedMinutesSaved,
  getOrderReviewHref,
  getQueueConfidence,
} from "@/lib/product-workflow";
import { cn } from "@/lib/utils";
import type { QueueMode } from "@/components/product/order-review-provider";

const ORIENTATION_STORAGE_KEY = "ordermatch-prototype-orientation-seen";

const queueModes: { value: QueueMode; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "loading", label: "Loading" },
  { value: "empty", label: "Empty" },
  { value: "stale", label: "Stale" },
  { value: "partial", label: "Partial" },
  { value: "row-error", label: "Row issue" },
];

function getOrderTone(order: SyntheticOrderRecord) {
  if (order.status === "ready" || order.status === "erp-ready") {
    return "ready" as const;
  }

  if (order.status === "blocked") {
    return "blocked" as const;
  }

  if (order.status === "review-needed") {
    return "review" as const;
  }

  return "neutral" as const;
}

function getConfidenceTone(confidence: ReturnType<typeof getQueueConfidence>) {
  if (confidence === "high-confidence") {
    return "ready" as const;
  }

  if (confidence === "blocked" || confidence === "no-match") {
    return "blocked" as const;
  }

  return "review" as const;
}

function QueueSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="grid gap-3 rounded-lg border border-[var(--om-border)] bg-[var(--om-surface)] p-3 md:grid-cols-[1.1fr_0.7fr_0.6fr_0.5fr]"
        >
          <Skeleton className="h-8" />
          <Skeleton className="h-8" />
          <Skeleton className="h-8" />
          <Skeleton className="h-8" />
        </div>
      ))}
    </div>
  );
}

function QueueDemoControls({
  mode,
  onModeChange,
}: {
  mode: QueueMode;
  onModeChange: (mode: QueueMode) => void;
}) {
  return (
    <details className="rounded-lg border border-dashed border-[var(--om-border-strong)] bg-[var(--om-surface-2)] p-3 text-sm">
      <summary className="cursor-pointer select-none font-semibold text-[var(--om-muted)]">
        Demo controls
      </summary>
      <p className="mt-2 text-xs leading-5 text-[var(--om-muted)]">
        Testing harness for queue states. These controls are not part of the order workflow.
      </p>
      <div className="mt-3 flex flex-wrap gap-1 rounded-lg border border-[var(--om-border)] bg-[var(--om-bg)] p-1">
        {queueModes.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onModeChange(option.value)}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-xs font-semibold text-[var(--om-muted)] transition-colors hover:text-[var(--om-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--om-accent)]",
              mode === option.value &&
                "bg-[var(--om-surface)] text-[var(--om-accent)] shadow-sm",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </details>
  );
}

function PrototypeOrientation({ onEnter }: { onEnter: () => void }) {
  return (
    <AppShell>
      <main
        id="main"
        className="mx-auto flex min-h-screen w-full max-w-screen-2xl flex-col items-center justify-center px-4 py-8 text-center text-[var(--om-text)] sm:px-6 lg:px-8"
      >
        <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6">
          <h1 className="max-w-3xl text-2xl font-bold leading-snug tracking-normal text-[var(--om-text)] sm:text-3xl">
            A customer order comes in messy. Someone still has to catch the mistakes before they get expensive.
          </h1>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              type="button"
              className="w-full bg-[var(--om-accent)] text-[var(--om-accent-text)] hover:bg-[var(--om-accent-hover)] sm:w-auto"
              onClick={onEnter}
            >
              Try a sample order
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                disabled
                variant="outline"
                className="border-[var(--om-border)] bg-[var(--om-surface)] text-[var(--om-muted)]"
              >
                Give your own order
              </Button>
              <span className="rounded-full border border-[var(--om-border)] bg-[var(--om-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--om-muted)]">
                Not connected yet
              </span>
            </div>
          </div>
        </section>
      </main>
    </AppShell>
  );
}

export function OrderQueue() {
  const [queueMode, setQueueMode] = useState<QueueMode>("normal");
  const [showOrientation, setShowOrientation] = useState<boolean | null>(null);
  const visibleOrders = queueMode === "empty" ? [] : sampleOrders;

  useEffect(() => {
    setShowOrientation(
      window.sessionStorage.getItem(ORIENTATION_STORAGE_KEY) !== "dismissed",
    );
  }, []);

  function enterQueue() {
    window.sessionStorage.setItem(ORIENTATION_STORAGE_KEY, "dismissed");
    setShowOrientation(false);
  }

  if (showOrientation !== false) {
    return <PrototypeOrientation onEnter={enterQueue} />;
  }

  return (
    <AppShell>
      <main
        id="main"
        className="mx-auto flex min-h-screen w-full max-w-screen-2xl flex-col gap-5 px-4 py-6 text-[var(--om-text)] sm:px-6 lg:px-8"
      >
        <div className="flex flex-col gap-3">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[var(--om-subtle)]">
            What I built
          </p>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-extrabold tracking-normal text-[var(--om-text)]">
                Incoming orders
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--om-muted)]">
                Start here like an operations reviewer would: pick one customer order,
                then move through a guided review instead of scrolling through every detail at once.
              </p>
            </div>
            <div className="rounded-lg border border-[var(--om-border)] bg-[var(--om-surface)] px-3 py-2 text-xs leading-5 text-[var(--om-muted)]">
              <span className="font-bold text-[var(--om-text)]">Sample data.</span>{" "}
              These are grounded synthetic orders, not live customer data.
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-[var(--om-border)] bg-[var(--om-surface)] p-3">
            <p className="text-xs font-semibold text-[var(--om-muted)]">Waiting for review</p>
            <p className="mt-1 text-2xl font-extrabold text-[var(--om-text)]">
              {sampleOrders.length}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--om-border)] bg-[var(--om-surface)] p-3">
            <p className="text-xs font-semibold text-[var(--om-muted)]">Open exceptions</p>
            <p className="mt-1 text-2xl font-extrabold text-[var(--om-text)]">
              {sampleOrders.reduce((sum, order) => sum + order.exceptions.length, 0)}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--om-border)] bg-[var(--om-surface)] p-3">
            <p className="text-xs font-semibold text-[var(--om-muted)]">Sample time saved</p>
            <p className="mt-1 text-2xl font-extrabold text-[var(--om-text)]">
              {sampleOrders.reduce((sum, order) => sum + getEstimatedMinutesSaved(order), 0)} min
            </p>
          </div>
        </div>

        <ProductPanel
          title="Order queue"
          eyebrow="Step 1"
          action={<QueueDemoControls mode={queueMode} onModeChange={setQueueMode} />}
        >
          {queueMode === "loading" ? <QueueSkeleton /> : null}

          {queueMode === "empty" ? (
            <EmptyState
              title="No orders are waiting for review."
              message="This is what the queue shows after every sample order has been cleared."
              action="Import sample orders to inspect the workflow again."
            />
          ) : null}

          {queueMode === "stale" || queueMode === "partial" ? (
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <p className="font-bold">
                {queueMode === "stale" ? "Stale sample data" : "Partial queue data"}
              </p>
              <p className="mt-1 leading-6">
                {queueMode === "stale"
                  ? "Fresh queue data did not load. Last-known sample orders stay visible so review can continue."
                  : "One row failed to refresh. The rest of the queue remains usable."}
              </p>
            </div>
          ) : null}

          {visibleOrders.length > 0 && queueMode !== "loading" ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] border-separate border-spacing-0 text-left text-sm">
                <thead>
                  <tr className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--om-subtle)]">
                    <th className="border-b border-[var(--om-border)] px-3 py-2">Order</th>
                    <th className="border-b border-[var(--om-border)] px-3 py-2">Customer</th>
                    <th className="border-b border-[var(--om-border)] px-3 py-2">Status</th>
                    <th className="border-b border-[var(--om-border)] px-3 py-2">Confidence</th>
                    <th className="border-b border-[var(--om-border)] px-3 py-2">Exceptions</th>
                    <th className="border-b border-[var(--om-border)] px-3 py-2">Time saved</th>
                    <th className="border-b border-[var(--om-border)] px-3 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleOrders.map((order, index) => {
                    const confidence = getQueueConfidence(order);
                    const hasRowError = queueMode === "row-error" && index === 1;

                    return (
                      <tr
                        key={order.id}
                        className="transition-colors hover:bg-[var(--om-selected)]"
                      >
                        <td className="border-b border-[var(--om-border)] px-3 py-3 align-top">
                          <p className="font-bold text-[var(--om-text)]">
                            {order.header.orderId}
                          </p>
                          <p className="mt-1 text-xs text-[var(--om-muted)]">
                            {formatDate(order.header.receivedAt)} via{" "}
                            {formatStatusFromSlug(order.header.source)}
                          </p>
                          {hasRowError ? (
                            <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
                              Row refresh failed. Open order still works.
                            </p>
                          ) : null}
                        </td>
                        <td className="border-b border-[var(--om-border)] px-3 py-3 align-top">
                          <p className="font-semibold text-[var(--om-text)]">
                            {order.header.customerName}
                          </p>
                          <p className="mt-1 text-xs text-[var(--om-muted)]">
                            {order.customerProfile.industry}
                          </p>
                        </td>
                        <td className="border-b border-[var(--om-border)] px-3 py-3 align-top">
                          <StatusPill label={formatStatus(order.status)} tone={getOrderTone(order)} />
                        </td>
                        <td className="border-b border-[var(--om-border)] px-3 py-3 align-top">
                          <StatusPill
                            label={formatConfidence(confidence)}
                            tone={getConfidenceTone(confidence)}
                          />
                        </td>
                        <td className="border-b border-[var(--om-border)] px-3 py-3 align-top">
                          <span className="font-semibold text-[var(--om-text)]">
                            {order.exceptions.length}
                          </span>
                          <span className="ml-1 text-xs text-[var(--om-muted)]">
                            issue{order.exceptions.length === 1 ? "" : "s"}
                          </span>
                        </td>
                        <td className="border-b border-[var(--om-border)] px-3 py-3 align-top">
                          <span className="font-semibold text-[var(--om-text)]">
                            {getEstimatedMinutesSaved(order)} min
                          </span>
                          <p className="mt-1 text-xs text-[var(--om-muted)]">sample estimate</p>
                        </td>
                        <td className="border-b border-[var(--om-border)] px-3 py-3 align-top">
                          <Button
                            asChild
                            className="h-9 bg-[var(--om-accent)] text-[var(--om-accent-text)] hover:bg-[var(--om-accent-hover)]"
                          >
                            <TransitionLink href={getOrderReviewHref(order.id)}>
                              Review order
                            </TransitionLink>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </ProductPanel>
      </main>
    </AppShell>
  );
}
