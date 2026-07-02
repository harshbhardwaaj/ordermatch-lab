# Edge-Case Matrix

**Date**: July 2, 2026
**Dataset**: `frontend/data/catalog.ts`, `frontend/data/orders.ts`, `frontend/data/evals.ts`, `frontend/data/candidate.ts`

## Data Safety Note

The Phase 3 dataset is grounded synthetic sample data. It uses public procurement structures, public industrial product naming patterns, and explicit design assumptions from `docs/data-research/grounding-notes.md` and `docs/data-research/source-map.md`.

It does not include real customer data, Comena customer data, private purchase orders, private catalog rows, or proprietary Comena information.

## Sample Dataset Summary

| Area | Coverage |
|---|---|
| Catalog | 46 synthetic industrial catalog rows |
| Catalog families | Fasteners, bearings, seals, valves, sensors, cables, motors, fittings |
| Orders/RFQs | 4 synthetic records |
| Line items | 16 total |
| Match candidates | High-confidence, review-needed, blocked, and no-match |
| Ground truth | Header fields, line extraction labels, expected SKUs, top-3 candidates, blocked cases, expected eval outcomes |
| Evals | Complete simulated run plus stale run for future UX states |
| Candidate proof | 4 selected proof points from `docs/story-bank-harsh.md` |

## Required Edge-Case Coverage

| Required case | Order | Line or field | Dataset evidence | Expected handling |
|---|---|---|---|---|
| Abbreviations | `PO-2026-0142`, `RFQ-778` | `vh-10`, `ms-10`, `ms-20` | `hex bolt m8x40 inox`, `sens M12 pnp 24v`, `M12 cable 4p` | Normalize abbreviations while preserving original text. |
| Missing units | `RFQ-778`, `PO-3310` | `ms-30`, `ner-30` | Motor line lacks quantity/unit; cable line says `100` without unit. | Block ERP readiness until unit is confirmed. |
| German/English variants | `PO-2026-0142`, `PO-3310` | `vh-20`, `vh-30`, `ner-40` | `Kugellager`, `Stk`, `inox` | Map terms to English normalized fields and proof reasons. |
| Duplicate line | `RFQ-778` | `ms-40` | `repeat line 2 as spare` | Block auto-submission until merge or keep decision is made. |
| Price mismatch | `RFQ-778` | `ms-20` | Requested `12.90 EUR`, catalog `14.20 EUR` | Keep SKU candidate but require sales review. |
| Ambiguous SKU | `PO-2026-0142` | `vh-20` | 6205 bearing has 2RS, ZZ, and open variants. | Rank best match, show alternates, require review. |
| No-match item | `PO-9004` | `lp-40` | Custom hose assembly is outside sample catalog. | Use no-match candidate and block ERP readiness. |
| Discontinued item | `PO-2026-0142`, `PO-3310` | `vh-40`, `ner-10` | Old fitting series and replacement-available push-in fitting. | Route substitute/replacement approval. |
| Low-confidence item | `RFQ-778` | `ms-30` | `motor 24V gearbox small` lacks speed and other attributes. | Block confident match and list missing evidence. |
| Unit mismatch | `PO-9004`, `PO-3310` | `lp-10`, `ner-30` | `ea` vs `pcs`, cable quantity without meter unit. | Normalize equivalent units when safe; block unclear units. |
| Customer part conflict or mapping risk | `PO-2026-0142`, `PO-3310` | `vh-40`, `ner-10` | Customer part maps to old or replacement item. | Preserve customer part number and require human decision. |
| Delivery ambiguity | `RFQ-778` | Header | `deliver next week if possible` | Mark header field as ambiguous and keep order reviewable. |

## Traceability Reason Coverage

| Reason kind | Example candidate | Evidence |
|---|---|---|
| Size | `match-vh-10-a`, `match-lp-30-a` | `m8x40`, `25x40x7` matched to catalog attributes. |
| Material | `match-vh-10-a`, `match-ner-40-a` | `inox` mapped to stainless material. |
| Standard | `match-vh-10-a` | Hex bolt normalized to DIN 933 catalog row. |
| Unit | `match-vh-20-a`, `match-lp-10-a` | `Stk` and `ea` interpreted as order units. |
| Synonym | `match-vh-20-a`, `match-lp-20-a` | `Kugellager` and `transducer` mapped to catalog terms. |
| Customer part number | `match-vh-10-a`, `match-vh-40-a` | Customer-specific references support or constrain match choice. |
| Catalog attribute | `match-ms-10-a`, `match-ner-20-a` | Output type, housing, valve type, pressure range, and pin count. |
| Price | `match-ms-20-a` | Requested price conflicts with catalog price. |
| Availability | `match-vh-40-a`, `match-ner-10-a` | Discontinued and replacement-available catalog rows. |

## Ground-Truth Label Coverage

| Label type | Location | Notes |
|---|---|---|
| Expected header fields | `sampleOrders[].groundTruth.expectedHeaderFields` | Customer, reference, source, currency, delivery date, and delivery location. |
| Expected extraction fields | `sampleOrders[].groundTruth.lineItems[].expectedAttributes` | Normalized product names and extracted attributes per line. |
| Expected SKU matches | `sampleOrders[].groundTruth.lineItems[].expectedSku` | Present when a known catalog SKU should be selected. |
| Expected top-3 matches | `sampleOrders[].groundTruth.lineItems[].expectedTop3Skus` | Supports future top-3 recall evals and alternate candidate UI. |
| Expected blocked cases | `sampleOrders[].groundTruth.expectedBlockedCaseIds` | Maps blocking exceptions to ERP readiness. |
| Expected eval outcomes | `sampleOrders[].groundTruth.expectedEvalOutcome` | Explains what the eval section should communicate per order. |
| Failure cases | `sampleEvalRuns[0].failureCases` | Ties eval cards to visible line items and exception categories. |

## P1 User Story Validation

| P1 story | Dataset support |
|---|---|
| US1, Understand why this exists | Data notices explicitly mark the sample data as grounded synthetic, reinforcing honest Comena-specific framing without claiming access to private data. |
| US2, See the core order workflow | Four orders cover queue records, headers, original excerpts, extracted line items, match candidates, exceptions, and readiness checks. |
| US3, See the engineering thesis | The dataset exposes extraction labels, normalization, SKU ranking, confidence states, exception routing, eval metrics, stale eval state, and graceful no-match behavior. |
| US4, Understand the trust model | Candidates include high-confidence, review-needed, blocked, and no-match bands, with proof items, missing evidence, conflicting evidence, and readiness blockers. |

## Phase 3 Scope Check

| Task | Status in dataset |
|---|---|
| T023 Catalog data | `frontend/data/catalog.ts` contains 46 catalog rows across all required families. |
| T024 Orders/RFQs | `frontend/data/orders.ts` contains 4 synthetic POs/RFQs with customer profiles. |
| T025 Evals | `frontend/data/evals.ts` contains extraction, matching, review, false-confident, exception, and time-saved metrics. |
| T026 Candidate proof | `frontend/data/candidate.ts` contains selected proof points from `docs/story-bank-harsh.md`. |
| T027 Messy cases | Covered in the required edge-case table above. |
| T028 Traceability reasons | Covered in `matchCandidates[].proofItems` and traceability table above. |
| T029 Ground truth labels | Covered in `groundTruth` fields and eval failure cases. |
| T030 Edge-case matrix | This file. |
| T031 Sample-data metadata | Data notices in all new data files mark the dataset as grounded synthetic/sample data. |
| T032 P1 validation | Covered in the P1 user story validation table above. |
