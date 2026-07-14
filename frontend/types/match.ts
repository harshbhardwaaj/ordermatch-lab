export type ConfidenceBand =
  | "high-confidence"
  | "review-needed"
  | "blocked"
  | "no-match";

export type MatchReasonKind =
  | "size"
  | "material"
  | "standard"
  | "unit"
  | "customer-part-number"
  | "synonym"
  | "catalog-attribute"
  | "price"
  | "availability";

export type CandidateProofItem = {
  id: string;
  kind: MatchReasonKind;
  label: string;
  sourceValue: string;
  catalogValue?: string;
  supportsMatch: boolean;
};

/** What this customer's own past corrections say about this candidate. Absent
 * until the correction memory (step 2) starts feeding the matcher; when
 * present it is why the candidate moved up or down the list. */
export type LearnedSignal = {
  timesChosen: number;
  timesRejected: number;
  /** Set when this exact request text was corrected to this SKU before, so
   * the candidate is pinned rather than merely nudged. */
  pinned?: boolean;
};

export type MatchCandidate = {
  id: string;
  lineItemId: string;
  catalogItemId?: string;
  sku?: string;
  learnedSignal?: LearnedSignal;
  // Backend-internal only (see backend/common/choices.py's ConfidenceBand
  // docstring and clarifications.md §7): the real backend deliberately
  // excludes these from the API response, so they're optional here, not
  // guaranteed. No live component reads either field.
  confidenceBand?: ConfidenceBand;
  score?: number;
  rank: number;
  proofItems: CandidateProofItem[];
  missingEvidence?: string[];
  conflictingEvidence?: string[];
  requiresHumanReview: boolean;
};

export type MatchDecision = {
  candidateId: string;
  lineItemId: string;
  decision: "accepted" | "rejected" | "deferred";
  decidedAt: string;
  note?: string;
  isSimulated: boolean;
};
