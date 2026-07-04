export type LineResolutionState = "open" | "resolved" | "deferred";

export type LineResolution = {
  state: LineResolutionState;
  label?: string;
  candidateId?: string;
};

export type ProcessingResolutions = Record<string, LineResolution>;

function storageKey(orderId: string) {
  return `ordermatch-processing-resolutions:${orderId}`;
}

export function saveProcessingResolutions(orderId: string, resolutions: ProcessingResolutions) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(storageKey(orderId), JSON.stringify(resolutions));
  } catch {
    // sessionStorage can be unavailable in some embedded previews; resolutions simply will not carry over.
  }
}

export function loadProcessingResolutions(orderId: string): ProcessingResolutions {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.sessionStorage.getItem(storageKey(orderId));
    return raw ? (JSON.parse(raw) as ProcessingResolutions) : {};
  } catch {
    return {};
  }
}

const SENT_ORDERS_STORAGE_KEY = "ordermatch-sent-orders";

export function markOrderSent(orderId: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const sent = getSentOrderIds();
    if (!sent.includes(orderId)) {
      window.sessionStorage.setItem(SENT_ORDERS_STORAGE_KEY, JSON.stringify([...sent, orderId]));
    }
  } catch {
    // sessionStorage can be unavailable in some embedded previews; sent-state simply will not persist.
  }
}

export function getSentOrderIds(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.sessionStorage.getItem(SENT_ORDERS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}
