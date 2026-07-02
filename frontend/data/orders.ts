import type { MatchCandidate } from "@/types/match";
import type {
  ExceptionCategory,
  OrderException,
  OrderLineItem,
  OrderRecord,
  ReadinessCheck,
} from "@/types/order";

export const orderDataNotice = {
  label: "Grounded synthetic sample orders",
  description:
    "Synthetic purchase orders and RFQs created from public PO/RFQ structures, industrial catalog naming patterns, and OrderMatch Lab edge-case requirements. Company names, order text, part numbers, SKUs, prices, and contacts are invented.",
  groundingSources: [
    "docs/data-research/grounding-notes.md",
    "docs/data-research/source-map.md",
    "docs/spec-kit/specification.md",
  ],
} as const;

export type EdgeCaseId =
  | "abbreviation"
  | "missing-unit"
  | "german-english-variant"
  | "duplicate-line"
  | "price-mismatch"
  | "ambiguous-sku"
  | "no-match-item"
  | "discontinued-item"
  | "low-confidence-item"
  | "unit-mismatch"
  | "customer-part-conflict"
  | "delivery-ambiguity";

export type CustomerProfile = {
  id: string;
  name: string;
  industry: string;
  region: string;
  erpSystem: string;
  orderPattern: string;
};

export type LineItemGroundTruth = {
  lineItemId: string;
  expectedNormalizedName: string;
  expectedAttributes: Record<string, string>;
  expectedQuantity?: number;
  expectedUnit?: string;
  expectedSku?: string;
  expectedTop3Skus: string[];
  expectedExceptionCategories: ExceptionCategory[];
  expectedOutcome:
    | "auto-match"
    | "human-review"
    | "blocked"
    | "no-match"
    | "substitute-required";
};

export type OrderGroundTruth = {
  expectedHeaderFields: {
    customerName: string;
    customerReference: string;
    source: string;
    currency: string;
    requestedDeliveryDate?: string;
    deliveryLocation?: string;
  };
  expectedBlockedCaseIds: string[];
  expectedEvalOutcome: string;
  lineItems: LineItemGroundTruth[];
};

export type SyntheticOrderRecord = OrderRecord & {
  customerProfile: CustomerProfile;
  sourceDocumentSummary: string;
  originalExcerpt: string;
  matchCandidates: MatchCandidate[];
  groundTruth: OrderGroundTruth;
  coveredEdgeCases: EdgeCaseId[];
};

const proof = (
  kind: MatchCandidate["proofItems"][number]["kind"],
  label: string,
  sourceValue: string,
  catalogValue: string | undefined,
  supportsMatch: boolean,
): MatchCandidate["proofItems"][number] => ({
  id: `${kind}-${label.toLowerCase().replaceAll(" ", "-")}`,
  kind,
  label,
  sourceValue,
  catalogValue,
  supportsMatch,
});

const line = (
  item: Omit<OrderLineItem, "exceptionIds"> & { exceptionIds?: string[] },
): OrderLineItem => ({
  exceptionIds: [],
  ...item,
});

const exception = (item: OrderException): OrderException => item;

const readiness = (item: ReadinessCheck): ReadinessCheck => item;

