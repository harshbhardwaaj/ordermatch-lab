import type { ConfidenceBand, MatchCandidate } from "@/types/match";

export const confidenceThresholds = {
  highConfidence: 0.86,
  reviewNeeded: 0.55,
} as const;

export function getConfidenceBand(
  score: number | undefined,
  options: {
    hasCatalogMatch?: boolean;
    hasBlockingEvidence?: boolean;
  } = {},
): ConfidenceBand {
  if (!options.hasCatalogMatch) {
    return "no-match";
  }

  if (options.hasBlockingEvidence) {
    return "blocked";
  }

  if (score === undefined || score < confidenceThresholds.reviewNeeded) {
    return "blocked";
  }

  if (score >= confidenceThresholds.highConfidence) {
    return "high-confidence";
  }

  return "review-needed";
}

export function isHighConfidenceMatch(candidate: MatchCandidate) {
  return candidate.confidenceBand === "high-confidence";
}

export function needsHumanReview(candidate: MatchCandidate) {
  return (
    candidate.requiresHumanReview ||
    candidate.confidenceBand === "review-needed" ||
    candidate.confidenceBand === "blocked" ||
    candidate.confidenceBand === "no-match"
  );
}

export function isBlockedMatch(candidate: MatchCandidate) {
  return candidate.confidenceBand === "blocked";
}

export function isNoMatch(candidate: MatchCandidate) {
  return candidate.confidenceBand === "no-match";
}
