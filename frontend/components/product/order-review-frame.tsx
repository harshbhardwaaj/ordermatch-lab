"use client";

import { AppShell } from "@/components/app-shell";
import { DemoControls } from "@/components/product/demo-controls";
import {
  FeedbackBanner,
  MobileStageBar,
  StatusPill,
} from "@/components/product/product-ui";
import { TransitionLink } from "@/components/view-transition-link";
import { formatDate, formatStatusFromSlug } from "@/lib/formatters";
import { getOrderReviewHref } from "@/lib/product-workflow";
import { useOrderReview } from "@/components/product/order-review-provider";

export function OrderReviewFrame({ children }: { children: React.ReactNode }) {
  const {
    order,
    currentStage,
    steps,
    feedback,
    dismissFeedback,
    visibleExceptions,
    readinessState,
  } = useOrderReview();
  const blockers = visibleExceptions.filter(
    (exception) => exception.status === "open" && exception.blocksErpReadiness,
  );
  const currentStep = steps.find((step) => step.id === currentStage);

  return (
    <AppShell workbenchSteps={steps}>
      <MobileStageBar steps={steps} />
      <main
        id="main"
        className="mx-auto flex min-h-screen w-full max-w-screen-2xl flex-col gap-5 px-4 py-6 text-[var(--om-text)] sm:px-6 lg:px-8"
      >
        <div className="flex flex-col gap-3">
          <TransitionLink
            href="/prototype"
            className="w-fit text-sm font-semibold text-[var(--om-accent)] outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[var(--om-accent)]"
          >
            Back to order queue
          </TransitionLink>
          <section className="rounded-lg border border-[var(--om-border)] bg-[var(--om-surface)] p-4 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill label="Sample data" tone="simulated" />
                  <StatusPill
                    label={formatStatusFromSlug(readinessState)}
                    tone={
                      readinessState === "ready"
                        ? "ready"
                        : readinessState === "blocked"
                          ? "blocked"
                          : "review"
                    }
                  />
                  {blockers.length > 0 ? (
                    <StatusPill
                      label={`${blockers.length} blocker${blockers.length === 1 ? "" : "s"}`}
                      tone="blocked"
                    />
                  ) : (
                    <StatusPill label="No blocking issues" tone="ready" />
                  )}
                </div>
                <h1 className="mt-3 text-2xl font-extrabold tracking-normal text-[var(--om-text)]">
                  {currentStep?.label ?? "Review order"} for {order.header.orderId}
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--om-muted)]">
                  {currentStep?.description ??
                    "Move through the review stages and watch readiness update as decisions are made."}
                </p>
              </div>
              <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:min-w-[420px]">
                <div>
                  <dt className="text-xs font-semibold text-[var(--om-muted)]">Customer</dt>
                  <dd className="mt-1 font-semibold text-[var(--om-text)]">
                    {order.header.customerName}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-[var(--om-muted)]">Delivery</dt>
                  <dd className="mt-1 font-semibold text-[var(--om-text)]">
                    {order.header.requestedDeliveryDate
                      ? formatDate(order.header.requestedDeliveryDate)
                      : "Needs review"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-[var(--om-muted)]">Source</dt>
                  <dd className="mt-1 font-semibold text-[var(--om-text)]">
                    {formatStatusFromSlug(order.header.source)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-[var(--om-muted)]">ERP system</dt>
                  <dd className="mt-1 font-semibold text-[var(--om-text)]">
                    {order.customerProfile.erpSystem}
                  </dd>
                </div>
              </dl>
            </div>
          </section>
        </div>

        <FeedbackBanner feedback={feedback} onDismiss={dismissFeedback} />
        {children}
        <div className="max-w-3xl">
          <DemoControls scope="review" />
        </div>
        <div className="flex flex-wrap gap-2 pb-6">
          {steps.map((step) => (
            <TransitionLink
              key={step.id}
              href={getOrderReviewHref(order.id, step.id)}
              className="rounded-full border border-[var(--om-border)] bg-[var(--om-surface)] px-3 py-2 text-xs font-semibold text-[var(--om-muted)] transition-colors hover:text-[var(--om-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--om-accent)]"
            >
              {step.label}
            </TransitionLink>
          ))}
        </div>
      </main>
    </AppShell>
  );
}
