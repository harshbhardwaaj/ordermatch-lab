import type { CatalogItem } from "@/types/catalog";
import type { CustomerMemory, CustomerMemorySummary } from "@/types/customer";
import type { MatchCandidate } from "@/types/match";
import type { OrderException, ReadinessCheck } from "@/types/order";
import type { SyntheticOrderRecord } from "@/data/orders";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

/* Per-visitor demo-session id (see the backend's common.middleware.
 * DemoSessionMiddleware): sent as a plain header and stored in
 * localStorage, not a cookie. A cookie was tried first, but WebKit
 * (Safari, and every browser on iOS, which all use WebKit under the
 * hood) unreliably dropped a cross-site cookie between requests, so
 * every visitor kept losing their session and hitting stale-order 404s.
 * A header the app manages itself isn't subject to any browser's
 * cross-site cookie policy at all. ------------------------------------ */

const DEMO_SESSION_STORAGE_KEY = "demo_session_id";
const DEMO_SESSION_HEADER = "X-Demo-Session-Id";

function getStoredDemoSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(DEMO_SESSION_STORAGE_KEY);
}

function storeDemoSessionId(id: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, id);
}

async function apiFetch(path: string, options?: RequestInit) {
  const sessionId = getStoredDemoSessionId();

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(sessionId ? { [DEMO_SESSION_HEADER]: sessionId } : {}),
        ...(options?.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError(0, "Could not reach the backend. It may be offline.");
  }

  const returnedSessionId = response.headers.get(DEMO_SESSION_HEADER);
  if (returnedSessionId) storeDemoSessionId(returnedSessionId);

  if (!response.ok) {
    const detail = await response
      .json()
      .then((body) => body?.detail ?? response.statusText)
      .catch(() => response.statusText);
    throw new ApiError(response.status, detail);
  }

  if (response.status === 204) {
    return null;
  }
  return response.json();
}

/* Raw backend shapes (snake_case, partially flattened/nested differently
 * than the frontend types) -------------------------------------------- */

type RawProofItem = {
  id: string;
  kind: string;
  label: string;
  sourceValue: string;
  catalogValue?: string;
  supportsMatch: boolean;
};

type RawMatchCandidate = {
  id: string;
  line_item: string;
  catalog_item: string | null;
  sku: string;
  rank: number;
  // Optional: candidates served before these were added inline carry neither.
  catalog_item_name?: string;
  catalog_item_price?: number | null;
  catalog_item_status?: string;
  proof_items: RawProofItem[];
  missing_evidence: string[];
  conflicting_evidence: string[];
  requires_human_review: boolean;
  // Absent on a candidate matched before the customer taught us anything.
  learned_signal?: {
    timesChosen?: number;
    timesRejected?: number;
    pinned?: boolean;
  } | null;
};

type RawLineItem = {
  id: string;
  order: string;
  line_number: number;
  original_text: string;
  normalized_name: string;
  normalized_attributes: Record<string, string>;
  quantity: number | null;
  unit: string;
  requested_sku: string;
  customer_part_number: string;
  unit_price: number | null;
  currency: string;
  status: string;
  selected_match_candidate: string | null;
  match_candidates: RawMatchCandidate[];
  resolved_by_decision: boolean;
};

type RawException = {
  id: string;
  category: string;
  severity: string;
  status: string;
  line_item: string | null;
  title: string;
  description: string;
  blocks_erp_readiness: boolean;
  recovery_action: string;
};

type RawReadinessCheck = {
  id: string;
  label: string;
  status: string;
  reason: string;
  related_line_item_ids: string[];
  related_exception_ids: string[];
};

type RawOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_reference: string;
  source: string;
  received_at: string;
  requested_delivery_date: string;
  delivery_location: string;
  currency: string;
  field_status: Record<string, string>;
  status: string;
  customer_profile: Record<string, unknown>;
  source_document_summary: string;
  original_excerpt: string;
  ground_truth: Record<string, unknown>;
  covered_edge_cases: string[];
  is_simulated: boolean;
  last_updated_at: string;
  line_items: RawLineItem[];
  exceptions: RawException[];
  readiness_checks: RawReadinessCheck[];
  unresolved_line_count: number;
  erp_ready: boolean;
};

