"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, FileUp, Mail, PenLine } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransitionLink } from "@/components/view-transition-link";
import { primaryWalkthroughOrderId, sampleOrders, type SyntheticOrderRecord } from "@/data/orders";
import { formatOrderSource } from "@/lib/formatters";
import { getOrderProcessingHref, getOrderSummaryHref } from "@/lib/product-workflow";
import { getSentOrderIds } from "@/lib/processing-state";
import { cn } from "@/lib/utils";

const FORWARDING_ADDRESS = "orders@ordermatch-demo.ai";

type ViewTransitionDocument = Document & {
  startViewTransition?: (updateCallback: () => void) => { finished: Promise<void> };
};

function navigateWithTransition(router: ReturnType<typeof useRouter>, href: string) {
  const doc = document as ViewTransitionDocument;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReducedMotion || !doc.startViewTransition) {
    router.push(href);
    return;
  }

  doc.startViewTransition(() => {
    router.push(href);
  });
}

function SampleOrderCard({ order, isSent }: { order: SyntheticOrderRecord; isSent: boolean }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-[var(--om-border)] bg-[var(--om-surface)] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[var(--om-subtle)]">
            {order.header.orderId} · {formatOrderSource(order.header.source)}
          </p>
          <p className="mt-1 text-base font-bold text-[var(--om-text)]">{order.header.customerName}</p>
        </div>
        {isSent ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full border border-green-300 bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">
            <Check className="size-3" />
            Sent
          </span>
        ) : null}
      </div>
      <p className="text-sm leading-6 text-[var(--om-muted)]">{order.sourceDocumentSummary}</p>
      <Button
        asChild
        variant={isSent ? "outline" : "default"}
        className={cn(
          "mt-1 h-9 w-fit",
          !isSent && "bg-[var(--om-accent)] text-[var(--om-accent-text)] hover:bg-[var(--om-accent-hover)]",
        )}
      >
        <TransitionLink href={isSent ? getOrderSummaryHref(order.id) : getOrderProcessingHref(order.id)}>
          {isSent ? "View sent order" : "Review this order"}
        </TransitionLink>
      </Button>
    </div>
  );
}

