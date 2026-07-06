import { describe, expect, it } from "vitest";

import { formatDate } from "./formatters";

describe("formatDate", () => {
  it("formats a real ISO date", () => {
    expect(formatDate("2026-07-12")).toBe("Jul 12, 2026");
  });

  it("falls back to the raw string instead of throwing on an unparseable value", () => {
    // Real extraction (Phase 13) can hand back a delivery phrase the model
    // could not resolve to a concrete date (e.g. "next Friday" slipping
    // through despite the extraction prompt asking for YYYY-MM-DD or null).
    expect(formatDate("next Friday")).toBe("next Friday");
  });
});
