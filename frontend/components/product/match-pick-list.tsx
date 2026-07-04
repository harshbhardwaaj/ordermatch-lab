"use client";

import { getCatalogItemById } from "@/lib/product-workflow";
import type { MatchCandidate } from "@/types/match";

export function MatchPickList({
  candidates,
  customValue,
  onCustomChange,
  onCustomSubmit,
  onDefer,
  onPick,
}: {
  candidates: MatchCandidate[];
  customValue: string;
  onCustomChange: (value: string) => void;
  onCustomSubmit: () => void;
  onDefer?: () => void;
  onPick: (candidateId: string) => void;
}) {
  return (
    <div className="mt-2 rounded-md border-l-2 border-[var(--om-accent)] bg-[var(--om-accent-softer)] p-3">
      <p className="text-xs font-semibold text-[var(--om-text)]">Which did you mean?</p>
      <div className="mt-2 flex flex-col gap-1.5">
        {candidates.map((candidate) => (
          <button
            key={candidate.id}
            type="button"
            onClick={() => onPick(candidate.id)}
            className="flex w-full items-center justify-between gap-3 rounded-md border border-[var(--om-border)] bg-[var(--om-surface)] px-3 py-2 text-left text-sm transition-colors hover:border-[var(--om-accent)] hover:bg-[var(--om-surface-2)]"
          >
            <span className="truncate font-medium text-[var(--om-text)]">
              {getCatalogItemById(candidate.catalogItemId)?.name ?? candidate.sku ?? "Catalog match"}
            </span>
            {candidate.sku ? (
              <span className="shrink-0 font-mono text-xs text-[var(--om-muted)]">{candidate.sku}</span>
            ) : null}
          </button>
        ))}

        <div className="rounded-md border border-dashed border-[var(--om-border-strong)] bg-[var(--om-surface)] p-3">
          <p className="text-xs font-medium text-[var(--om-muted)]">Not one of these?</p>
          <input
            value={customValue}
            onChange={(event) => onCustomChange(event.target.value)}
            placeholder="Type the correct match..."
            className="mt-1.5 w-full rounded-md border border-[var(--om-border)] bg-[var(--om-bg)] px-2 py-1.5 text-sm text-[var(--om-text)] outline-none placeholder:text-[var(--om-subtle)] focus-visible:ring-2 focus-visible:ring-[var(--om-accent)]"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={customValue.trim().length === 0}
              onClick={onCustomSubmit}
              className="flex-1 rounded-md bg-[var(--om-accent)] px-3 py-1.5 text-xs font-semibold text-[var(--om-accent-text)] transition-colors hover:bg-[var(--om-accent-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Use this answer
            </button>
            {onDefer ? (
              <button
                type="button"
                onClick={onDefer}
                className="flex-1 rounded-md border border-[var(--om-border-strong)] bg-[var(--om-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--om-text)] transition-colors hover:border-[var(--om-accent)] hover:bg-[var(--om-surface-2)]"
              >
                Decide later
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
