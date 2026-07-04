import type { UnitCode } from "@/types/catalog";
import type { ConfidenceBand } from "@/types/match";
import type { OrderStatus } from "@/types/order";

const defaultLocale = "en-US";

const unitLabels: Record<UnitCode, string> = {
  pcs: "pcs",
  ea: "ea",
  m: "m",
  mm: "mm",
  cm: "cm",
  kg: "kg",
  g: "g",
  l: "l",
  set: "set",
  box: "box",
  pack: "pack",
  unknown: "unknown unit",
};

const confidenceLabels: Record<ConfidenceBand, string> = {
  "high-confidence": "High confidence",
  "review-needed": "Review needed",
  blocked: "Blocked",
  "no-match": "No match",
};

const statusLabels: Record<OrderStatus, string> = {
  new: "New",
  extracted: "Extracted",
  "review-needed": "Review needed",
  blocked: "Blocked",
  ready: "Ready",
  "erp-ready": "ERP-ready",
};

export function formatCurrency(
  amount: number,
  currency = "EUR",
  locale = defaultLocale,
) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(
  value: string | number | Date,
  locale = defaultLocale,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  },
) {
  return new Intl.DateTimeFormat(locale, options).format(new Date(value));
}

export function formatQuantity(quantity: number, unit?: UnitCode) {
  const formattedQuantity = new Intl.NumberFormat(defaultLocale, {
    maximumFractionDigits: 3,
  }).format(quantity);

  return unit ? `${formattedQuantity} ${formatUnit(unit)}` : formattedQuantity;
}

export function formatConfidence(
  confidence: ConfidenceBand | number | undefined,
) {
  if (typeof confidence === "number") {
    return `${Math.round(confidence * 100)}%`;
  }

  if (!confidence) {
    return "Unscored";
  }

  return confidenceLabels[confidence];
}

export function formatStatus(status: OrderStatus) {
  return statusLabels[status];
}

export function formatUnit(unit: UnitCode) {
  return unitLabels[unit];
}

export function formatStatusFromSlug(slug: string) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const orderSourceLabels: Record<string, string> = {
  pdf: "PDF",
  email: "Email",
  excel: "Spreadsheet",
  "rfq-attachment": "RFQ upload",
};

export function formatOrderSource(source: string) {
  return orderSourceLabels[source] ?? formatStatusFromSlug(source);
}
