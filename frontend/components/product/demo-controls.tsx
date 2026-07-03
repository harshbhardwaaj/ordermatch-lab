"use client";

import {
  type ActionFailureMode,
  type DocumentMode,
  type QueueMode,
  useOrderReview,
} from "@/components/product/order-review-provider";
import { cn } from "@/lib/utils";

const queueModes: { value: QueueMode; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "loading", label: "Loading" },
  { value: "empty", label: "Empty" },
  { value: "stale", label: "Stale" },
  { value: "partial", label: "Partial" },
  { value: "row-error", label: "Row issue" },
];

const documentModes: { value: DocumentMode; label: string }[] = [
  { value: "ready", label: "Preview" },
  { value: "loading", label: "Loading" },
  { value: "failed", label: "Failed" },
  { value: "unavailable", label: "Unavailable" },
  { value: "text", label: "Text only" },
];

const actionModes: { value: ActionFailureMode; label: string }[] = [
  { value: "normal", label: "Save" },
  { value: "fail-next", label: "Fail next save" },
];

function OptionButton<T extends string>({
  value,
  currentValue,
  label,
  onSelect,
}: {
  value: T;
  currentValue: T;
  label: string;
  onSelect: (value: T) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={cn(
        "rounded-md px-2.5 py-1.5 text-xs font-semibold text-[var(--om-muted)] transition-colors hover:text-[var(--om-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--om-accent)]",
        value === currentValue &&
          "bg-[var(--om-surface)] text-[var(--om-accent)] shadow-sm",
      )}
    >
      {label}
    </button>
  );
}

export function DemoControls({ scope }: { scope: "queue" | "review" }) {
  const {
    queueMode,
    setQueueMode,
    documentMode,
    setDocumentMode,
    failureMode,
    setFailureMode,
  } = useOrderReview();

  return (
    <details className="rounded-lg border border-dashed border-[var(--om-border-strong)] bg-[var(--om-surface-2)] p-3 text-sm">
      <summary className="cursor-pointer select-none font-semibold text-[var(--om-muted)]">
        Demo controls
      </summary>
      <p className="mt-2 text-xs leading-5 text-[var(--om-muted)]">
        Testing harness for sample states. These controls are not part of the real product workflow.
      </p>
      <div className="mt-3 grid gap-3">
        {scope === "queue" ? (
          <div>
            <p className="mb-1 text-xs font-semibold text-[var(--om-subtle)]">Queue state</p>
            <div className="flex flex-wrap gap-1 rounded-lg border border-[var(--om-border)] bg-[var(--om-bg)] p-1">
              {queueModes.map((mode) => (
                <OptionButton
                  key={mode.value}
                  value={mode.value}
                  currentValue={queueMode}
                  label={mode.label}
                  onSelect={setQueueMode}
                />
              ))}
            </div>
          </div>
        ) : null}
        {scope === "review" ? (
          <>
            <div>
              <p className="mb-1 text-xs font-semibold text-[var(--om-subtle)]">Document state</p>
              <div className="flex flex-wrap gap-1 rounded-lg border border-[var(--om-border)] bg-[var(--om-bg)] p-1">
                {documentModes.map((mode) => (
                  <OptionButton
                    key={mode.value}
                    value={mode.value}
                    currentValue={documentMode}
                    label={mode.label}
                    onSelect={setDocumentMode}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold text-[var(--om-subtle)]">Action mode</p>
              <div className="flex flex-wrap gap-1 rounded-lg border border-[var(--om-border)] bg-[var(--om-bg)] p-1">
                {actionModes.map((mode) => (
                  <OptionButton
                    key={mode.value}
                    value={mode.value}
                    currentValue={failureMode}
                    label={mode.label}
                    onSelect={setFailureMode}
                  />
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </details>
  );
}
