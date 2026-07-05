"use client";

import { cn } from "@/lib/utils";

type SegmentedToggleOption<T extends string> = {
  id: T;
  label: string;
};

type SegmentedToggleProps<T extends string> = {
  options: SegmentedToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  variant?: "surface" | "accent";
};

export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  variant = "surface",
}: SegmentedToggleProps<T>) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-lg border border-[var(--om-border)] bg-[var(--om-surface-2)] p-1 text-sm">
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              "rounded-md px-3 py-1.5 font-semibold transition-colors",
              active
                ? variant === "accent"
                  ? "bg-[var(--om-accent)] text-[var(--om-accent-text)]"
                  : "bg-[var(--om-surface)] text-[var(--om-text)] shadow-sm"
                : "text-[var(--om-muted)] hover:text-[var(--om-text)]",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
