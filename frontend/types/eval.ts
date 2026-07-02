export type EvalRunStatus =
  | "not-started"
  | "queued"
  | "running"
  | "complete"
  | "failed"
  | "stale"
  | "partial";

export type EvalMetricKey =
  | "extraction-accuracy"
  | "sku-top-1-accuracy"
  | "sku-top-3-recall"
  | "human-correction-rate"
  | "auto-approval-rate"
  | "false-confident-matches"
  | "exception-category-count"
  | "estimated-time-saved";

export type EvalMetric = {
  key: EvalMetricKey;
  label: string;
  value: number;
  unit: "percent" | "count" | "minutes";
  sampleSize?: number;
  lastUpdatedAt?: string;
};

export type EvalFailureCase = {
  id: string;
  lineItemId?: string;
  metricKey: EvalMetricKey;
  title: string;
  expected: string;
  actual: string;
  severity: "review" | "blocking";
};

export type EvalRun = {
  id: string;
  status: EvalRunStatus;
  startedAt?: string;
  completedAt?: string;
  metrics: EvalMetric[];
  failureCases: EvalFailureCase[];
  isSimulated: boolean;
};
