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
  return new Intl.DateTimeFormat(locale, options).format(new Date(value));
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
