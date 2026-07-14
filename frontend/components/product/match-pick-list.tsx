"use client";

import { useState } from "react";
import { AlertTriangle, Check, ChevronDown, Sparkles } from "lucide-react";

import { getCatalogItemById } from "@/lib/product-workflow";
import { cn } from "@/lib/utils";
import type { MatchCandidate } from "@/types/match";

/** How many alternatives sit below the fold. The reviewer sees the top pick
 * plus a couple of near-misses; the rest of the shortlist is one click away,
 * because a 10-item wall of screws is not a decision, it is a chore. */
const VISIBLE_ALTERNATIVES = 2;

function LearnedBadge({ timesChosen, pinned }: { timesChosen: number; pinned?: boolean }) {
  return (
    <span className="flex shrink-0 items-center gap-1 rounded-full border border-[var(--om-accent)] bg-[var(--om-accent-softer)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--om-accent)]">
      <Sparkles className="size-2.5" />
      {pinned ? "You always pick this" : `You picked this ${timesChosen}×`}
    </span>
  );
}

function CandidateRow({
  candidate,
  isTopPick,
  onPick,
}: {
  candidate: MatchCandidate;
  isTopPick: boolean;
  onPick: (candidateId: string) => void;
}) {
  const [showWhy, setShowWhy] = useState(false);

  const catalogItem = getCatalogItemById(candidate.catalogItemId);
  const name = catalogItem?.name ?? candidate.sku ?? "Catalog match";
  const learned = candidate.learnedSignal;
  const reasons = candidate.proofItems ?? [];
  const against = [...(candidate.missingEvidence ?? []), ...(candidate.conflictingEvidence ?? [])];
  const hasWhy = reasons.length > 0 || against.length > 0;

  return (
    <div
      className={cn(
        "rounded-md border bg-[var(--om-surface)]",
        isTopPick ? "border-[var(--om-accent)]" : "border-[var(--om-border)]",
      )}
    >
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={() => onPick(candidate.id)}
          className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-l-md px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--om-surface-2)]"
        >
          <span className="flex min-w-0 items-center gap-2">
            {isTopPick ? (
              <span className="shrink-0 rounded-sm bg-[var(--om-accent)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--om-accent-text)]">
                Top pick
              </span>
            ) : null}
            <span className="truncate font-medium text-[var(--om-text)]">{name}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {learned && (learned.pinned || learned.timesChosen > 0) ? (
              <LearnedBadge timesChosen={learned.timesChosen} pinned={learned.pinned} />
            ) : null}
            {candidate.sku ? (
              <span className="font-mono text-xs text-[var(--om-muted)]">{candidate.sku}</span>
            ) : null}
          </span>
        </button>

        {hasWhy ? (
          <button
            type="button"
            onClick={() => setShowWhy((open) => !open)}
            aria-expanded={showWhy}
            className="flex shrink-0 items-center gap-1 rounded-r-md border-l border-[var(--om-border)] px-2 text-xs font-medium text-[var(--om-muted)] transition-colors hover:bg-[var(--om-surface-2)] hover:text-[var(--om-text)]"
          >
            Why
            <ChevronDown className={cn("size-3 transition-transform", showWhy && "rotate-180")} />
          </button>
        ) : null}
      </div>

      {showWhy ? (
        <ul className="flex flex-col gap-1 border-t border-[var(--om-border)] px-3 py-2 text-xs">
          {reasons.map((proof) => (
            <li key={proof.id} className="flex items-start gap-1.5">
              <Check className="mt-0.5 size-3 shrink-0 text-green-600" />
              <span className="text-[var(--om-muted)]">
                {proof.label}
                {proof.sourceValue ? (
                  <span className="ml-1 font-medium text-[var(--om-text)]">
                    {proof.sourceValue}
                    {proof.catalogValue ? ` → ${proof.catalogValue}` : ""}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
          {against.map((note) => (
            <li key={note} className="flex items-start gap-1.5">
              <AlertTriangle className="mt-0.5 size-3 shrink-0 text-amber-600" />
              <span className="text-[var(--om-muted)]">{note}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

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
  const [showAll, setShowAll] = useState(false);

  const shortlisted = showAll ? candidates : candidates.slice(0, 1 + VISIBLE_ALTERNATIVES);
  const hiddenCount = candidates.length - shortlisted.length;

  return (
    <div className="mt-2 rounded-md border-l-2 border-[var(--om-accent)] bg-[var(--om-accent-softer)] p-3">
      <p className="text-xs font-semibold text-[var(--om-text)]">Which did you mean?</p>
      <div className="mt-2 flex flex-col gap-1.5">
        {shortlisted.map((candidate, index) => (
          <CandidateRow
            key={candidate.id}
            candidate={candidate}
            isTopPick={index === 0 && !showAll}
            onPick={onPick}
          />
        ))}

        {hiddenCount > 0 ? (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="rounded-md border border-dashed border-[var(--om-border-strong)] bg-[var(--om-surface)] px-3 py-1.5 text-xs font-medium text-[var(--om-muted)] transition-colors hover:border-[var(--om-accent)] hover:text-[var(--om-text)]"
          >
            Show {hiddenCount} more from the catalog
          </button>
        ) : null}

        <div className="rounded-md border border-dashed border-[var(--om-border-strong)] bg-[var(--om-surface)] p-3">
          <p className="text-xs font-medium text-[var(--om-muted)]">Not one of these?</p>
          <input
            value={customValue}
            onChange={(event) => onCustomChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && customValue.trim().length > 0) {
                onCustomSubmit();
              }
            }}
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
