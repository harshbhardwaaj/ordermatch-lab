"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

import type { MatchCandidate } from "@/types/match";
import type { OrderException, OrderLineItem } from "@/types/order";
import {
  getDerivedReadinessChecks,
  getOpenExceptions,
  getOrderById,
  getReadinessState,
  getReviewSteps,
  type AcceptedMatches,
  type ExceptionOverrides,
  type RejectedMatches,
  type ReviewStageId,
  type WorkbenchStep,
} from "@/lib/product-workflow";
import type { SyntheticOrderRecord } from "@/data/orders";

export type QueueMode =
  | "normal"
  | "loading"
  | "empty"
  | "stale"
  | "partial"
  | "row-error";

export type DocumentMode = "ready" | "loading" | "failed" | "unavailable" | "text";
export type ActionFailureMode = "normal" | "fail-next";
export type FeedbackKind = "success" | "error" | "rollback";
export type ActionKind =
  | "accept-match"
  | "reject-match"
  | "resolve-exception"
  | "mark-ready";

export type FeedbackMessage = {
  id: number;
  kind: FeedbackKind;
  title: string;
  message: string;
  actionKind?: ActionKind;
  rollback?: () => void;
};

type PerformActionOptions = {
  kind: ActionKind;
  successTitle: string;
  successMessage: string;
  failureMessage: string;
  apply: () => void;
  rollback: () => void;
};

type OrderReviewContextValue = {
  order: SyntheticOrderRecord;
  currentStage: ReviewStageId;
  steps: WorkbenchStep[];
  queueMode: QueueMode;
  setQueueMode: (mode: QueueMode) => void;
  documentMode: DocumentMode;
  setDocumentMode: (mode: DocumentMode) => void;
  selectedLineId?: string;
  setSelectedLineId: (lineId: string | undefined) => void;
  exceptionOverrides: ExceptionOverrides;
  acceptedMatches: AcceptedMatches;
  rejectedMatches: RejectedMatches;
  readyOrderIds: string[];
  failureMode: ActionFailureMode;
  setFailureMode: (mode: ActionFailureMode) => void;
  feedback?: FeedbackMessage;
  dismissFeedback: () => void;
  visibleExceptions: OrderException[];
  readinessChecks: ReturnType<typeof getDerivedReadinessChecks>;
  readinessState: ReturnType<typeof getReadinessState>;
  acceptMatch: (line: OrderLineItem, candidate: MatchCandidate) => void;
  rejectMatch: (line: OrderLineItem, candidate: MatchCandidate) => void;
  resolveException: (exception: OrderException) => void;
  markReady: () => void;
};

const OrderReviewContext = createContext<OrderReviewContextValue | null>(null);

function useActionFeedback() {
  const [feedback, setFeedback] = useState<FeedbackMessage | undefined>();

  function setActionFeedback(nextFeedback: Omit<FeedbackMessage, "id">) {
    setFeedback({
      id: Date.now(),
      ...nextFeedback,
    });
  }

  return {
    feedback,
    setActionFeedback,
    dismissFeedback: () => setFeedback(undefined),
  };
}

