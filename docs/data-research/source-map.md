# Grounded Synthetic Data Source Map

**Date**: July 2, 2026
**Purpose**: Map the first mock data choices to public sources, public patterns, or explicit design assumptions.

## Source Types

- **Public source**: A specific public page or standard directly supports the structure.
- **Public pattern**: A common pattern observed across public standards, procurement formats, or catalog examples.
- **Design assumption**: A deliberate synthetic choice made to support the product story safely.

## Mapping

| Data choice | Source type | Grounding | How it should be used |
|---|---|---|---|
| Inbox/email/PDF/Excel/CSV input types | Public source | Comena homepage says its product reads PDFs, emails, complex attachments, Excel, CSV, and similar documents. | Use source-type tags in the order queue and document viewer states. |
| Inbox-to-ERP workflow | Public source | Comena homepage and YC pages describe order processing from email inbox to ERP. | Make the workflow visible from opening copy through ERP readiness. |
| Buyer, supplier, party, contact, address fields | Public source | OCDS release reference includes parties, buyer, identifiers, address, and contact point. UBL includes buyer/customer and seller/supplier parties. | Use synthetic customer and supplier fields in order headers. |
| PO/RFQ id, issue date, order date, notes, currency | Public source | UBL Order schema defines order identifier, issue date, notes, currency, and order type concepts. | Use in extracted fields and ERP readiness validation. |
| Delivery details and delivery terms | Public source | UBL Order schema includes delivery and delivery terms. | Use requested delivery date, delivery location, and ambiguous delivery note exceptions. |
| Order lines | Public source | UBL Order schema requires one or more order lines. OCDS uses item structures for goods/services. | Make line-item review the core prototype surface. |
| Item description, quantity, unit, unit price | Public source | OCDS item block includes description, classification, quantity, unit, and unit value. | Use these as minimum line-item fields. |
| Unit normalization | Public source | OCDS unit block supports unit name, scheme, id, and value. | Normalize pcs, ea, Stk, m, kg, pack, set, and roll. |
| Multilingual field handling | Public source | OCDS reference supports language-tagged free-text fields. | Include German/English terms and preserve original language in original text. |
| Product classifications | Public pattern | CPV and procurement schemas use product/service classification. | Use broad product families and optional CPV-like category labels for eval context, not exact copied codes. |
| Fasteners | Public pattern | Industrial catalogs commonly describe bolts/nuts by standard, thread, length, material, and finish. | Include M sizes, DIN/ISO standards, inox/A2, zinc plated, and pack-size ambiguity. |
| Bearings | Public pattern | Public bearing catalogs use designations such as 6205 and attributes like bore, outside diameter, width, sealing, and clearance. | Include clear matches and ambiguous sealed/open variants. |
| Seals | Public pattern | Industrial seal catalogs use material, profile, inner diameter, cross-section, and temperature/medium fit. | Include O-ring and shaft seal cases with material ambiguity. |
| Valves and fittings | Public pattern | Industrial catalogs describe connection type, thread, nominal diameter, material, pressure, and actuation. | Include G-thread, DN size, brass/stainless, and pressure mismatch cases. |
| Sensors and cables | Public pattern | Public automation catalogs use M12, pin count, PNP/NPN, voltage, cable length, and IP rating. | Include compact line text such as "sens M12 pnp 24v 4-pin". |
| Motors | Public pattern | Industrial motor catalogs use voltage, phase, power, frame size, speed, and mounting. | Include a low-confidence case where too few motor attributes are present. |
| Synthetic customer profiles | Design assumption | Comena serves industrial distributors and manufacturers, but no private customer data should be used. | Use fictional German/US industrial company names and safe sector labels. |
| 3 to 5 sample orders | Design assumption | Enough to cover queue, review, eval, and state variety without overloading v0. | Use one primary order for guided walkthrough and secondary orders for queue states. |
| 30 to 80 catalog items | Design assumption | Enough to support alternate candidates and ambiguity without delaying frontend work. | Build a compact catalog that has near-neighbor SKUs for matching proof. |
| Confidence bands | Design assumption | The product needs high-confidence, review-needed, blocked, and no-match states. | Use thresholds as UI policy first; backend can refine later. |
| Match reasons | Design assumption | Traceability is required by constitution and spec. | Include reasons such as size, material, standard, unit, synonym, customer part number, and catalog attribute. |
| Eval metrics | Design assumption | Spec requires extraction accuracy, SKU top-1, top-3 recall, human review, auto-approval, false confident matches, exceptions, and time saved. | Make metrics connect to visible sample orders and later ground truth labels. |
| Sample data disclosure | Design assumption | The app must be honest without weakening the story. | Use small sample-data labels in product context, not apologetic disclaimers. |

## Source Links

- Comena: https://comena.ai/
- YC Comena jobs: https://www.ycombinator.com/companies/comena/jobs
- OCDS release reference: https://standard.open-contracting.org/latest/en/schema/reference/
- OASIS UBL 2.4 Order schema: https://docs.oasis-open.org/ubl/os-UBL-2.4/xsd/maindoc/UBL-Order-2.4.xsd
- OASIS UBL 2.4 common aggregates: https://docs.oasis-open.org/ubl/os-UBL-2.4/xsd/common/UBL-CommonAggregateComponents-2.4.xsd
- SKF bearing example: https://www.skf.com/group/products/rolling-bearings/ball-bearings/deep-groove-ball-bearings/productid-6205
- CPV background: https://en.wikipedia.org/wiki/Common_Procurement_Vocabulary
