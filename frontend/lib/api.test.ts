import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ApiError,
  adaptOrder,
  decideLineItem,
  deferLineItem,
  fetchOrder,
  fetchOrders,
  updateSetupConfiguration,
} from "./api";

// A representative raw backend order: snake_case, header fields flattened
// onto the order itself, match candidates nested under each line item
// (rather than the frontend's flat top-level array), and no
// confidence_band/score on the candidate (deliberately excluded by the
// backend, see clarifications.md §7). Modeled on a real captured response
// from /api/orders/ord-vh-2026-0142/, trimmed to one line item.
const RAW_ORDER = {
  id: "ord-vh-2026-0142",
  order_number: "PO-2026-0142",
  customer_name: "Vogt Hydraulik GmbH",
  customer_reference: "VH-4481",
  source: "pdf",
  received_at: "2026-07-01T08:18:00+02:00",
  requested_delivery_date: "2026-07-12",
  delivery_location: "Augsburg, DE",
  currency: "EUR",
  field_status: { orderId: "valid" },
  status: "blocked",
  customer_profile: { industry: "Industrial equipment" },
  source_document_summary: "PDF purchase order for fasteners.",
  original_excerpt: "hex bolt m8x40 inox qty 500 @0.18",
  ground_truth: { expectedEvalOutcome: "Header extraction passes." },
  covered_edge_cases: ["abbreviation"],
  is_simulated: true,
  last_updated_at: "2026-07-06T10:00:00Z",
  unresolved_line_count: 1,
  erp_ready: false,
  line_items: [
    {
      id: "vh-20",
      order: "ord-vh-2026-0142",
      line_number: 20,
      original_text: "Kugellager 6205 2RS C3 40 Stk",
      normalized_name: "Deep groove ball bearing 6205-2RS C3",
      normalized_attributes: { designation: "6205-2RS" },
      quantity: 40,
      unit: "pcs",
      requested_sku: "",
      customer_part_number: "",
      unit_price: 7.8,
      currency: "EUR",
      status: "review-needed",
      selected_match_candidate: null,
      resolved_by_decision: false,
      match_candidates: [
        {
          id: "match-vh-20-a",
          line_item: "vh-20",
          catalog_item: "cat-bear-001",
          sku: "OM-BRG-6205-2RS-C3",
          rank: 1,
          proof_items: [
            {
              id: "synonym-german-term",
              kind: "synonym",
              label: "German term",
              sourceValue: "Kugellager",
              catalogValue: "deep groove ball bearing",
              supportsMatch: true,
            },
          ],
          missing_evidence: [],
          conflicting_evidence: [],
          requires_human_review: true,
        },
      ],
    },
  ],
  exceptions: [
    {
      id: "exc-vh-20-ambiguous",
      category: "ambiguous-sku",
      severity: "review",
      status: "open",
      line_item: "vh-20",
      title: "Bearing seal variant needs review",
      description: "The customer text says 2RS, but the catalog also has ZZ.",
      blocks_erp_readiness: false,
      recovery_action: "Confirm the sealed 2RS variant.",
    },
  ],
  readiness_checks: [],
};

describe("adaptOrder", () => {
  it("flattens header fields into a nested header object, mapping order_number to orderId", () => {
    const adapted = adaptOrder(RAW_ORDER);

    expect(adapted.id).toBe("ord-vh-2026-0142");
    expect(adapted.header.orderId).toBe("PO-2026-0142");
    expect(adapted.header.customerName).toBe("Vogt Hydraulik GmbH");
    expect(adapted.header.source).toBe("pdf");
  });

  it("reconstructs a flat top-level matchCandidates array from nested line-item candidates", () => {
    const adapted = adaptOrder(RAW_ORDER);

    expect(adapted.matchCandidates).toHaveLength(1);
    expect(adapted.matchCandidates[0].id).toBe("match-vh-20-a");
    expect(adapted.matchCandidates[0].lineItemId).toBe("vh-20");
    // Deliberately absent from the API response; must not be invented client-side.
    expect(adapted.matchCandidates[0].confidenceBand).toBeUndefined();
    expect(adapted.matchCandidates[0].score).toBeUndefined();
  });

  it("reconstructs each line item's exceptionIds from the order-level exceptions array", () => {
    const adapted = adaptOrder(RAW_ORDER);

    expect(adapted.lineItems[0].exceptionIds).toEqual(["exc-vh-20-ambiguous"]);
  });

  it("maps exception line_item to lineItemId", () => {
    const adapted = adaptOrder(RAW_ORDER);

    expect(adapted.exceptions[0].lineItemId).toBe("vh-20");
  });
});

const originalFetch = global.fetch;

describe("fetch functions against a mocked backend", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("fetchOrders returns adapted orders on success", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => [
        {
          id: "ord-vh-2026-0142",
          order_number: "PO-2026-0142",
          customer_name: "Vogt Hydraulik GmbH",
          customer_reference: "VH-4481",
          source: "pdf",
          received_at: "2026-07-01T08:18:00+02:00",
          requested_delivery_date: "2026-07-12",
          delivery_location: "Augsburg, DE",
          currency: "EUR",
          status: "blocked",
          source_document_summary: "PDF purchase order for fasteners.",
          is_simulated: true,
          last_updated_at: "2026-07-06T10:00:00Z",
        },
      ],
    });

    const orders = await fetchOrders();
    expect(orders).toHaveLength(1);
    expect(orders[0].header.orderId).toBe("PO-2026-0142");
  });

  it("throws an ApiError with status 0 when the network request itself fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(fetchOrder("ord-vh-2026-0142")).rejects.toMatchObject({
      status: 0,
    });
    await expect(fetchOrder("ord-vh-2026-0142")).rejects.toBeInstanceOf(ApiError);
  });

  it("throws an ApiError with the backend's detail message on a non-2xx response", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      headers: new Headers(),
      json: async () => ({ detail: "Provide exactly one of candidate_id or custom_label." }),
    });

    await expect(decideLineItem("vh-20", { candidateId: "match-vh-20-a" })).rejects.toMatchObject({
      status: 400,
      detail: "Provide exactly one of candidate_id or custom_label.",
    });
  });

  it("decideLineItem sends candidate_id when given a candidateId", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({ ...RAW_ORDER.line_items[0], status: "matched" }),
    });

    await decideLineItem("vh-20", { candidateId: "match-vh-20-a" });

    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ candidate_id: "match-vh-20-a" });
  });

  it("decideLineItem sends custom_label when given a customLabel", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({ ...RAW_ORDER.line_items[0], status: "matched" }),
    });

    await decideLineItem("vh-20", { customLabel: "Hand-typed correction" });

    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ custom_label: "Hand-typed correction" });
  });

  it("deferLineItem posts to the defer action with no body", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => RAW_ORDER.line_items[0],
    });

    await deferLineItem("vh-20");

    const [url, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("/api/line-items/vh-20/defer/");
    expect(options.method).toBe("POST");
  });

  it("updateSetupConfiguration only sends the fields that were actually patched", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({
        id: 1,
        auto_approve_threshold: 90,
        price_flag_threshold: 15,
        stop_discontinued_items: true,
        review_noncatalog_items: true,
        flag_duplicate_lines: true,
        updated_at: "2026-07-06T10:00:00Z",
      }),
    });

    await updateSetupConfiguration(1, { autoApproveThreshold: 90 });

    const [url, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("/api/setup-configuration/1/");
    expect(options.method).toBe("PATCH");
    expect(JSON.parse(options.body)).toEqual({ auto_approve_threshold: 90 });
  });
});