export function OrderReviewProvider({
  orderId,
  children,
}: {
  orderId: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const order = useMemo(() => getOrderById(orderId), [orderId]);
  const currentStage = useMemo<ReviewStageId>(() => {
    const maybeStage = pathname.split("/").filter(Boolean).at(-1);

    if (
      maybeStage === "fields" ||
      maybeStage === "lines" ||
      maybeStage === "exceptions" ||
      maybeStage === "readiness"
    ) {
      return maybeStage;
    }

    return "fields";
  }, [pathname]);
  const [queueMode, setQueueMode] = useState<QueueMode>("normal");
  const [documentMode, setDocumentMode] = useState<DocumentMode>("ready");
  const [selectedLineId, setSelectedLineId] = useState<string | undefined>();
  const [exceptionOverrides, setExceptionOverrides] = useState<ExceptionOverrides>({});
  const [acceptedMatches, setAcceptedMatches] = useState<AcceptedMatches>({});
  const [rejectedMatches, setRejectedMatches] = useState<RejectedMatches>({});
  const [readyOrderIds, setReadyOrderIds] = useState<string[]>([]);
  const [failureMode, setFailureMode] = useState<ActionFailureMode>("normal");
  const { feedback, setActionFeedback, dismissFeedback } = useActionFeedback();

  const visibleExceptions = useMemo(
    () => getOpenExceptions(order, exceptionOverrides),
    [order, exceptionOverrides],
  );

  const readinessChecks = useMemo(
    () =>
      getDerivedReadinessChecks({
        order,
        exceptions: visibleExceptions,
        readyOrderIds,
      }),
    [order, readyOrderIds, visibleExceptions],
  );

  const readinessState = useMemo(
    () => getReadinessState(readinessChecks, visibleExceptions),
    [readinessChecks, visibleExceptions],
  );

  const steps = useMemo(
    () =>
      getReviewSteps({
        order,
        currentStage,
        state: {
          exceptionOverrides,
          acceptedMatches,
          rejectedMatches,
          readyOrderIds,
        },
      }),
    [
      acceptedMatches,
      currentStage,
      exceptionOverrides,
      order,
      readyOrderIds,
      rejectedMatches,
    ],
  );

  function performAction({
    kind,
    successTitle,
    successMessage,
    failureMessage,
    apply,
    rollback,
  }: PerformActionOptions) {
    if (failureMode === "fail-next") {
      setFailureMode("normal");
      setActionFeedback({
        kind: "error",
        title: "Prototype save failed.",
        message: failureMessage,
        actionKind: kind,
      });
      return;
    }

    apply();
    setActionFeedback({
      kind: "success",
      title: successTitle,
      message: successMessage,
      actionKind: kind,
      rollback: () => {
        rollback();
        setActionFeedback({
          kind: "rollback",
          title: "Prototype change rolled back.",
          message: "The sample order state was restored locally. No backend was called.",
          actionKind: kind,
        });
      },
    });
  }

  function acceptMatch(line: OrderLineItem, candidate: MatchCandidate) {
    const previousAccepted = acceptedMatches[line.id];
    const previousRejected = rejectedMatches[line.id] ?? [];

    performAction({
      kind: "accept-match",
      successTitle: "Match accepted.",
      successMessage: `Prototype action: ${candidate.sku ?? "this match"} is now selected for line ${line.lineNumber}.`,
      failureMessage:
        "The accepted match was not saved. The previous sample decision is still visible, so review can continue.",
      apply: () => {
        setAcceptedMatches((current) => ({ ...current, [line.id]: candidate.id }));
        setRejectedMatches((current) => ({
          ...current,
          [line.id]: (current[line.id] ?? []).filter((id) => id !== candidate.id),
        }));
      },
      rollback: () => {
        setAcceptedMatches((current) => {
          const next = { ...current };
          if (previousAccepted) {
            next[line.id] = previousAccepted;
          } else {
            delete next[line.id];
          }
          return next;
        });
        setRejectedMatches((current) => ({ ...current, [line.id]: previousRejected }));
      },
    });
  }

  function rejectMatch(line: OrderLineItem, candidate: MatchCandidate) {
    const previousAccepted = acceptedMatches[line.id];
    const previousRejected = rejectedMatches[line.id] ?? [];

    performAction({
      kind: "reject-match",
      successTitle: "Match rejected.",
      successMessage: `Prototype action: line ${line.lineNumber} stays in review until a better SKU is selected.`,
      failureMessage:
        "The rejected match was not saved. The previous sample decision is still visible, so review can continue.",
      apply: () => {
        setRejectedMatches((current) => ({
          ...current,
          [line.id]: Array.from(new Set([...(current[line.id] ?? []), candidate.id])),
        }));
        setAcceptedMatches((current) => {
          if (current[line.id] !== candidate.id) {
            return current;
          }

          const next = { ...current };
          delete next[line.id];
          return next;
        });
      },
      rollback: () => {
        setAcceptedMatches((current) => {
          const next = { ...current };
          if (previousAccepted) {
            next[line.id] = previousAccepted;
          } else {
            delete next[line.id];
          }
          return next;
        });
        setRejectedMatches((current) => ({ ...current, [line.id]: previousRejected }));
      },
    });
  }

  function resolveException(exception: OrderException) {
    const previousStatus = exceptionOverrides[exception.id];

    performAction({
      kind: "resolve-exception",
      successTitle: "Exception resolved.",
      successMessage: `Prototype action: "${exception.title}" no longer blocks this sample order.`,
      failureMessage:
        "The exception resolution was not saved. The issue remains open and still affects readiness.",
      apply: () => {
        setExceptionOverrides((current) => ({
          ...current,
          [exception.id]: "resolved",
        }));
      },
      rollback: () => {
        setExceptionOverrides((current) => {
          const next = { ...current };
          if (previousStatus) {
            next[exception.id] = previousStatus;
          } else {
            delete next[exception.id];
          }
          return next;
        });
      },
    });
  }

  function markReady() {
    const wasReady = readyOrderIds.includes(order.id);

    performAction({
      kind: "mark-ready",
      successTitle: "Order marked approval-ready.",
      successMessage:
        "Prototype action: the sample order reached the final reviewed state. No ERP record was created.",
      failureMessage:
        "The ERP-ready action failed. The sample order was not marked ready, and no downstream record was created.",
      apply: () => {
        setReadyOrderIds((current) =>
          current.includes(order.id) ? current : [...current, order.id],
        );
      },
      rollback: () => {
        setReadyOrderIds((current) =>
          wasReady ? current : current.filter((readyOrderId) => readyOrderId !== order.id),
        );
      },
    });
  }

  const value: OrderReviewContextValue = {
    order,
    currentStage,
    steps,
    queueMode,
    setQueueMode,
    documentMode,
    setDocumentMode,
    selectedLineId,
    setSelectedLineId,
    exceptionOverrides,
    acceptedMatches,
    rejectedMatches,
    readyOrderIds,
    failureMode,
    setFailureMode,
    feedback,
    dismissFeedback,
    visibleExceptions,
    readinessChecks,
    readinessState,
    acceptMatch,
    rejectMatch,
    resolveException,
    markReady,
  };

  return (
    <OrderReviewContext.Provider value={value}>
      {children}
    </OrderReviewContext.Provider>
  );
}

export function useOrderReview() {
  const context = useContext(OrderReviewContext);

  if (!context) {
    throw new Error("useOrderReview must be used inside OrderReviewProvider.");
  }

  return context;
}
