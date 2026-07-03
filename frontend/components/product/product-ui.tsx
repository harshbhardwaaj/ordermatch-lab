import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { TransitionLink } from "@/components/view-transition-link";
import { icons } from "@/lib/icons";
import { cn } from "@/lib/utils";
import type { WorkbenchStep } from "@/lib/product-workflow";
import type { FeedbackMessage } from "@/components/product/order-review-provider";

type StatusTone = "ready" | "review" | "blocked" | "neutral" | "simulated";

export function StatusPill({
  label,
  tone = "neutral",
  className,
}: {
  label: string;
  tone?: StatusTone;
  className?: string;
}) {
  const Icon =
    tone === "ready"
      ? icons.success
      : tone === "blocked"
        ? icons.blocked
        : tone === "review"
          ? icons.review
          : icons.pending;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
        tone === "ready" && "border-green-200 bg-green-50 text-green-700",
        tone === "blocked" && "border-red-200 bg-red-50 text-red-700",
        tone === "review" && "border-amber-200 bg-amber-50 text-amber-700",
        tone === "simulated" && "border-slate-200 bg-slate-100 text-slate-700",
        tone === "neutral" &&
          "border-[var(--om-border)] bg-[var(--om-surface-2)] text-[var(--om-muted)]",
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {label}
    </span>
  );
}

export function ProductPanel({
  title,
  eyebrow,
  children,
  action,
  className,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-lg border border-[var(--om-border)] bg-[var(--om-surface)] p-4 shadow-sm",
        className,
      )}
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {eyebrow ? (
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--om-subtle)]">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="mt-1 text-base font-bold text-[var(--om-text)]">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--om-border-strong)] bg-[var(--om-surface-2)] p-6 text-sm">
      <p className="font-semibold text-[var(--om-text)]">{title}</p>
      <p className="mt-2 leading-6 text-[var(--om-muted)]">{message}</p>
      <p className="mt-3 font-semibold text-[var(--om-accent)]">{action}</p>
    </div>
  );
}

export function FeedbackBanner({
  feedback,
  onDismiss,
}: {
  feedback?: FeedbackMessage;
  onDismiss: () => void;
}) {
  if (!feedback) {
    return null;
  }

  const isError = feedback.kind === "error";
  const isRollback = feedback.kind === "rollback";

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "mb-4 flex flex-col gap-3 rounded-lg border p-4 text-sm sm:flex-row sm:items-start sm:justify-between",
        isError && "border-red-200 bg-red-50 text-red-800",
        isRollback && "border-blue-200 bg-blue-50 text-blue-800",
        !isError && !isRollback && "border-green-200 bg-green-50 text-green-800",
      )}
    >
      <div>
        <p className="font-bold">{feedback.title}</p>
        <p className="mt-1 leading-6">{feedback.message}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        {feedback.rollback ? (
          <Button
            type="button"
            variant="outline"
            className="h-8 border-current bg-transparent px-3 text-xs text-current hover:bg-white/60"
            onClick={feedback.rollback}
          >
            Undo
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          className="h-8 px-3 text-xs text-current hover:bg-white/60"
          onClick={onDismiss}
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}

function getMobileStepTone(status: WorkbenchStep["status"]) {
  if (status === "current") {
    return "border-[var(--om-accent)] bg-[var(--om-accent-soft)] text-[var(--om-accent)]";
  }

  if (status === "done") {
    return "border-green-200 bg-green-50 text-green-700";
  }

  if (status === "blocked") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-[var(--om-border)] bg-[var(--om-surface)] text-[var(--om-muted)]";
}

export function MobileStageBar({ steps }: { steps: WorkbenchStep[] }) {
  if (steps.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Order review stages"
      className="overflow-x-auto border-b border-[var(--om-border)] bg-[var(--om-bg)] px-4 py-3 md:hidden"
    >
      <div className="flex min-w-max gap-2">
        {steps.map((step) => (
          <TransitionLink
            key={step.id}
            href={step.href}
            aria-current={step.status === "current" ? "step" : undefined}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold",
              getMobileStepTone(step.status),
            )}
          >
            <span className="size-2 rounded-full bg-current" />
            {step.shortLabel}
          </TransitionLink>
        ))}
      </div>
    </nav>
  );
}
