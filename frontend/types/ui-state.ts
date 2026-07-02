export type AsyncStatus =
  | "idle"
  | "loading"
  | "success"
  | "error"
  | "empty"
  | "partial";

export type FreshnessStatus = "fresh" | "stale";

export type DataSourceMode = "simulated" | "backend-backed";

export type UiError = {
  title: string;
  message: string;
  recoveryAction?: string;
};

export type UiStateMeta = {
  source: DataSourceMode;
  freshness: FreshnessStatus;
  updatedAt?: string;
  isRecoverable?: boolean;
};

export type UiState<T> =
  | {
      status: "idle" | "loading";
      data?: T;
      meta: UiStateMeta;
    }
  | {
      status: "success";
      data: T;
      meta: UiStateMeta;
    }
  | {
      status: "error";
      data?: T;
      error: UiError;
      meta: UiStateMeta;
    }
  | {
      status: "empty";
      data?: T;
      emptyReason: string;
      nextAction?: string;
      meta: UiStateMeta;
    }
  | {
      status: "partial";
      data: T;
      partialReason: string;
      error?: UiError;
      meta: UiStateMeta;
    };

export type ActionState =
  | "idle"
  | "loading"
  | "success"
  | "error"
  | "disabled";
