import type { EvalRun } from "@/types/eval";

export const evalDataNotice = {
  label: "Simulated eval output from grounded synthetic labels",
  description:
    "Static v0 eval metrics derived from the sample orders and their ground-truth labels. Later backend phases should compute these metrics from labels rather than treating them as fixed UI copy.",
  sourceData: ["frontend/data/orders.ts", "frontend/data/catalog.ts"],
} as const;

export const sampleEvalRuns: EvalRun[] = [
  {
    id: "eval-grounded-synthetic-v0-001",
    status: "complete",
    startedAt: "2026-07-01T16:20:00+02:00",
    completedAt: "2026-07-01T16:22:00+02:00",
    metrics: [
      {
        key: "extraction-accuracy",
        label: "Extraction field accuracy",
        value: 91,
        unit: "percent",
        sampleSize: 16,
        lastUpdatedAt: "2026-07-01T16:22:00+02:00",
      },
      {
        key: "sku-top-1-accuracy",
        label: "SKU top-1 accuracy",
        value: 69,
        unit: "percent",
        sampleSize: 16,
        lastUpdatedAt: "2026-07-01T16:22:00+02:00",
      },
      {
        key: "sku-top-3-recall",
        label: "SKU top-3 recall",
        value: 88,
        unit: "percent",
        sampleSize: 16,
        lastUpdatedAt: "2026-07-01T16:22:00+02:00",
      },
      {
        key: "human-correction-rate",
        label: "Human correction rate",
        value: 44,
        unit: "percent",
        sampleSize: 16,
        lastUpdatedAt: "2026-07-01T16:22:00+02:00",
      },
      {
        key: "auto-approval-rate",
        label: "Auto-approval-ready lines",
        value: 50,
        unit: "percent",
        sampleSize: 16,
        lastUpdatedAt: "2026-07-01T16:22:00+02:00",
      },
      {
        key: "false-confident-matches",
        label: "False confident matches",
        value: 0,
        unit: "count",
        sampleSize: 16,
        lastUpdatedAt: "2026-07-01T16:22:00+02:00",
      },
      {
        key: "exception-category-count",
        label: "Open exception categories",
        value: 9,
        unit: "count",
        sampleSize: 11,
        lastUpdatedAt: "2026-07-01T16:22:00+02:00",
      },
      {
        key: "estimated-time-saved",
        label: "Estimated review time saved",
        value: 38,
        unit: "minutes",
        sampleSize: 4,
        lastUpdatedAt: "2026-07-01T16:22:00+02:00",
      },
    ],
    failureCases: [
      {
        id: "failure-bearing-neighbor-review",
        lineItemId: "vh-20",
        metricKey: "sku-top-1-accuracy",
        title: "Near-neighbor bearing variants need visible review",
        expected: "6205-2RS C3 is ranked first, with ZZ and open variants visible as alternates.",
        actual:
          "The top suggestion is correct, but the line remains review-needed because several catalog rows share the 6205 designation.",
        severity: "review",
      },
      {
        id: "failure-motor-low-confidence",
        lineItemId: "ms-30",
        metricKey: "false-confident-matches",
        title: "Low-detail motor request must not become a confident match",
        expected:
          "The system blocks ERP readiness until speed, quantity, and unit are confirmed.",
        actual:
          "Two gear motors are plausible, so both candidates stay blocked with missing evidence.",
        severity: "blocking",
      },
      {
        id: "failure-custom-hose-no-match",
        lineItemId: "lp-40",
        metricKey: "exception-category-count",
        title: "Custom hose assembly has no catalog match",
        expected:
          "The system routes the line to non-stock item creation or engineering review.",
        actual:
          "No catalog SKU is suggested because the sample catalog only contains fittings, not hose assemblies.",
        severity: "blocking",
      },
      {
        id: "failure-price-mismatch-cable",
        lineItemId: "ms-20",
        metricKey: "human-correction-rate",
        title: "Cable match is correct but price needs sales review",
        expected:
          "The system keeps the SKU suggestion but flags the requested price against catalog price.",
        actual:
          "The match is review-needed because the RFQ price is below the catalog price.",
        severity: "review",
      },
    ],
    isSimulated: true,
  },
  {
    id: "eval-grounded-synthetic-v0-stale",
    status: "stale",
    startedAt: "2026-06-28T09:15:00+02:00",
    completedAt: "2026-06-28T09:17:00+02:00",
    metrics: [
      {
        key: "extraction-accuracy",
        label: "Extraction field accuracy",
        value: 87,
        unit: "percent",
        sampleSize: 12,
        lastUpdatedAt: "2026-06-28T09:17:00+02:00",
      },
      {
        key: "sku-top-1-accuracy",
        label: "SKU top-1 accuracy",
        value: 64,
        unit: "percent",
        sampleSize: 12,
        lastUpdatedAt: "2026-06-28T09:17:00+02:00",
      },
    ],
    failureCases: [],
    isSimulated: true,
  },
];

export const activeEvalRunId = "eval-grounded-synthetic-v0-001";