type RawOrderListItem = Omit<
  RawOrder,
  | "line_items"
  | "exceptions"
  | "readiness_checks"
  | "unresolved_line_count"
  | "erp_ready"
  | "customer_profile"
  | "original_excerpt"
  | "ground_truth"
  | "covered_edge_cases"
>;

type RawCatalogItem = {
  id: string;
  sku: string;
  name: string;
  category: string;
  description: string;
  manufacturer: string;
  manufacturer_part_number: string;
  customer_part_numbers: string[];
  attributes: { name: string; value: string; unit?: string }[];
  default_unit: string;
  price_amount: number | null;
  price_currency: string;
  status: string;
  replacement_sku: string;
  updated_at: string | null;
};

type RawSetupConfiguration = {
  id: number;
  auto_approve_threshold: number;
  price_flag_threshold: number;
  stop_discontinued_items: boolean;
  review_noncatalog_items: boolean;
  flag_duplicate_lines: boolean;
  updated_at: string;
};

/* Adapters: raw backend JSON -> the frontend's existing TS shapes, so
 * component rendering logic does not need to change, only where the data
 * comes from. ------------------------------------------------------- */

function adaptMatchCandidate(raw: RawMatchCandidate): MatchCandidate {
  return {
    id: raw.id,
    lineItemId: raw.line_item,
    catalogItemId: raw.catalog_item ?? undefined,
    catalogItemName: raw.catalog_item_name || undefined,
    catalogItemPrice: raw.catalog_item_price ?? undefined,
    catalogItemStatus: raw.catalog_item_status || undefined,
    sku: raw.sku || undefined,
    rank: raw.rank,
    proofItems: raw.proof_items as MatchCandidate["proofItems"],
    missingEvidence: raw.missing_evidence,
    conflictingEvidence: raw.conflicting_evidence,
    requiresHumanReview: raw.requires_human_review,
    learnedSignal:
      raw.learned_signal && Object.keys(raw.learned_signal).length > 0
        ? {
            timesChosen: raw.learned_signal.timesChosen ?? 0,
            timesRejected: raw.learned_signal.timesRejected ?? 0,
            pinned: raw.learned_signal.pinned,
          }
        : undefined,
  };
}

function adaptLineItem(raw: RawLineItem) {
  return {
    id: raw.id,
    lineNumber: raw.line_number,
    originalText: raw.original_text,
    normalizedName: raw.normalized_name || undefined,
    normalizedAttributes: raw.normalized_attributes,
    quantity: raw.quantity ?? undefined,
    unit: (raw.unit || undefined) as SyntheticOrderRecord["lineItems"][number]["unit"],
    requestedSku: raw.requested_sku || undefined,
    customerPartNumber: raw.customer_part_number || undefined,
    unitPrice: raw.unit_price ?? undefined,
    currency: raw.currency || undefined,
    status: raw.status as SyntheticOrderRecord["lineItems"][number]["status"],
    exceptionIds: [] as string[], // filled in by adaptOrder once exceptions are known
    selectedMatchCandidateId: raw.selected_match_candidate ?? undefined,
    resolvedByDecision: raw.resolved_by_decision,
  };
}

function adaptException(raw: RawException): OrderException {
  return {
    id: raw.id,
    category: raw.category as OrderException["category"],
    severity: raw.severity as OrderException["severity"],
    status: raw.status as OrderException["status"],
    lineItemId: raw.line_item ?? undefined,
    title: raw.title,
    description: raw.description,
    blocksErpReadiness: raw.blocks_erp_readiness,
    recoveryAction: raw.recovery_action,
  };
}

function adaptReadinessCheck(raw: RawReadinessCheck): ReadinessCheck {
  return {
    id: raw.id,
    label: raw.label,
    status: raw.status as ReadinessCheck["status"],
    reason: raw.reason || undefined,
    relatedLineItemIds: raw.related_line_item_ids,
    relatedExceptionIds: raw.related_exception_ids,
  };
}

