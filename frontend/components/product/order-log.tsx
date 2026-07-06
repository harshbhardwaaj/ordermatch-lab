"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { TransitionLink } from "@/components/view-transition-link";
import type { SyntheticOrderRecord } from "@/data/orders";
import { formatDate, formatOrderSource } from "@/lib/formatters";
import { getOrderSummaryHref } from "@/lib/product-workflow";
import { ApiError, fetchOrders, resetDemoData } from "@/lib/api";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "sent" | "not-sent";

const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "not-sent", label: "Not sent" },
  { id: "sent", label: "Sent" },
];

function isSent(order: SyntheticOrderRecord) {
  return order.status === "erp-ready";
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; orders: SyntheticOrderRecord[] };

export function OrderLog() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [retryKey, setRetryKey] = useState(0);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    fetchOrders()
      .then((orders) => {
        if (!cancelled) setState({ status: "success", orders });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message =
          error instanceof ApiError
            ? error.detail
            : "Could not load orders. The backend may be offline.";
        setState({ status: "error", message });
      });
    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  const orders = state.status === "success" ? state.orders : [];
  const visibleOrders = orders.filter((order) => {
    if (filter === "sent") return isSent(order);
    if (filter === "not-sent") return !isSent(order);
    return true;
  });
  const sentCount = orders.filter(isSent).length;

  async function handleReset() {
    setResetError(null);
    setResetting(true);
    try {
      await resetDemoData();
      setConfirmingReset(false);
      setRetryKey((key) => key + 1);
    } catch (error) {
      setResetError(error instanceof ApiError ? error.detail : "Could not reset the demo data.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <AppShell>
      <main
        id="main"
        className="mx-auto flex min-h-screen w-full max-w-screen-2xl flex-col px-6 py-10 text-[var(--om-text)] sm:px-10 lg:px-16"
      >
        <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6">
          <div className="max-w-2xl">
            <p className="font-mono text-sm font-bold uppercase tracking-[0.2em] text-[var(--om-accent)]">
              Order log
            </p>
            <h1 className="mt-4 text-2xl font-extrabold leading-tight text-[var(--om-text)] sm:text-3xl">
              Every order, sample or your own.
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--om-muted)] sm:text-base">
              {state.status === "success"
                ? `${sentCount} of ${orders.length} sent to the ERP so far.`
                : "The full history of orders this instance has processed, sent or not."}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                    filter === item.id
                      ? "border-[var(--om-accent)] bg-[var(--om-accent)] text-[var(--om-accent-text)]"
                      : "border-[var(--om-border)] bg-[var(--om-surface)] text-[var(--om-muted)] hover:text-[var(--om-text)]",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {confirmingReset ? (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-amber-800">
                  This clears every order you&apos;ve tried and resets the samples. Are you sure?
                </span>
                <Button
                  type="button"
                  disabled={resetting}
                  onClick={handleReset}
                  className="h-8 bg-red-600 px-3 text-xs text-white hover:bg-red-700"
                >
                  {resetting ? "Resetting..." : "Yes, reset everything"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={resetting}
                  onClick={() => setConfirmingReset(false)}
                  className="h-8 px-3 text-xs"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingReset(true)}
                className="text-xs font-semibold text-[var(--om-muted)] underline-offset-4 hover:text-[var(--om-text)] hover:underline"
              >
                Reset demo data
              </button>
            )}
          </div>

          {resetError ? (
            <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {resetError}
            </p>
          ) : null}

          {state.status === "loading" ? (
            <div className="flex flex-col gap-2">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded-lg border border-[var(--om-border)] bg-[var(--om-surface)]"
                />
              ))}
            </div>
          ) : state.status === "error" ? (
            <div className="flex flex-col items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
              <p>{state.message}</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRetryKey((key) => key + 1)}
                className="h-8 border-amber-300 bg-white px-3 text-xs text-amber-800 hover:bg-amber-100"
              >
                Try again
              </Button>
            </div>
          ) : visibleOrders.length === 0 ? (
            <p className="rounded-lg border border-[var(--om-border)] bg-[var(--om-surface)] p-4 text-sm text-[var(--om-muted)]">
              Nothing here yet.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[var(--om-border)] bg-[var(--om-surface)] shadow-sm">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--om-border)] text-xs font-semibold uppercase tracking-[0.08em] text-[var(--om-subtle)]">
                    <th className="px-4 py-3">Order</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Received</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {visibleOrders.map((order) => {
                    const sent = isSent(order);
                    return (
                      <tr
                        key={order.id}
                        className="border-b border-[var(--om-border)] last:border-b-0"
                      >
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-[var(--om-text)]">
                          {order.header.orderId}
                        </td>
                        <td className="px-4 py-3 font-medium text-[var(--om-text)]">
                          {order.header.customerName}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-[var(--om-muted)]">
                          {formatOrderSource(order.header.source)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-[var(--om-muted)]">
                          {formatDate(order.header.receivedAt)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={cn(
                              "flex w-fit items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold",
                              sent
                                ? "border-green-300 bg-green-50 text-green-700"
                                : "border-amber-300 bg-amber-50 text-amber-700",
                            )}
                          >
                            {sent ? <Check className="size-3" /> : <AlertTriangle className="size-3" />}
                            {sent ? "Sent" : "Needs review"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <TransitionLink
                            href={getOrderSummaryHref(order.id)}
                            className="text-sm font-semibold text-[var(--om-accent)] hover:underline"
                          >
                            {sent ? "View" : "Review"}
                          </TransitionLink>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </AppShell>
  );
}
