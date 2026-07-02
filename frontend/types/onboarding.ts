export type OnboardingStepStatus =
  | "not-started"
  | "in-progress"
  | "complete"
  | "blocked"
  | "requires-review";

export type OnboardingStepKey =
  | "catalog-ingestion"
  | "field-mapping"
  | "customer-rules"
  | "eval-baseline"
  | "readiness-checks";

export type OnboardingStep = {
  key: OnboardingStepKey;
  label: string;
  status: OnboardingStepStatus;
  blockers?: string[];
  completedAt?: string;
};

export type CustomerRule = {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
};

export type OnboardingSetup = {
  id: string;
  customerName: string;
  steps: OnboardingStep[];
  customerRules: CustomerRule[];
  catalogItemCount?: number;
  isSimulated: boolean;
  updatedAt?: string;
};
