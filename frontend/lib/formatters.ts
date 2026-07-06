const defaultLocale = "en-US";

export function formatDate(
  value: string | number | Date,
  locale = defaultLocale,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  },
) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    // Real extraction (Phase 13) can hand back a delivery date the model
    // could not resolve to a concrete calendar date; show it as typed
    // rather than crashing the page on an unparseable value.
    return String(value);
  }
  return new Intl.DateTimeFormat(locale, options).format(date);
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
