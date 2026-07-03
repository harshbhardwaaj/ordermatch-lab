"use client";

import { ProductPanel, StatusPill } from "@/components/product/product-ui";
import { useOrderReview } from "@/components/product/order-review-provider";
import type { ReviewStageId } from "@/lib/product-workflow";

const stageCopy: Record<
  ReviewStageId,
  { title: string; eyebrow: string; body: string; proof: string }
> = {
  fields: {
    title: "Check extracted fields",
    eyebrow: "Stage 1",
    body: "This stage will show the original customer context beside the fields the system read from it.",
    proof: "Direct visits already know the order, document state, and readiness blockers from shared provider state.",
  },
  lines: {
    title: "Review line items",
    eyebrow: "Stage 2",
    body: "This stage will show original customer wording beside normalized product details, with match details opened only after clicking a line.",
    proof: "Direct visits will default to the first line unless a reviewer has already selected another line.",
  },
  exceptions: {
    title: "Clear issues",
    eyebrow: "Stage 3",
    body: "This stage will group missing units, ambiguous SKUs, price mismatch, duplicate lines, no-match, discontinued, and low-confidence cases.",
    proof: "Exception status is derived from sample data plus provider overrides, so it does not depend on page visit order.",
  },
  readiness: {
    title: "Ready for ERP",
    eyebrow: "Stage 4",
    body: "This stage will show the live readiness checklist and final approval-ready action.",
    proof: "Readiness is recomputed from current sample decisions every time this route renders.",
  },
};

export function StageFoundationPlaceholder({ stage }: { stage: ReviewStageId }) {
  const { order, currentStage, readinessState, steps } = useOrderReview();
  const copy = stageCopy[stage];
  const step = steps.find((item) => item.id === stage);

  return (
    <ProductPanel
      title={copy.title}
      eyebrow={copy.eyebrow}
      action={
        <StatusPill
          label={step?.status === "current" ? "Current step" : step?.status ?? "Pending"}
          tone={step?.status === "blocked" ? "blocked" : step?.status === "done" ? "ready" : "review"}
        />
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <div className="rounded-lg border border-[var(--om-border)] bg-[var(--om-surface-2)] p-4">
          <p className="text-sm leading-6 text-[var(--om-muted)]">{copy.body}</p>
          <p className="mt-3 text-sm font-semibold leading-6 text-[var(--om-text)]">
            {copy.proof}
          </p>
        </div>
        <dl className="grid gap-3 rounded-lg border border-[var(--om-border)] bg-[var(--om-surface-2)] p-4 text-sm">
          <div>
            <dt className="text-xs font-semibold text-[var(--om-muted)]">Direct route state</dt>
            <dd className="mt-1 font-semibold text-[var(--om-text)]">
              {currentStage === stage ? "Loaded from URL" : "Available from provider"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-[var(--om-muted)]">Order</dt>
            <dd className="mt-1 font-semibold text-[var(--om-text)]">{order.header.orderId}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-[var(--om-muted)]">Readiness now</dt>
            <dd className="mt-1 font-semibold text-[var(--om-text)]">{readinessState}</dd>
          </div>
        </dl>
      </div>
    </ProductPanel>
  );
}
