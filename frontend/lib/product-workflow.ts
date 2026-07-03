import {
  primaryWalkthroughOrderId,
  sampleOrders,
  type SyntheticOrderRecord,
} from "@/data/orders";
import type { ConfidenceBand } from "@/types/match";
import type {
  ExceptionStatus,
  OrderException,
  OrderLineItem,
  OrderStatus,
  ReadinessCheck,
} from "@/types/order";

export type ReviewStageId = "fields" | "lines" | "exceptions" | "readiness";

export type WorkbenchStepStatus = "current" | "done" | "blocked" | "pending";

export type WorkbenchStep = {
  id: ReviewStageId;
  href: string;
  label: string;
  shortLabel: string;
  description: string;
  status: WorkbenchStepStatus;
};

export type ExceptionOverrides = Record<string, ExceptionStatus>;
export type AcceptedMatches = Record<string, string>;
export type RejectedMatches = Record<string, string[]>;

export type ReviewStateSnapshot = {
  exceptionOverrides: ExceptionOverrides;
  acceptedMatches: AcceptedMatches;
  rejectedMatches: RejectedMatches;
  readyOrderIds: string[];
};

export const reviewStages: Array<{
  id: ReviewStageId;
  label: string;
  shortLabel: string;
  description: string;
}> = [
  {
    id: "fields",
    label: "Check fields",
    shortLabel: "Fields",
    description: "Did we read the order correctly?",
  },
  {
    id: "lines",
    label: "Review line items",
    shortLabel: "Lines",
    description: "Did each customer line match the right product?",
  },
  {
    id: "exceptions",
    label: "Clear issues",
    shortLabel: "Issues",
    description: "What needs a person before this moves forward?",
  },
  {
    id: "readiness",
    label: "Ready for ERP",
    shortLabel: "Ready",
    description: "Can this order be approved?",
  },
];

export function getOrderById(orderId: string | undefined) {
  return (
    sampleOrders.find((order) => order.id === orderId) ??
    sampleOrders.find((order) => order.id === primaryWalkthroughOrderId) ??
    sampleOrders[0]
  );
}

export function getOrderReviewHref(orderId: string, stage: ReviewStageId = "fields") {
  return `/prototype/${orderId}/${stage}`;
}

export function getOpenExceptions(
  order: SyntheticOrderRecord,
  overrides: ExceptionOverrides,
) {
  return order.exceptions.map((exception) => ({
    ...exception,
    status: overrides[exception.id] ?? exception.status,
  }));
}

export function getBlockingExceptions(exceptions: OrderException[]) {
  return exceptions.filter(
    (exception) =>
      exception.status === "open" && exception.blocksErpReadiness,
  );
}

export function getLineCandidates(order: SyntheticOrderRecord, lineItemId: string) {
  return order.matchCandidates
    .filter((candidate) => candidate.lineItemId === lineItemId)
    .sort((a, b) => a.rank - b.rank);
}

export function getSelectedCandidateId(
  line: OrderLineItem,
  acceptedMatches: AcceptedMatches,
) {
  return acceptedMatches[line.id] ?? line.selectedMatchCandidateId;
}

export function getQueueConfidence(order: SyntheticOrderRecord): ConfidenceBand {
  const topCandidates = order.lineItems
    .map((line) => getLineCandidates(order, line.id)[0])
    .filter(Boolean);

  if (topCandidates.length === 0) {
    return "no-match";
  }

  if (topCandidates.some((candidate) => candidate.confidenceBand === "blocked")) {
    return "blocked";
  }

  if (topCandidates.some((candidate) => candidate.confidenceBand === "no-match")) {
    return "no-match";
  }

  if (
    topCandidates.some((candidate) => candidate.confidenceBand === "review-needed")
  ) {
    return "review-needed";
  }

  return "high-confidence";
}

export function getEstimatedMinutesSaved(order: SyntheticOrderRecord) {
  const autoMatchedLines = order.lineItems.filter(
    (line) => line.status === "matched",
  ).length;
  const reviewLoad = order.exceptions.filter(
    (exception) => exception.status === "open",
  ).length;

  return Math.max(4, autoMatchedLines * 5 + order.lineItems.length * 2 - reviewLoad * 2);
}

export function getDerivedReadinessChecks({
  order,
  exceptions,
  readyOrderIds,
}: {
  order: SyntheticOrderRecord;
  exceptions: OrderException[];
  readyOrderIds: string[];
}) {
  if (readyOrderIds.includes(order.id)) {
    return order.readinessChecks.map((check) => ({
      ...check,
      status: "passed" as const,
      reason: "Prototype action marked this check ready after review.",
    }));
  }

  return order.readinessChecks.map((check) => {
    const relatedExceptions = check.relatedExceptionIds?.map((id) =>
      exceptions.find((exception) => exception.id === id),
    );

    const everyRelatedExceptionResolved =
      relatedExceptions && relatedExceptions.length > 0
        ? relatedExceptions.every((exception) => exception?.status === "resolved")
        : false;

    if (everyRelatedExceptionResolved && check.status !== "unavailable") {
      return {
        ...check,
        status: "passed" as const,
        reason:
          "The related sample exception has been resolved in this prototype review.",
      };
    }

    return check;
  });
}

export function getReadinessState(
  checks: ReadinessCheck[],
  exceptions: OrderException[],
): OrderStatus {
  if (getBlockingExceptions(exceptions).length > 0) {
    return "blocked";
  }

  if (checks.some((check) => check.status === "blocked")) {
    return "blocked";
  }

  if (checks.some((check) => check.status === "review-needed")) {
    return "review-needed";
  }

  return "ready";
}

export function getReviewSteps({
  order,
  currentStage,
  state,
}: {
  order: SyntheticOrderRecord;
  currentStage: ReviewStageId;
  state: ReviewStateSnapshot;
}): WorkbenchStep[] {
  const exceptions = getOpenExceptions(order, state.exceptionOverrides);
  const checks = getDerivedReadinessChecks({
    order,
    exceptions,
    readyOrderIds: state.readyOrderIds,
  });
  const blockers = getBlockingExceptions(exceptions);
  const fieldsNeedReview = Object.values(order.header.fieldStatus).some(
    (status) => status === "missing" || status === "ambiguous" || status === "requires-review",
  );
  const unresolvedExceptions = exceptions.filter(
    (exception) => exception.status === "open",
  );
  const readinessState = getReadinessState(checks, exceptions);

  return reviewStages.map((stage) => {
    let status: WorkbenchStepStatus = "pending";

    if (stage.id === currentStage) {
      status = "current";
    } else if (stage.id === "fields") {
      status = fieldsNeedReview ? "blocked" : "done";
    } else if (stage.id === "lines") {
      status = order.lineItems.some(
        (line) => line.status === "blocked" || line.status === "no-match",
      )
        ? "blocked"
        : "done";
    } else if (stage.id === "exceptions") {
      status =
        blockers.length > 0
          ? "blocked"
          : unresolvedExceptions.length > 0
            ? "pending"
            : "done";
    } else if (stage.id === "readiness") {
      status = readinessState === "ready" ? "done" : "blocked";
    }

    return {
      ...stage,
      href: getOrderReviewHref(order.id, stage.id),
      status,
    };
  });
}