function OwnOrderPanel({ onSubmit }: { onSubmit: () => void }) {
  const [pastedText, setPastedText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleCopyAddress() {
    try {
      await navigator.clipboard.writeText(FORWARDING_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard access can be blocked in some embedded previews; the address is still visible to copy by hand.
    }
  }

  return (
    <div className="rounded-lg border border-[var(--om-border)] bg-[var(--om-surface)] p-5 shadow-sm">
      <Tabs defaultValue="paste">
        <TabsList className="bg-[var(--om-surface-2)]">
          <TabsTrigger value="paste" className="gap-1.5">
            <PenLine className="size-3.5" />
            Paste text
          </TabsTrigger>
          <TabsTrigger value="upload" className="gap-1.5">
            <FileUp className="size-3.5" />
            Upload a file
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-1.5">
            <Mail className="size-3.5" />
            Connect email
          </TabsTrigger>
        </TabsList>

        <TabsContent value="paste" className="mt-4">
          <textarea
            value={pastedText}
            onChange={(event) => setPastedText(event.target.value)}
            placeholder="send 50 of the M8 bearings we ordered last time, same as PO 4471, deliver to the Hamburg site"
            rows={5}
            className="w-full resize-none rounded-lg border border-[var(--om-border)] bg-[var(--om-bg)] p-3 text-sm leading-6 text-[var(--om-text)] outline-none placeholder:text-[var(--om-subtle)] focus-visible:ring-2 focus-visible:ring-[var(--om-accent)]"
          />
          <Button
            type="button"
            disabled={pastedText.trim().length === 0}
            onClick={onSubmit}
            className="mt-3 h-9 bg-[var(--om-accent)] text-[var(--om-accent-text)] hover:bg-[var(--om-accent-hover)]"
          >
            Review this order
          </Button>
        </TabsContent>

        <TabsContent value="upload" className="mt-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.csv,.xls,.xlsx,.txt"
            className="sr-only"
            onChange={(event) => setFileName(event.target.files?.[0]?.name ?? null)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center justify-between rounded-lg border border-dashed border-[var(--om-border-strong)] bg-[var(--om-bg)] p-4 text-left text-sm transition-colors hover:border-[var(--om-accent)]"
          >
            <span
              className={cn(
                fileName ? "font-semibold text-[var(--om-text)]" : "text-[var(--om-muted)]",
              )}
            >
              {fileName ?? "Choose a PDF, Excel, or CSV file"}
            </span>
            <span className="font-semibold text-[var(--om-accent)]">Browse</span>
          </button>
          <Button
            type="button"
            disabled={!fileName}
            onClick={onSubmit}
            className="mt-3 h-9 bg-[var(--om-accent)] text-[var(--om-accent-text)] hover:bg-[var(--om-accent-hover)]"
          >
            Review this order
          </Button>
        </TabsContent>

        <TabsContent value="email" className="mt-4">
          <p className="text-sm leading-6 text-[var(--om-muted)]">
            Forward order emails here. Only addresses you approve are accepted, so nothing else
            gets mixed in.
          </p>
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-[var(--om-border)] bg-[var(--om-bg)] px-3 py-2">
            <code className="flex-1 truncate font-mono text-sm text-[var(--om-text)]">
              {FORWARDING_ADDRESS}
            </code>
            <Button
              type="button"
              variant="outline"
              onClick={handleCopyAddress}
              className="h-8 px-3 text-xs"
            >
              {copied ? "Copied" : "Copy address"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <p className="mt-4 border-t border-[var(--om-border)] pt-3 text-xs leading-5 text-[var(--om-muted)]">
        Shown here using our sample catalog. Matching your own inventory starts with connecting
        your catalog, a setup step for later.
      </p>
    </div>
  );
}

export function OrderIntake() {
  const router = useRouter();
  const [showOwnOrder, setShowOwnOrder] = useState(false);
  const [sentOrderIds, setSentOrderIds] = useState<string[]>([]);

  useEffect(() => {
    setSentOrderIds(getSentOrderIds());
  }, []);

  const sentCount = sampleOrders.filter((order) => sentOrderIds.includes(order.id)).length;

  function submitOwnOrder() {
    navigateWithTransition(router, getOrderProcessingHref(primaryWalkthroughOrderId));
  }

  return (
    <AppShell>
      <main
        id="main"
        className="mx-auto flex min-h-screen w-full max-w-screen-2xl flex-col px-6 py-10 text-[var(--om-text)] sm:px-10 lg:px-16"
      >
        <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-8">
          <div className="max-w-2xl">
            <p className="font-mono text-sm font-bold uppercase tracking-[0.2em] text-[var(--om-accent)]">
              Start a review
            </p>
            <h1 className="mt-4 text-2xl font-extrabold leading-tight text-[var(--om-text)] sm:text-3xl">
              Pick an order to review.
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--om-muted)] sm:text-base">
              {sentCount > 0
                ? `You've sent ${sentCount} of ${sampleOrders.length} orders so far. Pick another below, or bring your own.`
                : "Choose one of the sample orders below, or bring your own."}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {sampleOrders.map((order) => (
              <SampleOrderCard key={order.id} order={order} isSent={sentOrderIds.includes(order.id)} />
            ))}
          </div>

          <div className="flex flex-col items-start gap-4">
            {showOwnOrder ? (
              <div className="w-full max-w-xl">
                <OwnOrderPanel onSubmit={submitOwnOrder} />
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowOwnOrder(true)}
                className="h-10 border-[var(--om-border)] bg-[var(--om-surface)] text-[var(--om-text)]"
              >
                Use your own order
              </Button>
            )}
          </div>
        </section>
      </main>
    </AppShell>
  );
}