export function adaptOrder(raw: RawOrder): SyntheticOrderRecord {
  const exceptions = raw.exceptions.map(adaptException);
  const lineItems = raw.line_items.map((line) => {
    const adapted = adaptLineItem(line);
    adapted.exceptionIds = exceptions
      .filter((exc) => exc.lineItemId === line.id)
      .map((exc) => exc.id);
    return adapted;
  });
  const matchCandidates = raw.line_items.flatMap((line) =>
    line.match_candidates.map(adaptMatchCandidate),
  );

  return {
    id: raw.id,
    header: {
      orderId: raw.order_number,
      customerName: raw.customer_name,
      customerReference: raw.customer_reference || undefined,
      source: raw.source as SyntheticOrderRecord["header"]["source"],
      receivedAt: raw.received_at,
      requestedDeliveryDate: raw.requested_delivery_date || undefined,
      deliveryLocation: raw.delivery_location || undefined,
      currency: raw.currency,
      fieldStatus: raw.field_status as SyntheticOrderRecord["header"]["fieldStatus"],
    },
    status: raw.status as SyntheticOrderRecord["status"],
    lineItems,
    exceptions,
    readinessChecks: raw.readiness_checks.map(adaptReadinessCheck),
    isSimulated: raw.is_simulated,
    lastUpdatedAt: raw.last_updated_at,
    customerProfile: raw.customer_profile as SyntheticOrderRecord["customerProfile"],
    sourceDocumentSummary: raw.source_document_summary,
    originalExcerpt: raw.original_excerpt,
    matchCandidates,
    groundTruth: raw.ground_truth as SyntheticOrderRecord["groundTruth"],
    coveredEdgeCases: raw.covered_edge_cases as SyntheticOrderRecord["coveredEdgeCases"],
  };
}

function adaptOrderListItem(raw: RawOrderListItem) {
  return {
    id: raw.id,
    header: {
      orderId: raw.order_number,
      customerName: raw.customer_name,
      customerReference: raw.customer_reference || undefined,
      source: raw.source as SyntheticOrderRecord["header"]["source"],
      receivedAt: raw.received_at,
      requestedDeliveryDate: raw.requested_delivery_date || undefined,
      deliveryLocation: raw.delivery_location || undefined,
      currency: raw.currency,
      fieldStatus: {},
    },
    status: raw.status as SyntheticOrderRecord["status"],
    sourceDocumentSummary: raw.source_document_summary,
    isSimulated: raw.is_simulated,
    lastUpdatedAt: raw.last_updated_at,
  };
}

function adaptCatalogItem(raw: RawCatalogItem): CatalogItem {
  return {
    id: raw.id,
    sku: raw.sku,
    name: raw.name,
    category: raw.category,
    description: raw.description,
    manufacturer: raw.manufacturer || undefined,
    manufacturerPartNumber: raw.manufacturer_part_number || undefined,
    customerPartNumbers: raw.customer_part_numbers,
    attributes: raw.attributes as CatalogItem["attributes"],
    defaultUnit: raw.default_unit as CatalogItem["defaultUnit"],
    price:
      raw.price_amount != null
        ? { amount: raw.price_amount, currency: raw.price_currency }
        : undefined,
    status: raw.status as CatalogItem["status"],
    replacementSku: raw.replacement_sku || undefined,
    updatedAt: raw.updated_at ?? undefined,
  };
}

export type SetupConfiguration = {
  id: number;
  autoApproveThreshold: number;
  priceFlagThreshold: number;
  stopDiscontinuedItems: boolean;
  reviewNoncatalogItems: boolean;
  flagDuplicateLines: boolean;
  updatedAt: string;
};

function adaptSetupConfiguration(raw: RawSetupConfiguration): SetupConfiguration {
  return {
    id: raw.id,
    autoApproveThreshold: raw.auto_approve_threshold,
    priceFlagThreshold: raw.price_flag_threshold,
    stopDiscontinuedItems: raw.stop_discontinued_items,
    reviewNoncatalogItems: raw.review_noncatalog_items,
    flagDuplicateLines: raw.flag_duplicate_lines,
    updatedAt: raw.updated_at,
  };
}

