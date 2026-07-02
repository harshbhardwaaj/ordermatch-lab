import type { OrderException, OrderRecord, ReadinessCheck } from "@/types/order";

export type ReadinessState =
  | "ready"
  | "review-needed"
  | "blocked"
  | "partial-data"
  | "validation-unavailable";

export function getBlockingExceptions(exceptions: OrderException[]) {
  return exceptions.filter(
    (exception) =>
      exception.status === "open" && exception.blocksErpReadiness,
  );
}

export function getReadinessState(checks: ReadinessCheck[]): ReadinessState {
  if (checks.length === 0) {
    return "validation-unavailable";
  }

  if (checks.some((check) => check.status === "unavailable")) {
    return "partial-data";
  }

  if (checks.some((check) => check.status === "blocked")) {
    return "blocked";
  }

  if (checks.some((check) => check.status === "review-needed")) {
    return "review-needed";
  }

  return "ready";
}

export function isErpReady(
  order: Pick<OrderRecord, "readinessChecks" | "exceptions">,
) {
  return (
    getReadinessState(order.readinessChecks) === "ready" &&
    getBlockingExceptions(order.exceptions).length === 0
  );
}

export function getReadinessBlockers(
  order: Pick<OrderRecord, "readinessChecks" | "exceptions">,
) {
  const checks = order.readinessChecks.filter(
    (check) => check.status === "blocked" || check.status === "unavailable",
  );

  return {
    checks,
    exceptions: getBlockingExceptions(order.exceptions),
  };
}
