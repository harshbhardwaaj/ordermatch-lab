import type { UnitCode } from "@/types/catalog";

export type OrderSource = "email" | "pdf" | "rfq" | "manual" | "sample";

export type OrderStatus =
  | "new"
  | "extracted"
  | "review-needed"
  | "blocked"
  | "ready"
  | "erp-ready";

export type OrderHeaderFieldStatus =
  | "valid"
  | "missing"
  | "ambiguous"
  | "requires-review";

export type OrderHeader = {
  orderId: string;
  customerName: string;
  customerReference?: string;
  source: OrderSource;
  receivedAt: string;
  requestedDeliveryDate?: string;
  deliveryLocation?: string;
  currency: string;
  fieldStatus: Partial<Record<string, OrderHeaderFieldStatus>>;
};

export type LineItemStatus =
  | "unprocessed"
  | "normalized"
  | "matched"
  | "review-needed"
  | "blocked"
  | "no-match";

export type OrderLineItem = {
  id: string;
  lineNumber: number;
  originalText: string;
  normalizedName?: string;
  normalizedAttributes?: Record<string, string>;
  quantity?: number;
  unit?: UnitCode;
  requestedSku?: string;
  customerPartNumber?: string;
  unitPrice?: number;
  currency?: string;
  status: LineItemStatus;
  exceptionIds: string[];
  selectedMatchCandidateId?: string;
};

export type ExceptionCategory =
  | "missing-unit"
  | "ambiguous-sku"
  | "low-confidence"
  | "no-catalog-match"
  | "discontinued-item"
  | "price-mismatch"
  | "duplicate-line"
  | "delivery-ambiguity"
  | "required-erp-field-missing";

export type ExceptionSeverity = "info" | "review" | "blocking";

export type ExceptionStatus = "open" | "resolved" | "ignored";

export type OrderException = {
  id: string;
  category: ExceptionCategory;
  severity: ExceptionSeverity;
  status: ExceptionStatus;
  lineItemId?: string;
  title: string;
  description: string;
  blocksErpReadiness: boolean;
  recoveryAction: string;
};

export type ReadinessCheckStatus =
  | "passed"
  | "review-needed"
  | "blocked"
  | "unavailable";

export type ReadinessCheck = {
  id: string;
  label: string;
  status: ReadinessCheckStatus;
  reason?: string;
  relatedLineItemIds?: string[];
  relatedExceptionIds?: string[];
};

export type OrderRecord = {
  id: string;
  header: OrderHeader;
  status: OrderStatus;
  lineItems: OrderLineItem[];
  exceptions: OrderException[];
  readinessChecks: ReadinessCheck[];
  isSimulated: boolean;
  lastUpdatedAt: string;
};
