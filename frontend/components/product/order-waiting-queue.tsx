"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { TransitionLink } from "@/components/view-transition-link";
import { primaryWalkthroughOrderId, type SyntheticOrderRecord } from "@/data/orders";
import { formatOrderSource } from "@/lib/formatters";
import { getOrderSummaryHref, getOtherSampleOrders } from "@/lib/product-workflow";
import { getSentOrderIds } from "@/lib/processing-state";

function isLineClear(status: string) {
  return status === "matched";
}

function WaitingOrderCard({ order }: { order: SyntheticOrderRecord }) {
  const flaggedCount = order.lineItems.filter((line) => !isLineClear(line.status)).length;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-[var(--om-border)] bg-[var(--om-surface)] p-4 shadow-sm">
      <div>
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[var(--om-subtle)]">
          {order.header.orderId} · {formatOrderSource(order.header.source)}
        </p>
        <p className="mt-1 text-base font-bold text-[var(--om-text)]">{order.header.customerName}</p>
      </div>
      <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-700">
        <AlertTriangle className="size-3.5" />
        {flaggedCount} item{flaggedCount === 1 ? "" : "s"} need{flaggedCount === 1 ? "s" : ""} a decision
      </p>
      <Button
        asChild
        className="mt-1 h-9 w-fit bg-[var(--om-accent)] text-[var(--om-accent-text)] hover:bg-[var(--om-accent-hover)]"
      >
        <TransitionLink href={getOrderSummaryHref(order.id)}>Review this order</TransitionLink>
      </Button>
    </div>
  );
}

export function OrderWaitingQueue() {
  const candidateOrders = getOtherSampleOrders(primaryWalkthroughOrderId, 3).filter((order) =>
    order.lineItems.some((line) => !isLineClear(line.status)),
  );

  const [sentOrderIds, setSentOrderIds] = useState<string[]>([]);

  useEffect(() => {
    setSentOrderIds(getSentOrderIds());
  }, []);

  const orders = candidateOrders.filter((order) => !sentOrderIds.includes(order.id));

  return (
    <AppShell>
      <main
        id="main"
        className="mx-auto flex min-h-screen w-full max-w-screen-2xl flex-col px-6 py-10 text-[var(--om-text)] sm:px-10 lg:px-16"
      >
        <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6">
          <div className="max-w-2xl">
            <p className="font-mono text-sm font-bold uppercase tracking-[0.2em] text-[var(--om-accent)]">
              Waiting for you
            </p>
            <h1 className="mt-4 text-2xl font-extrabold leading-tight text-[var(--om-text)] sm:text-3xl">
              While you were reviewing, a few more came in.
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--om-muted)] sm:text-base">
              These finished processing on their own. They just need a quick decision from you before
              they can go to the ERP.
            </p>
          </div>

          {orders.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {orders.map((order) => (
                <WaitingOrderCard key={order.id} order={order} />
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-[var(--om-border)] bg-[var(--om-surface)] p-4 text-sm text-[var(--om-muted)]">
              Nothing waiting on you right now. You&apos;re all caught up.
            </p>
          )}

          <Button
            asChild
            variant="outline"
            className="h-10 w-fit border-[var(--om-border)] bg-[var(--om-surface)] text-[var(--om-text)]"
          >
            <TransitionLink href="/prototype/start">Start a new order</TransitionLink>
          </Button>
        </section>
      </main>
    </AppShell>
  );
}