/* Public API ----------------------------------------------------------- */

export async function fetchOrders(): Promise<SyntheticOrderRecord[]> {
  const raw: RawOrderListItem[] = await apiFetch("/api/orders/");
  return raw.map(adaptOrderListItem) as SyntheticOrderRecord[];
}

export async function fetchOrder(orderId: string): Promise<SyntheticOrderRecord> {
  const raw: RawOrder = await apiFetch(`/api/orders/${orderId}/`);
  return adaptOrder(raw);
}

export async function sendOrderToErp(orderId: string): Promise<SyntheticOrderRecord> {
  const raw: RawOrder = await apiFetch(`/api/orders/${orderId}/send-to-erp/`, {
    method: "POST",
  });
  return adaptOrder(raw);
}

export async function extractOrder(pastedText: string): Promise<SyntheticOrderRecord> {
  const raw: RawOrder = await apiFetch("/api/orders/extract/", {
    method: "POST",
    body: JSON.stringify({ pasted_text: pastedText }),
  });
  return adaptOrder(raw);
}

let catalogItemsCache: CatalogItem[] | null = null;

export async function ensureCatalogItemsLoaded(): Promise<CatalogItem[]> {
  if (!catalogItemsCache) {
    const raw: RawCatalogItem[] = await apiFetch("/api/catalog-items/");
    catalogItemsCache = raw.map(adaptCatalogItem);
  }
  return catalogItemsCache;
}

export function getCachedCatalogItemById(catalogItemId: string | undefined) {
  return catalogItemsCache?.find((item) => item.id === catalogItemId);
}

export async function fetchSetupConfiguration(): Promise<SetupConfiguration> {
  const raw: RawSetupConfiguration[] = await apiFetch("/api/setup-configuration/");
  if (raw.length === 0) {
    throw new ApiError(404, "No setup configuration found.");
  }
  return adaptSetupConfiguration(raw[0]);
}

