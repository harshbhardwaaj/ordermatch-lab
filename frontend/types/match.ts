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

export type MatchCandidate = {
  id: string;
  lineItemId: string;
  catalogItemId?: string;
  sku?: string;
  confidenceBand: ConfidenceBand;
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