export const sampleOrders: SyntheticOrderRecord[] = [
  {
    id: "ord-vh-2026-0142",
    header: {
      orderId: "PO-2026-0142",
      customerName: "Vogt Hydraulik GmbH",
      customerReference: "VH-4481",
      source: "pdf",
      receivedAt: "2026-07-01T08:18:00+02:00",
      requestedDeliveryDate: "2026-07-12",
      deliveryLocation: "Augsburg, DE",
      currency: "EUR",
      fieldStatus: {
        orderId: "valid",
        customerReference: "valid",
        requestedDeliveryDate: "valid",
        deliveryLocation: "valid",
      },
    },
    status: "blocked",
    customerProfile: {
      id: "cust-vh",
      name: "Vogt Hydraulik GmbH",
      industry: "hydraulic power-unit assembly",
      region: "Bavaria, Germany",
      erpSystem: "Microsoft Dynamics 365 Business Central",
      orderPattern:
        "PDF purchase orders with compact line text, customer part numbers, and expected unit prices.",
    },
    sourceDocumentSummary:
      "PDF purchase order for fasteners, bearings, seals, and fittings used in a hydraulic power-unit build.",
    originalExcerpt:
      "PO-2026-0142 / VH-4481. Please deliver to Augsburg by 12.07.2026. L10 hex bolt m8x40 inox qty 500 @0.18. L20 Kugellager 6205 2RS C3 40 Stk. L30 O-Ring 10x2 FKM 200 Stk. L40 elbow G1/4 brass old series 12 pcs.",
    lineItems: [
      line({
        id: "vh-10",
        lineNumber: 10,
        originalText: "hex bolt m8x40 inox qty 500 @0.18",
        normalizedName: "Hex bolt M8x40 A2 stainless",
        normalizedAttributes: {
          thread: "M8",
          length: "40 mm",
          material: "A2 stainless steel",
          standard: "DIN 933",
        },
        quantity: 500,
        unit: "pcs",
        customerPartNumber: "CUST-VH-4481",
        unitPrice: 0.18,
        currency: "EUR",
        status: "matched",
        selectedMatchCandidateId: "match-vh-10-a",
      }),
      line({
        id: "vh-20",
        lineNumber: 20,
        originalText: "Kugellager 6205 2RS C3 40 Stk",
        normalizedName: "Deep groove ball bearing 6205-2RS C3",
        normalizedAttributes: {
          designation: "6205-2RS",
          sealType: "2RS",
          clearance: "C3",
        },
        quantity: 40,
        unit: "pcs",
        unitPrice: 7.8,
        currency: "EUR",
        status: "review-needed",
        exceptionIds: ["exc-vh-20-ambiguous"],
        selectedMatchCandidateId: "match-vh-20-a",
      }),
      line({
        id: "vh-30",
        lineNumber: 30,
        originalText: "O-Ring 10x2 FKM 200 Stk",
        normalizedName: "O-ring 10x2 FKM",
        normalizedAttributes: {
          innerDiameter: "10 mm",
          crossSection: "2 mm",
          material: "FKM",
        },
        quantity: 200,
        unit: "pcs",
        unitPrice: 0.42,
        currency: "EUR",
        status: "matched",
        selectedMatchCandidateId: "match-vh-30-a",
      }),
      line({
        id: "vh-40",
        lineNumber: 40,
        originalText: "elbow G1/4 brass old series 12 pcs",
        normalizedName: "Elbow fitting G1/4 brass old series",
        normalizedAttributes: {
          type: "elbow",
          connection: "G1/4",
          material: "brass",
          series: "old",
        },
        quantity: 12,
        unit: "pcs",
        requestedSku: "OLD-ELB-G14",
        unitPrice: 2.95,
        currency: "EUR",
        status: "blocked",
        exceptionIds: ["exc-vh-40-discontinued"],
        selectedMatchCandidateId: "match-vh-40-a",
      }),
    ],
    exceptions: [
      exception({
        id: "exc-vh-20-ambiguous",
        category: "ambiguous-sku",
        severity: "review",
        status: "open",
        lineItemId: "vh-20",
        title: "Bearing seal variant needs review",
        description:
          "The customer text says 2RS, but the catalog also contains 6205-ZZ and open variants with the same base designation.",
        blocksErpReadiness: false,
        recoveryAction:
          "Confirm the sealed 2RS variant or choose one of the alternate bearing candidates.",
      }),
      exception({
        id: "exc-vh-40-discontinued",
        category: "discontinued-item",
        severity: "blocking",
        status: "open",
        lineItemId: "vh-40",
        title: "Requested fitting is discontinued",
        description:
          "The customer part number maps to an old fitting series that is no longer active. A replacement SKU is available.",
        blocksErpReadiness: true,
        recoveryAction:
          "Route the replacement SKU for human approval before sending the order to ERP.",
      }),
    ],
    readinessChecks: [
      readiness({
        id: "ready-vh-header",
        label: "Required header fields",
        status: "passed",
        reason: "Customer, PO id, delivery location, delivery date, and currency are present.",
      }),
      readiness({
        id: "ready-vh-matches",
        label: "SKU match confidence",
        status: "review-needed",
        reason: "One bearing line has near-neighbor catalog variants.",
        relatedLineItemIds: ["vh-20"],
        relatedExceptionIds: ["exc-vh-20-ambiguous"],
      }),
      readiness({
        id: "ready-vh-discontinued",
        label: "Active catalog status",
        status: "blocked",
        reason: "Line 40 maps to a discontinued item with replacement approval required.",
        relatedLineItemIds: ["vh-40"],
        relatedExceptionIds: ["exc-vh-40-discontinued"],
      }),
    ],
    matchCandidates: [
      {
        id: "match-vh-10-a",
        lineItemId: "vh-10",
        catalogItemId: "cat-fast-001",
        sku: "OM-FAS-HB-M8X40-A2-D933",
        confidenceBand: "high-confidence",
        score: 0.95,
        rank: 1,
        proofItems: [
          proof("size", "Thread and length", "m8x40", "M8 x 40 mm", true),
          proof("material", "Material synonym", "inox", "A2 stainless steel", true),
          proof("standard", "Fastener standard", "hex bolt", "DIN 933", true),
          proof("customer-part-number", "Customer part number", "CUST-VH-4481", "CUST-VH-4481", true),
          proof("price", "Unit price", "0.18 EUR", "0.18 EUR", true),
        ],
        requiresHumanReview: false,
      },
      {
        id: "match-vh-10-b",
        lineItemId: "vh-10",
        catalogItemId: "cat-fast-008",
        sku: "OM-FAS-HB-M8X40-A4-D933",
        confidenceBand: "review-needed",
        score: 0.72,
        rank: 2,
        proofItems: [
          proof("size", "Thread and length", "m8x40", "M8 x 40 mm", true),
          proof("material", "Material", "inox", "A4 stainless steel", true),
          proof("price", "Unit price", "0.18 EUR", "0.27 EUR", false),
        ],
        conflictingEvidence: ["A4 stainless catalog price is higher than requested."],
        requiresHumanReview: true,
      },
      {
        id: "match-vh-20-a",
        lineItemId: "vh-20",
        catalogItemId: "cat-bear-001",
        sku: "OM-BRG-6205-2RS-C3",
        confidenceBand: "review-needed",
        score: 0.84,
        rank: 1,
        proofItems: [
          proof("synonym", "German term", "Kugellager", "deep groove ball bearing", true),
          proof("size", "Bearing designation", "6205", "6205", true),
          proof("catalog-attribute", "Seal type", "2RS", "2RS", true),
          proof("unit", "Unit", "Stk", "pcs", true),
        ],
        requiresHumanReview: true,
      },
      {
        id: "match-vh-20-b",
        lineItemId: "vh-20",
        catalogItemId: "cat-bear-002",
        sku: "OM-BRG-6205-ZZ-C3",
        confidenceBand: "review-needed",
        score: 0.62,
        rank: 2,
        proofItems: [
          proof("size", "Bearing designation", "6205", "6205", true),
          proof("catalog-attribute", "Seal type", "2RS", "ZZ", false),
        ],
        conflictingEvidence: ["Customer asked for 2RS, catalog item is ZZ shielded."],
        requiresHumanReview: true,
      },
      {
        id: "match-vh-30-a",
        lineItemId: "vh-30",
        catalogItemId: "cat-seal-002",
        sku: "OM-SEA-OR-10X2-FKM",
        confidenceBand: "high-confidence",
        score: 0.94,
        rank: 1,
        proofItems: [
          proof("size", "O-ring size", "10x2", "10 mm x 2 mm", true),
          proof("material", "Material", "FKM", "FKM", true),
          proof("unit", "Unit", "Stk", "pcs", true),
        ],
        requiresHumanReview: false,
      },
      {
        id: "match-vh-40-a",
        lineItemId: "vh-40",
        catalogItemId: "cat-fit-007",
        sku: "OM-FIT-ELB-G14-BRASS-OLD",
        confidenceBand: "blocked",
        score: 0.91,
        rank: 1,
        proofItems: [
          proof("customer-part-number", "Customer part number", "OLD-ELB-G14", "OLD-ELB-G14", true),
          proof("availability", "Catalog status", "old series", "discontinued", false),
        ],
        conflictingEvidence: ["Matched item is discontinued."],
        requiresHumanReview: true,
      },
      {
        id: "match-vh-40-b",
        lineItemId: "vh-40",
        catalogItemId: "cat-fit-001",
        sku: "OM-FIT-ELB-G14-BRASS",
        confidenceBand: "review-needed",
        score: 0.79,
        rank: 2,
        proofItems: [
          proof("size", "Connection", "G1/4", "G1/4", true),
          proof("material", "Material", "brass", "brass", true),
          proof("availability", "Catalog status", "old series", "active replacement", true),
        ],
        requiresHumanReview: true,
      },
    ],
    groundTruth: {
      expectedHeaderFields: {
        customerName: "Vogt Hydraulik GmbH",
        customerReference: "VH-4481",
        source: "pdf",
        currency: "EUR",
        requestedDeliveryDate: "2026-07-12",
        deliveryLocation: "Augsburg, DE",
      },
      expectedBlockedCaseIds: ["exc-vh-40-discontinued"],
      expectedEvalOutcome:
        "Header extraction passes. Three lines have expected top-1 matches, one line requires substitute approval because the requested fitting is discontinued.",
      lineItems: [
        {
          lineItemId: "vh-10",
          expectedNormalizedName: "Hex bolt M8x40 A2 stainless",
          expectedAttributes: {
            thread: "M8",
            length: "40 mm",
            material: "A2 stainless steel",
            standard: "DIN 933",
          },
          expectedQuantity: 500,
          expectedUnit: "pcs",
          expectedSku: "OM-FAS-HB-M8X40-A2-D933",
          expectedTop3Skus: [
            "OM-FAS-HB-M8X40-A2-D933",
            "OM-FAS-HB-M8X40-A4-D933",
            "OM-FAS-HB-M8X40-ZN-D933",
          ],
          expectedExceptionCategories: [],
          expectedOutcome: "auto-match",
        },
        {
          lineItemId: "vh-20",
          expectedNormalizedName: "Deep groove ball bearing 6205-2RS C3",
          expectedAttributes: {
            designation: "6205-2RS",
            sealType: "2RS",
            clearance: "C3",
          },
          expectedQuantity: 40,
          expectedUnit: "pcs",
          expectedSku: "OM-BRG-6205-2RS-C3",
          expectedTop3Skus: [
            "OM-BRG-6205-2RS-C3",
            "OM-BRG-6205-ZZ-C3",
            "OM-BRG-6205-OPEN-C3",
          ],
          expectedExceptionCategories: ["ambiguous-sku"],
          expectedOutcome: "human-review",
        },
        {
          lineItemId: "vh-30",
          expectedNormalizedName: "O-ring 10x2 FKM",
          expectedAttributes: {
            innerDiameter: "10 mm",
            crossSection: "2 mm",
            material: "FKM",
          },
          expectedQuantity: 200,
          expectedUnit: "pcs",
          expectedSku: "OM-SEA-OR-10X2-FKM",
          expectedTop3Skus: ["OM-SEA-OR-10X2-FKM", "OM-SEA-OR-10X2-NBR"],
          expectedExceptionCategories: [],
          expectedOutcome: "auto-match",
        },
        {
          lineItemId: "vh-40",
          expectedNormalizedName: "Elbow fitting G1/4 brass old series",
          expectedAttributes: {
            connection: "G1/4",
            material: "brass",
            series: "old",
          },
          expectedQuantity: 12,
          expectedUnit: "pcs",
          expectedSku: "OM-FIT-ELB-G14-BRASS-OLD",
          expectedTop3Skus: [
            "OM-FIT-ELB-G14-BRASS-OLD",
            "OM-FIT-ELB-G14-BRASS",
          ],
          expectedExceptionCategories: ["discontinued-item"],
          expectedOutcome: "substitute-required",
        },
      ],
    },
    coveredEdgeCases: [
      "abbreviation",
      "german-english-variant",
      "ambiguous-sku",
      "discontinued-item",
      "customer-part-conflict",
    ],
    isSimulated: true,
    lastUpdatedAt: "2026-07-01T09:04:00+02:00",
  },
  {
    id: "ord-ms-2026-778",
    header: {
      orderId: "RFQ-778",
      customerName: "MainSpindel Services AG",
      customerReference: "MS-RFQ-778",
      source: "email",
      receivedAt: "2026-07-01T10:43:00+02:00",
      deliveryLocation: "Nuremberg, DE",
      currency: "EUR",
      fieldStatus: {
        orderId: "valid",
        requestedDeliveryDate: "ambiguous",
        deliveryLocation: "valid",
      },
    },
    status: "blocked",
    customerProfile: {
      id: "cust-ms",
      name: "MainSpindel Services AG",
      industry: "machine maintenance and spindle repair",
      region: "Franconia, Germany",
      erpSystem: "SAP Business One",
      orderPattern:
        "Email RFQs with terse maintenance language and delivery timing in free text.",
    },
    sourceDocumentSummary:
      "Email RFQ for sensors, cables, and a replacement motor used in maintenance stock.",
    originalExcerpt:
      "Subject RFQ-778 urgent. Need quote today, deliver next week if possible to Nuremberg. 1) sens M12 pnp 24v 4-pin qty 12. 2) M12 cable 4p 5m PUR qty 12 @12.90. 3) motor 24V gearbox small. 4) repeat line 2 as spare.",
    lineItems: [
      line({
        id: "ms-10",
        lineNumber: 10,
        originalText: "sens M12 pnp 24v 4-pin qty 12",
        normalizedName: "Inductive sensor M12 PNP 24 V 4-pin",
        normalizedAttributes: {
          sensorType: "inductive",
          housing: "M12",
          output: "PNP",
          voltage: "24 V DC",
          pinCount: "4",
        },
        quantity: 12,
        unit: "pcs",
        status: "matched",
        selectedMatchCandidateId: "match-ms-10-a",
      }),
      line({
        id: "ms-20",
        lineNumber: 20,
        originalText: "M12 cable 4p 5m PUR qty 12 @12.90",
        normalizedName: "M12 sensor cable 4-pin PUR 5 m",
        normalizedAttributes: {
          connector: "M12",
          pinCount: "4",
          jacket: "PUR",
          length: "5 m",
        },
        quantity: 12,
        unit: "pcs",
        unitPrice: 12.9,
        currency: "EUR",
        status: "review-needed",
        exceptionIds: ["exc-ms-20-price"],
        selectedMatchCandidateId: "match-ms-20-a",
      }),
      line({
        id: "ms-30",
        lineNumber: 30,
        originalText: "motor 24V gearbox small",
        normalizedName: "DC gear motor 24 V",
        normalizedAttributes: {
          voltage: "24 V DC",
          motorType: "gear motor",
        },
        status: "blocked",
        exceptionIds: ["exc-ms-30-low-confidence", "exc-ms-30-missing-unit"],
        selectedMatchCandidateId: "match-ms-30-a",
      }),
      line({
        id: "ms-40",
        lineNumber: 40,
        originalText: "repeat line 2 as spare",
        normalizedName: "M12 sensor cable 4-pin PUR 5 m",
        normalizedAttributes: {
          duplicateOf: "ms-20",
          connector: "M12",
          pinCount: "4",
          length: "5 m",
        },
        quantity: 12,
        unit: "pcs",
        status: "blocked",
        exceptionIds: ["exc-ms-40-duplicate"],
        selectedMatchCandidateId: "match-ms-40-a",
      }),
    ],
    exceptions: [
      exception({
        id: "exc-ms-20-price",
        category: "price-mismatch",
        severity: "review",
        status: "open",
        lineItemId: "ms-20",
        title: "Requested cable price is below catalog price",
        description:
          "The RFQ references 12.90 EUR, while the catalog price for the best match is 14.20 EUR.",
        blocksErpReadiness: false,
        recoveryAction:
          "Confirm whether the quote should use the latest catalog price or a negotiated customer price.",
      }),
      exception({
        id: "exc-ms-30-low-confidence",
        category: "low-confidence",
        severity: "blocking",
        status: "open",
        lineItemId: "ms-30",
        title: "Motor line is missing speed and mounting details",
        description:
          "The text only says 24V gearbox small. Both 60 rpm and 120 rpm gear motors are plausible.",
        blocksErpReadiness: true,
        recoveryAction:
          "Ask the customer for speed or manufacturer part number before choosing a motor SKU.",
      }),
      exception({
        id: "exc-ms-30-missing-unit",
        category: "missing-unit",
        severity: "blocking",
        status: "open",
        lineItemId: "ms-30",
        title: "Motor quantity unit is missing",
        description:
          "A quantity and unit are required before the line can be sent to ERP.",
        blocksErpReadiness: true,
        recoveryAction:
          "Confirm the requested motor quantity and normalize the unit to pieces.",
      }),
      exception({
        id: "exc-ms-40-duplicate",
        category: "duplicate-line",
        severity: "blocking",
        status: "open",
        lineItemId: "ms-40",
        title: "Possible duplicate of line 20",
        description:
          "The customer asks to repeat line 2 as spare. This may be intentional, but it should not be auto-submitted as a separate duplicate without review.",
        blocksErpReadiness: true,
        recoveryAction:
          "Confirm whether line 40 should be merged with line 20 or kept as a separate spare line.",
      }),
      exception({
        id: "exc-ms-header-delivery",
        category: "delivery-ambiguity",
        severity: "review",
        status: "open",
        title: "Requested delivery date is ambiguous",
        description:
          "The RFQ says deliver next week if possible, which is not an exact ERP delivery date.",
        blocksErpReadiness: false,
        recoveryAction:
          "Convert the note to a target date or keep it as a sales note until confirmed.",
      }),
    ],
    readinessChecks: [
      readiness({
        id: "ready-ms-header",
        label: "Required header fields",
        status: "review-needed",
        reason: "Delivery timing is present only as free text.",
        relatedExceptionIds: ["exc-ms-header-delivery"],
      }),
      readiness({
        id: "ready-ms-motor",
        label: "Motor SKU confidence",
        status: "blocked",
        reason: "Line 30 lacks enough attributes to select a gear motor.",
        relatedLineItemIds: ["ms-30"],
        relatedExceptionIds: ["exc-ms-30-low-confidence", "exc-ms-30-missing-unit"],
      }),
      readiness({
        id: "ready-ms-duplicates",
        label: "Duplicate detection",
        status: "blocked",
        reason: "Line 40 repeats line 20 and needs a merge or keep decision.",
        relatedLineItemIds: ["ms-40"],
        relatedExceptionIds: ["exc-ms-40-duplicate"],
      }),
    ],
    matchCandidates: [
      {
        id: "match-ms-10-a",
        lineItemId: "ms-10",
        catalogItemId: "cat-sens-001",
        sku: "OM-SEN-IND-M12-PNP-NO-4MM",
        confidenceBand: "high-confidence",
        score: 0.9,
        rank: 1,
        proofItems: [
          proof("synonym", "Abbreviation", "sens", "inductive sensor", true),
          proof("catalog-attribute", "Housing", "M12", "M12", true),
          proof("catalog-attribute", "Output", "pnp", "PNP normally open", true),
          proof("catalog-attribute", "Voltage", "24v", "10-30 V DC", true),
        ],
        requiresHumanReview: false,
      },
      {
        id: "match-ms-10-b",
        lineItemId: "ms-10",
        catalogItemId: "cat-sens-002",
        sku: "OM-SEN-IND-M12-NPN-NO-4MM",
        confidenceBand: "blocked",
        score: 0.51,
        rank: 2,
        proofItems: [
          proof("catalog-attribute", "Housing", "M12", "M12", true),
          proof("catalog-attribute", "Output", "pnp", "NPN normally open", false),
        ],
        conflictingEvidence: ["Customer asked for PNP, catalog item is NPN."],
        requiresHumanReview: true,
      },
      {
        id: "match-ms-20-a",
        lineItemId: "ms-20",
        catalogItemId: "cat-cable-001",
        sku: "OM-CAB-M12-4P-PUR-5M",
        confidenceBand: "review-needed",
        score: 0.88,
        rank: 1,
        proofItems: [
          proof("catalog-attribute", "Connector", "M12", "M12 A-coded", true),
          proof("catalog-attribute", "Pin count", "4p", "4-pin", true),
          proof("size", "Length", "5m", "5 m", true),
          proof("price", "Unit price", "12.90 EUR", "14.20 EUR", false),
        ],
        conflictingEvidence: ["Requested price is below current catalog price."],
        requiresHumanReview: true,
      },
      {
        id: "match-ms-30-a",
        lineItemId: "ms-30",
        catalogItemId: "cat-motor-003",
        sku: "OM-MOT-GEAR-24VDC-60RPM",
        confidenceBand: "blocked",
        score: 0.49,
        rank: 1,
        proofItems: [
          proof("catalog-attribute", "Voltage", "24V", "24 V DC", true),
          proof("catalog-attribute", "Motor type", "gearbox", "gear motor", true),
        ],
        missingEvidence: ["speed", "quantity", "unit", "manufacturer part number"],
        requiresHumanReview: true,
      },
      {
        id: "match-ms-30-b",
        lineItemId: "ms-30",
        catalogItemId: "cat-motor-004",
        sku: "OM-MOT-GEAR-24VDC-120RPM",
        confidenceBand: "blocked",
        score: 0.48,
        rank: 2,
        proofItems: [
          proof("catalog-attribute", "Voltage", "24V", "24 V DC", true),
          proof("catalog-attribute", "Motor type", "gearbox", "gear motor", true),
        ],
        missingEvidence: ["speed", "quantity", "unit", "manufacturer part number"],
        requiresHumanReview: true,
      },
      {
        id: "match-ms-40-a",
        lineItemId: "ms-40",
        catalogItemId: "cat-cable-001",
        sku: "OM-CAB-M12-4P-PUR-5M",
        confidenceBand: "blocked",
        score: 0.88,
        rank: 1,
        proofItems: [
          proof("catalog-attribute", "Duplicate reference", "repeat line 2", "same as line 20", true),
          proof("price", "Inherited price", "12.90 EUR", "14.20 EUR", false),
        ],
        conflictingEvidence: ["Duplicate handling must be confirmed before ERP submission."],
        requiresHumanReview: true,
      },
    ],
    groundTruth: {
      expectedHeaderFields: {
        customerName: "MainSpindel Services AG",
        customerReference: "MS-RFQ-778",
        source: "email",
        currency: "EUR",
        deliveryLocation: "Nuremberg, DE",
      },
      expectedBlockedCaseIds: [
        "exc-ms-30-low-confidence",
        "exc-ms-30-missing-unit",
        "exc-ms-40-duplicate",
      ],
      expectedEvalOutcome:
        "Good extraction for sensors and cables. Motor line must be blocked, duplicate line must be reviewed, delivery date is ambiguous.",
      lineItems: [
        {
          lineItemId: "ms-10",
          expectedNormalizedName: "Inductive sensor M12 PNP 24 V 4-pin",
          expectedAttributes: {
            housing: "M12",
            output: "PNP",
            voltage: "24 V DC",
          },
          expectedQuantity: 12,
          expectedUnit: "pcs",
          expectedSku: "OM-SEN-IND-M12-PNP-NO-4MM",
          expectedTop3Skus: [
            "OM-SEN-IND-M12-PNP-NO-4MM",
            "OM-SEN-IND-M12-NPN-NO-4MM",
          ],
          expectedExceptionCategories: [],
          expectedOutcome: "auto-match",
        },
        {
          lineItemId: "ms-20",
          expectedNormalizedName: "M12 sensor cable 4-pin PUR 5 m",
          expectedAttributes: {
            connector: "M12",
            pinCount: "4",
            length: "5 m",
          },
          expectedQuantity: 12,
          expectedUnit: "pcs",
          expectedSku: "OM-CAB-M12-4P-PUR-5M",
          expectedTop3Skus: [
            "OM-CAB-M12-4P-PUR-5M",
            "OM-CAB-M12-5P-PUR-5M",
            "OM-CAB-M12-4P-PUR-10M",
          ],
          expectedExceptionCategories: ["price-mismatch"],
          expectedOutcome: "human-review",
        },
        {
          lineItemId: "ms-30",
          expectedNormalizedName: "DC gear motor 24 V",
          expectedAttributes: {
            voltage: "24 V DC",
            motorType: "gear motor",
          },
          expectedTop3Skus: [
            "OM-MOT-GEAR-24VDC-60RPM",
            "OM-MOT-GEAR-24VDC-120RPM",
          ],
          expectedExceptionCategories: ["low-confidence", "missing-unit"],
          expectedOutcome: "blocked",
        },
        {
          lineItemId: "ms-40",
          expectedNormalizedName: "M12 sensor cable 4-pin PUR 5 m",
          expectedAttributes: {
            duplicateOf: "ms-20",
          },
          expectedQuantity: 12,
          expectedUnit: "pcs",
          expectedSku: "OM-CAB-M12-4P-PUR-5M",
          expectedTop3Skus: [
            "OM-CAB-M12-4P-PUR-5M",
            "OM-CAB-M12-5P-PUR-5M",
          ],
          expectedExceptionCategories: ["duplicate-line", "price-mismatch"],
          expectedOutcome: "blocked",
        },
      ],
    },
    coveredEdgeCases: [
      "abbreviation",
      "price-mismatch",
      "low-confidence-item",
      "missing-unit",
      "duplicate-line",
      "delivery-ambiguity",
    ],
    isSimulated: true,
    lastUpdatedAt: "2026-07-01T11:16:00+02:00",
  },
  {
    id: "ord-ner-2026-3310",
    header: {
      orderId: "PO-3310",
      customerName: "NordEifel Robotics KG",
      customerReference: "NER-PO-3310",
      source: "excel",
      receivedAt: "2026-07-01T13:27:00+02:00",
      requestedDeliveryDate: "2026-07-18",
      deliveryLocation: "Aachen, DE",
      currency: "EUR",
      fieldStatus: {
        orderId: "valid",
        requestedDeliveryDate: "valid",
        deliveryLocation: "valid",
      },
    },
    status: "review-needed",
    customerProfile: {
      id: "cust-ner",
      name: "NordEifel Robotics KG",
      industry: "robotics cell integrator",
      region: "North Rhine-Westphalia, Germany",
      erpSystem: "proALPHA",
      orderPattern:
        "Excel order lists with short item names, mixed units, and customer part numbers.",
    },
    sourceDocumentSummary:
      "Excel line-item list for pneumatic fittings, valves, and control cable.",
    originalExcerpt:
      "PO-3310. Delivery Aachen 18.07.2026. Row 1 Push-in 8mm G1/4 old pn PNEU-8G14 qty 30. Row 2 ball valve DN25 stainless qty 6. Row 3 control cable 4G0.75 100. Row 4 adapter G1/2-G1/4 inox 15 pcs.",
    lineItems: [
      line({
        id: "ner-10",
        lineNumber: 10,
        originalText: "Push-in 8mm G1/4 old pn PNEU-8G14 qty 30",
        normalizedName: "Push-in fitting 8 mm to G1/4",
        normalizedAttributes: {
          tubeDiameter: "8 mm",
          connection: "G1/4",
          customerPartNumber: "PNEU-8G14",
        },
        quantity: 30,
        unit: "pcs",
        customerPartNumber: "PNEU-8G14",
        status: "review-needed",
        exceptionIds: ["exc-ner-10-discontinued"],
        selectedMatchCandidateId: "match-ner-10-a",
      }),
      line({
        id: "ner-20",
        lineNumber: 20,
        originalText: "ball valve DN25 stainless qty 6",
        normalizedName: "Ball valve DN25 stainless",
        normalizedAttributes: {
          type: "ball valve",
          nominalDiameter: "DN25",
          material: "stainless steel",
        },
        quantity: 6,
        unit: "pcs",
        status: "matched",
        selectedMatchCandidateId: "match-ner-20-a",
      }),
      line({
        id: "ner-30",
        lineNumber: 30,
        originalText: "control cable 4G0.75 100",
        normalizedName: "Control cable 4G0.75 YSLY",
        normalizedAttributes: {
          coreCount: "4G",
          crossSection: "0.75 mm2",
        },
        quantity: 100,
        status: "blocked",
        exceptionIds: ["exc-ner-30-missing-unit"],
        selectedMatchCandidateId: "match-ner-30-a",
      }),
      line({
        id: "ner-40",
        lineNumber: 40,
        originalText: "adapter G1/2-G1/4 inox 15 pcs",
        normalizedName: "Thread adapter G1/2 to G1/4 stainless",
        normalizedAttributes: {
          connectionA: "G1/2",
          connectionB: "G1/4",
          material: "stainless steel",
        },
        quantity: 15,
        unit: "pcs",
        status: "matched",
        selectedMatchCandidateId: "match-ner-40-a",
      }),
    ],
    exceptions: [
      exception({
        id: "exc-ner-10-discontinued",
        category: "discontinued-item",
        severity: "review",
        status: "open",
        lineItemId: "ner-10",
        title: "Old push-in fitting has a replacement",
        description:
          "The old push-in fitting series has a V2 replacement. The customer part number should be mapped before accepting.",
        blocksErpReadiness: false,
        recoveryAction:
          "Review the V2 replacement SKU and preserve the customer part number in the ERP line note.",
      }),
      exception({
        id: "exc-ner-30-missing-unit",
        category: "missing-unit",
        severity: "blocking",
        status: "open",
        lineItemId: "ner-30",
        title: "Cable unit missing",
        description:
          "The line says 100 but does not say whether that means meters, rolls, or pieces.",
        blocksErpReadiness: true,
        recoveryAction:
          "Confirm whether the quantity should be 100 meters before the ERP line is created.",
      }),
    ],
    readinessChecks: [
      readiness({
        id: "ready-ner-header",
        label: "Required header fields",
        status: "passed",
        reason: "PO id, customer, delivery date, location, and currency are present.",
      }),
      readiness({
        id: "ready-ner-replacements",
        label: "Replacement mapping",
        status: "review-needed",
        reason: "Line 10 uses an older fitting reference with an active replacement.",
        relatedLineItemIds: ["ner-10"],
        relatedExceptionIds: ["exc-ner-10-discontinued"],
      }),
      readiness({
        id: "ready-ner-units",
        label: "Unit normalization",
        status: "blocked",
        reason: "Line 30 has a quantity but no unit.",
        relatedLineItemIds: ["ner-30"],
        relatedExceptionIds: ["exc-ner-30-missing-unit"],
      }),
    ],
    matchCandidates: [
      {
        id: "match-ner-10-a",
        lineItemId: "ner-10",
        catalogItemId: "cat-fit-006",
        sku: "OM-FIT-PUSH-8MM-G14-V2",
        confidenceBand: "review-needed",
        score: 0.82,
        rank: 1,
        proofItems: [
          proof("catalog-attribute", "Tube diameter", "8mm", "8 mm", true),
          proof("catalog-attribute", "Thread", "G1/4", "G1/4", true),
          proof("availability", "Replacement", "old pn", "active V2 replacement", true),
        ],
        requiresHumanReview: true,
      },
      {
        id: "match-ner-10-b",
        lineItemId: "ner-10",
        catalogItemId: "cat-fit-005",
        sku: "OM-FIT-PUSH-8MM-G14",
        confidenceBand: "blocked",
        score: 0.86,
        rank: 2,
        proofItems: [
          proof("catalog-attribute", "Tube diameter", "8mm", "8 mm", true),
          proof("availability", "Catalog status", "old pn", "replacement available", false),
        ],
        conflictingEvidence: ["Catalog row is not the active sellable replacement."],
        requiresHumanReview: true,
      },
      {
        id: "match-ner-20-a",
        lineItemId: "ner-20",
        catalogItemId: "cat-valve-002",
        sku: "OM-VAL-BALL-DN25-SS316",
        confidenceBand: "high-confidence",
        score: 0.91,
        rank: 1,
        proofItems: [
          proof("catalog-attribute", "Valve type", "ball valve", "ball valve", true),
          proof("size", "Nominal diameter", "DN25", "DN25", true),
          proof("material", "Material", "stainless", "stainless steel 316", true),
        ],
        requiresHumanReview: false,
      },
      {
        id: "match-ner-20-b",
        lineItemId: "ner-20",
        catalogItemId: "cat-valve-001",
        sku: "OM-VAL-BALL-DN25-BRASS",
        confidenceBand: "blocked",
        score: 0.57,
        rank: 2,
        proofItems: [
          proof("catalog-attribute", "Valve type", "ball valve", "ball valve", true),
          proof("material", "Material", "stainless", "brass", false),
        ],
        conflictingEvidence: ["Customer asked for stainless, catalog item is brass."],
        requiresHumanReview: true,
      },
      {
        id: "match-ner-30-a",
        lineItemId: "ner-30",
        catalogItemId: "cat-cable-003",
        sku: "OM-CAB-CTRL-4G075-YSLY",
        confidenceBand: "blocked",
        score: 0.87,
        rank: 1,
        proofItems: [
          proof("catalog-attribute", "Core count", "4G", "4G", true),
          proof("catalog-attribute", "Cross section", "0.75", "0.75 mm2", true),
          proof("unit", "Unit", "missing", "m", false),
        ],
        missingEvidence: ["unit"],
        requiresHumanReview: true,
      },
      {
        id: "match-ner-40-a",
        lineItemId: "ner-40",
        catalogItemId: "cat-fit-003",
        sku: "OM-FIT-ADAPT-G12-G14-SS",
        confidenceBand: "high-confidence",
        score: 0.92,
        rank: 1,
        proofItems: [
          proof("size", "Thread sizes", "G1/2-G1/4", "G1/2 to G1/4", true),
          proof("material", "Material synonym", "inox", "stainless steel", true),
        ],
        requiresHumanReview: false,
      },
    ],
    groundTruth: {
      expectedHeaderFields: {
        customerName: "NordEifel Robotics KG",
        customerReference: "NER-PO-3310",
        source: "excel",
        currency: "EUR",
        requestedDeliveryDate: "2026-07-18",
        deliveryLocation: "Aachen, DE",
      },
      expectedBlockedCaseIds: ["exc-ner-30-missing-unit"],
      expectedEvalOutcome:
        "Excel row extraction succeeds, but cable unit normalization blocks ERP readiness and replacement mapping needs review.",
      lineItems: [
        {
          lineItemId: "ner-10",
          expectedNormalizedName: "Push-in fitting 8 mm to G1/4",
          expectedAttributes: {
            tubeDiameter: "8 mm",
            connection: "G1/4",
          },
          expectedQuantity: 30,
          expectedUnit: "pcs",
          expectedSku: "OM-FIT-PUSH-8MM-G14-V2",
          expectedTop3Skus: ["OM-FIT-PUSH-8MM-G14-V2", "OM-FIT-PUSH-8MM-G14"],
          expectedExceptionCategories: ["discontinued-item"],
          expectedOutcome: "human-review",
        },
        {
          lineItemId: "ner-20",
          expectedNormalizedName: "Ball valve DN25 stainless",
          expectedAttributes: {
            nominalDiameter: "DN25",
            material: "stainless steel",
          },
          expectedQuantity: 6,
          expectedUnit: "pcs",
          expectedSku: "OM-VAL-BALL-DN25-SS316",
          expectedTop3Skus: [
            "OM-VAL-BALL-DN25-SS316",
            "OM-VAL-BALL-DN25-BRASS",
          ],
          expectedExceptionCategories: [],
          expectedOutcome: "auto-match",
        },
        {
          lineItemId: "ner-30",
          expectedNormalizedName: "Control cable 4G0.75 YSLY",
          expectedAttributes: {
            coreCount: "4G",
            crossSection: "0.75 mm2",
          },
          expectedQuantity: 100,
          expectedSku: "OM-CAB-CTRL-4G075-YSLY",
          expectedTop3Skus: ["OM-CAB-CTRL-4G075-YSLY"],
          expectedExceptionCategories: ["missing-unit"],
          expectedOutcome: "blocked",
        },
        {
          lineItemId: "ner-40",
          expectedNormalizedName: "Thread adapter G1/2 to G1/4 stainless",
          expectedAttributes: {
            connectionA: "G1/2",
            connectionB: "G1/4",
            material: "stainless steel",
          },
          expectedQuantity: 15,
          expectedUnit: "pcs",
          expectedSku: "OM-FIT-ADAPT-G12-G14-SS",
          expectedTop3Skus: ["OM-FIT-ADAPT-G12-G14-SS"],
          expectedExceptionCategories: [],
          expectedOutcome: "auto-match",
        },
      ],
    },
    coveredEdgeCases: [
      "discontinued-item",
      "missing-unit",
      "german-english-variant",
      "unit-mismatch",
      "customer-part-conflict",
    ],
    isSimulated: true,
    lastUpdatedAt: "2026-07-01T14:01:00+02:00",
  },
  {
    id: "ord-lp-2026-9004",
    header: {
      orderId: "PO-9004",
      customerName: "LakePort Maintenance Supply LLC",
      customerReference: "LPM-9004",
      source: "rfq-attachment",
      receivedAt: "2026-07-01T15:40:00+02:00",
      requestedDeliveryDate: "2026-07-22",
      deliveryLocation: "Cleveland, OH, US",
      currency: "USD",
      fieldStatus: {
        orderId: "valid",
        requestedDeliveryDate: "valid",
        deliveryLocation: "valid",
        currency: "requires-review",
      },
    },
    status: "blocked",
    customerProfile: {
      id: "cust-lp",
      name: "LakePort Maintenance Supply LLC",
      industry: "maintenance, repair, and operations distributor",
      region: "Ohio, United States",
      erpSystem: "NetSuite",
      orderPattern:
        "RFQ attachments with mixed European and US terminology, quote prices, and occasional non-catalog items.",
    },
    sourceDocumentSummary:
      "RFQ attachment for valves, pressure sensors, seals, and a non-catalog hose assembly.",
    originalExcerpt:
      "PO-9004. Ship Cleveland by 07/22/2026. Currency USD. Need: check valve 1/2 brass 20 ea; pressure transducer G1/4 0-16bar 4-20mA 5 ea; shaft seal 25x40x7 NBR 20 pcs; custom hose assy 3/8 with swivel ends 4 set.",
    lineItems: [
      line({
        id: "lp-10",
        lineNumber: 10,
        originalText: "check valve 1/2 brass 20 ea",
        normalizedName: "Check valve G1/2 brass",
        normalizedAttributes: {
          type: "check valve",
          connection: "G1/2",
          material: "brass",
        },
        quantity: 20,
        unit: "ea",
        unitPrice: 14.5,
        currency: "USD",
        status: "matched",
        selectedMatchCandidateId: "match-lp-10-a",
      }),
      line({
        id: "lp-20",
        lineNumber: 20,
        originalText: "pressure transducer G1/4 0-16bar 4-20mA 5 ea",
        normalizedName: "Pressure sensor G1/4 0-16 bar 4-20 mA",
        normalizedAttributes: {
          sensorType: "pressure",
          connection: "G1/4",
          range: "0-16 bar",
          output: "4-20 mA",
        },
        quantity: 5,
        unit: "ea",
        status: "matched",
        selectedMatchCandidateId: "match-lp-20-a",
      }),
      line({
        id: "lp-30",
        lineNumber: 30,
        originalText: "shaft seal 25x40x7 NBR 20 pcs",
        normalizedName: "Rotary shaft seal 25x40x7 NBR",
        normalizedAttributes: {
          innerDiameter: "25 mm",
          outsideDiameter: "40 mm",
          width: "7 mm",
          material: "NBR",
        },
        quantity: 20,
        unit: "pcs",
        status: "matched",
        selectedMatchCandidateId: "match-lp-30-a",
      }),
      line({
        id: "lp-40",
        lineNumber: 40,
        originalText: "custom hose assy 3/8 with swivel ends 4 set",
        normalizedName: "Custom hose assembly 3/8 with swivel ends",
        normalizedAttributes: {
          hoseSize: "3/8",
          endType: "swivel",
          itemType: "custom hose assembly",
        },
        quantity: 4,
        unit: "set",
        status: "no-match",
        exceptionIds: ["exc-lp-40-no-match"],
        selectedMatchCandidateId: "match-lp-40-a",
      }),
    ],
    exceptions: [
      exception({
        id: "exc-lp-currency",
        category: "required-erp-field-missing",
        severity: "review",
        status: "open",
        title: "Currency conversion needs review",
        description:
          "The customer requests USD, while catalog prices are stored in EUR for this sample data.",
        blocksErpReadiness: false,
        recoveryAction:
          "Apply the customer price list or route to sales review before quote creation.",
      }),
      exception({
        id: "exc-lp-40-no-match",
        category: "no-catalog-match",
        severity: "blocking",
        status: "open",
        lineItemId: "lp-40",
        title: "No catalog item for custom hose assembly",
        description:
          "The catalog contains fittings but does not contain a custom hose assembly with 3/8 swivel ends.",
        blocksErpReadiness: true,
        recoveryAction:
          "Create a non-stock item or request engineering review before quoting.",
      }),
    ],
    readinessChecks: [
      readiness({
        id: "ready-lp-header",
        label: "Required header fields",
        status: "review-needed",
        reason: "Currency is extracted but needs price-list handling.",
        relatedExceptionIds: ["exc-lp-currency"],
      }),
      readiness({
        id: "ready-lp-matches",
        label: "SKU match coverage",
        status: "blocked",
        reason: "Line 40 has no catalog match.",
        relatedLineItemIds: ["lp-40"],
        relatedExceptionIds: ["exc-lp-40-no-match"],
      }),
    ],
    matchCandidates: [
      {
        id: "match-lp-10-a",
        lineItemId: "lp-10",
        catalogItemId: "cat-valve-004",
        sku: "OM-VAL-CHECK-G12-BRASS",
        confidenceBand: "high-confidence",
        score: 0.9,
        rank: 1,
        proofItems: [
          proof("catalog-attribute", "Valve type", "check valve", "check valve", true),
          proof("size", "Thread", "1/2", "G1/2", true),
          proof("material", "Material", "brass", "brass", true),
          proof("unit", "Unit", "ea", "pcs", true),
        ],
        requiresHumanReview: false,
      },
      {
        id: "match-lp-20-a",
        lineItemId: "lp-20",
        catalogItemId: "cat-sens-004",
        sku: "OM-SEN-PRES-G14-0-16BAR-4-20MA",
        confidenceBand: "high-confidence",
        score: 0.94,
        rank: 1,
        proofItems: [
          proof("synonym", "Product term", "transducer", "pressure sensor", true),
          proof("size", "Pressure range", "0-16bar", "0-16 bar", true),
          proof("catalog-attribute", "Output", "4-20mA", "4-20 mA", true),
        ],
        requiresHumanReview: false,
      },
      {
        id: "match-lp-20-b",
        lineItemId: "lp-20",
        catalogItemId: "cat-sens-003",
        sku: "OM-SEN-PRES-G14-0-10BAR-4-20MA",
        confidenceBand: "blocked",
        score: 0.66,
        rank: 2,
        proofItems: [
          proof("catalog-attribute", "Output", "4-20mA", "4-20 mA", true),
          proof("size", "Pressure range", "0-16bar", "0-10 bar", false),
        ],
        conflictingEvidence: ["Pressure range is lower than requested."],
        requiresHumanReview: true,
      },
      {
        id: "match-lp-30-a",
        lineItemId: "lp-30",
        catalogItemId: "cat-seal-004",
        sku: "OM-SEA-SHAFT-25X40X7-NBR",
        confidenceBand: "high-confidence",
        score: 0.93,
        rank: 1,
        proofItems: [
          proof("size", "Seal dimensions", "25x40x7", "25 x 40 x 7 mm", true),
          proof("material", "Material", "NBR", "NBR", true),
        ],
        requiresHumanReview: false,
      },
      {
        id: "match-lp-40-a",
        lineItemId: "lp-40",
        confidenceBand: "no-match",
        score: 0.12,
        rank: 1,
        proofItems: [
          proof("catalog-attribute", "Product family", "custom hose assy", undefined, false),
          proof("size", "Hose size", "3/8", undefined, false),
        ],
        missingEvidence: ["catalog item", "manufacturer part number", "build specification"],
        requiresHumanReview: true,
      },
    ],
    groundTruth: {
      expectedHeaderFields: {
        customerName: "LakePort Maintenance Supply LLC",
        customerReference: "LPM-9004",
        source: "rfq-attachment",
        currency: "USD",
        requestedDeliveryDate: "2026-07-22",
        deliveryLocation: "Cleveland, OH, US",
      },
      expectedBlockedCaseIds: ["exc-lp-40-no-match"],
      expectedEvalOutcome:
        "Three lines can be matched with traceability. The custom hose line must be a no-match blocked case.",
      lineItems: [
        {
          lineItemId: "lp-10",
          expectedNormalizedName: "Check valve G1/2 brass",
          expectedAttributes: {
            connection: "G1/2",
            material: "brass",
          },
          expectedQuantity: 20,
          expectedUnit: "ea",
          expectedSku: "OM-VAL-CHECK-G12-BRASS",
          expectedTop3Skus: ["OM-VAL-CHECK-G12-BRASS"],
          expectedExceptionCategories: [],
          expectedOutcome: "auto-match",
        },
        {
          lineItemId: "lp-20",
          expectedNormalizedName: "Pressure sensor G1/4 0-16 bar 4-20 mA",
          expectedAttributes: {
            connection: "G1/4",
            range: "0-16 bar",
            output: "4-20 mA",
          },
          expectedQuantity: 5,
          expectedUnit: "ea",
          expectedSku: "OM-SEN-PRES-G14-0-16BAR-4-20MA",
          expectedTop3Skus: [
            "OM-SEN-PRES-G14-0-16BAR-4-20MA",
            "OM-SEN-PRES-G14-0-10BAR-4-20MA",
          ],
          expectedExceptionCategories: [],
          expectedOutcome: "auto-match",
        },
        {
          lineItemId: "lp-30",
          expectedNormalizedName: "Rotary shaft seal 25x40x7 NBR",
          expectedAttributes: {
            size: "25x40x7",
            material: "NBR",
          },
          expectedQuantity: 20,
          expectedUnit: "pcs",
          expectedSku: "OM-SEA-SHAFT-25X40X7-NBR",
          expectedTop3Skus: ["OM-SEA-SHAFT-25X40X7-NBR"],
          expectedExceptionCategories: [],
          expectedOutcome: "auto-match",
        },
        {
          lineItemId: "lp-40",
          expectedNormalizedName: "Custom hose assembly 3/8 with swivel ends",
          expectedAttributes: {
            hoseSize: "3/8",
            endType: "swivel",
          },
          expectedQuantity: 4,
          expectedUnit: "set",
          expectedTop3Skus: [],
          expectedExceptionCategories: ["no-catalog-match"],
          expectedOutcome: "no-match",
        },
      ],
    },
    coveredEdgeCases: ["no-match-item", "unit-mismatch"],
    isSimulated: true,
    lastUpdatedAt: "2026-07-01T16:08:00+02:00",
  },
];

export const primaryWalkthroughOrderId = "ord-vh-2026-0142";

export const edgeCaseCoverage = sampleOrders.flatMap((order) =>
  order.coveredEdgeCases.map((edgeCase) => ({
    edgeCase,
    orderId: order.id,
    orderLabel: order.header.orderId,
  })),
);