export async function updateSetupConfiguration(
  id: number,
  patch: Partial<{
    autoApproveThreshold: number;
    priceFlagThreshold: number;
    stopDiscontinuedItems: boolean;
    reviewNoncatalogItems: boolean;
    flagDuplicateLines: boolean;
  }>,
): Promise<SetupConfiguration> {
  const body: Record<string, number | boolean> = {};
  if (patch.autoApproveThreshold !== undefined) body.auto_approve_threshold = patch.autoApproveThreshold;
  if (patch.priceFlagThreshold !== undefined) body.price_flag_threshold = patch.priceFlagThreshold;
  if (patch.stopDiscontinuedItems !== undefined) body.stop_discontinued_items = patch.stopDiscontinuedItems;
  if (patch.reviewNoncatalogItems !== undefined) body.review_noncatalog_items = patch.reviewNoncatalogItems;
  if (patch.flagDuplicateLines !== undefined) body.flag_duplicate_lines = patch.flagDuplicateLines;

  const raw: RawSetupConfiguration = await apiFetch(`/api/setup-configuration/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return adaptSetupConfiguration(raw);
}

export async function decideLineItem(
  lineItemId: string,
  body: { candidateId: string } | { customLabel: string },
): Promise<SyntheticOrderRecord["lineItems"][number]> {
  const payload =
    "candidateId" in body
      ? { candidate_id: body.candidateId }
      : { custom_label: body.customLabel };
  const raw: RawLineItem = await apiFetch(`/api/line-items/${lineItemId}/decide/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return adaptLineItem(raw);
}

export async function deferLineItem(
  lineItemId: string,
): Promise<SyntheticOrderRecord["lineItems"][number]> {
  const raw: RawLineItem = await apiFetch(`/api/line-items/${lineItemId}/defer/`, {
    method: "POST",
  });
  return adaptLineItem(raw);
}

export async function reopenLineItem(
  lineItemId: string,
): Promise<SyntheticOrderRecord["lineItems"][number]> {
  const raw: RawLineItem = await apiFetch(`/api/line-items/${lineItemId}/reopen/`, {
    method: "POST",
  });
  return adaptLineItem(raw);
}

export async function resolveException(exceptionId: string): Promise<OrderException> {
  const raw: RawException = await apiFetch(`/api/exceptions/${exceptionId}/resolve/`, {
    method: "POST",
  });
  return adaptException(raw);
}

export async function resetDemoData(): Promise<void> {
  await apiFetch("/api/orders/reset-demo/", { method: "POST" });
  catalogItemsCache = null;
}

/* Per-customer match memory (backend: matching/memory.py, matching/views.py).
 * ------------------------------------------------------------------- */

type RawCustomerSummary = {
  customer_key: string;
  customer_name: string;
  total_decisions: number;
  corrections: number;
};

type RawCustomerCorrection = {
  id: string;
  request_text: string;
  suggested_sku: string;
  chosen_sku: string;
  custom_label: string;
  chosen_rank: number | null;
  was_correction: boolean;
  order_number: string;
  created_at: string;
};

type RawLearnedRule = {
  normalized_request: string;
  sku: string;
  times_chosen: number;
  times_rejected: number;
  pinned: boolean;
};

type RawContextFile = {
  content: string;
  built_from_corrections: number;
  edited_by_human: boolean;
  generated_by: string;
  updated_at: string;
};

type RawCustomerMemory = RawCustomerSummary & {
  history: RawCustomerCorrection[];
  learned_rules: RawLearnedRule[];
  context_file: RawContextFile | null;
};

function adaptContextFile(raw: RawContextFile | null) {
  if (!raw) return null;
  return {
    content: raw.content,
    builtFromCorrections: raw.built_from_corrections,
    editedByHuman: raw.edited_by_human,
    generatedBy: raw.generated_by,
    updatedAt: raw.updated_at,
  };
}

export async function fetchCustomers(): Promise<CustomerMemorySummary[]> {
  const raw: RawCustomerSummary[] = await apiFetch("/api/customers/");
  return raw.map((row) => ({
    customerKey: row.customer_key,
    customerName: row.customer_name,
    totalDecisions: row.total_decisions,
    corrections: row.corrections,
  }));
}

export async function fetchCustomerMemory(customerKey: string): Promise<CustomerMemory> {
  const raw: RawCustomerMemory = await apiFetch(`/api/customers/${customerKey}/`);
  return {
    customerKey: raw.customer_key,
    customerName: raw.customer_name,
    totalDecisions: raw.total_decisions,
    corrections: raw.corrections,
    history: raw.history.map((row) => ({
      id: row.id,
      requestText: row.request_text,
      suggestedSku: row.suggested_sku,
      chosenSku: row.chosen_sku,
      customLabel: row.custom_label,
      chosenRank: row.chosen_rank ?? undefined,
      wasCorrection: row.was_correction,
      orderNumber: row.order_number,
      createdAt: row.created_at,
    })),
    learnedRules: raw.learned_rules.map((row) => ({
      normalizedRequest: row.normalized_request,
      sku: row.sku,
      timesChosen: row.times_chosen,
      timesRejected: row.times_rejected,
      pinned: row.pinned,
    })),
    contextFile: adaptContextFile(raw.context_file),
  };
}

export async function rebuildCustomerContext(customerKey: string, force = false) {
  const raw: RawContextFile = await apiFetch(`/api/customers/${customerKey}/rebuild-context/`, {
    method: "POST",
    body: JSON.stringify({ force }),
  });
  return adaptContextFile(raw);
}

export async function editCustomerContext(customerKey: string, content: string) {
  const raw: RawContextFile = await apiFetch(`/api/customers/${customerKey}/edit-context/`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
  return adaptContextFile(raw);
}

export async function forgetCorrection(customerKey: string, correctionId: string): Promise<void> {
  await apiFetch(`/api/customers/${customerKey}/forget/`, {
    method: "POST",
    body: JSON.stringify({ correction_id: correctionId }),
  });
}
