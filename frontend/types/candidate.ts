export type CandidateCapability =
  | "full-stack"
  | "ai-evals"
  | "document-workflow"
  | "data-products"
  | "product-judgment"
  | "deployment";

export type CandidateProofLink = {
  label: string;
  href: string;
};

export type CandidateProjectProof = {
  id: string;
  title: string;
  capability: CandidateCapability;
  summary: string;
  proofMetric?: string;
  links: CandidateProofLink[];
};
