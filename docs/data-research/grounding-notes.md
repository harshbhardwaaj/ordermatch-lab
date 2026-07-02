# Grounding Notes For Synthetic Data

**Date**: July 2, 2026
**Purpose**: Define the public patterns that should guide the first OrderMatch Lab mock order, catalog, exception, and eval data.

## Sources Checked

- Open Contracting Data Standard release reference: https://standard.open-contracting.org/latest/en/schema/reference/
- OASIS UBL 2.4 Order schema: https://docs.oasis-open.org/ubl/os-UBL-2.4/xsd/maindoc/UBL-Order-2.4.xsd
- OASIS UBL 2.4 common aggregate components: https://docs.oasis-open.org/ubl/os-UBL-2.4/xsd/common/UBL-CommonAggregateComponents-2.4.xsd
- Common Procurement Vocabulary background: https://en.wikipedia.org/wiki/Common_Procurement_Vocabulary
- SKF public product example for bearing designation patterns: https://www.skf.com/group/products/rolling-bearings/ball-bearings/deep-groove-ball-bearings/productid-6205
- Comena public product framing: https://comena.ai/

## What Public Structures Suggest

OCDS is useful for procurement structure, not for copying private order data. It supports these concepts:

- contracting process identifiers
- parties, buyer, supplier, addresses, and contact points
- tender, award, contract, and implementation sections
- item descriptions, classifications, quantities, and units
- language handling for multilingual descriptions
- units with scheme, id, name, and unit value

UBL Order is useful for purchase-order document shape. It supports these concepts:

- document identifier, issue date, order date, notes, currency, and order type
- buyer and seller party references
- delivery details and delivery terms
- payment means and payment terms
- anticipated monetary total
- one or more order lines
- line association with catalog lines and item identity
- buyer, seller, catalog, and additional item identifiers in common aggregate components

Comena public pages confirm the application setting:

- input documents can include PDFs, emails, Excel, CSV, complex attachments, and handwritten notes
- the core workflow is order/request intake into ERP
- reliable article matching matters as much as extraction
- onboarding and ERP/customer-specific workflow work are part of implementation reality

## First Mock Data Shape

Use 3 to 5 synthetic incoming orders or RFQs. Each order should include:

- order id or RFQ id
- received timestamp
- customer name and synthetic customer id
- customer industry and country/region
- source type: email, PDF, Excel list, pasted text, or RFQ attachment
- original text excerpt or document summary
- buyer contact and shipping/delivery location
- requested delivery date or ambiguous delivery note
- currency
- line items
- extraction status
- match status
- exception count
- ERP readiness status

Each line item should include:

- original customer text
- customer line number
- customer part number when present
- requested quantity
- original unit
- normalized unit
- extracted product family
- normalized attributes
- requested price or expected price when present
- suggested SKU
- alternate match candidates
- confidence band
- match reasons
- exceptions
- expected ground truth for later eval work

Each catalog item should include:

- internal SKU
- product family
- short name
- long description
- manufacturer or brand placeholder
- attributes such as size, material, standard, voltage, length, bore, seal type, thread, pressure, and connection type
- unit of sale
- pack size where relevant
- active/discontinued status
- synonyms, German terms, and abbreviation aliases
- compatible customer part numbers where useful

## Product Families To Cover

The v0 data should cover enough industrial variety for the UI to feel real without becoming huge:

- fasteners: hex bolts, socket screws, washers, nuts, threaded rods
- bearings: deep groove ball bearings, sealed bearings, bearing housings
- seals: O-rings, shaft seals, gasket material
- valves: ball valves, solenoid valves, check valves
- sensors: inductive sensors, pressure sensors, M12 connectors
- cables: M12 sensor cables, control cables, shielded cables
- motors: small gear motors, three-phase motors, replacement parts
- fittings: elbows, couplings, threaded adapters, hose fittings

## Terms And Attribute Patterns

Use attributes that actually drive matching:

- size: M8x40, 6205, DN25, G1/4, 10x2, 5 m
- material: A2 stainless, inox, steel zinc plated, FKM, NBR, brass
- standard: DIN 933, ISO 4017, ISO 4032
- electrical attributes: 24 V DC, PNP, M12, 4-pin, IP67
- mechanical attributes: bore, inner diameter, outer diameter, width, seal type, pressure rating
- unit: pcs, ea, Stk, m, kg, pack, set, roll
- condition: active, discontinued, substitute available, unknown

Preserve the original text exactly and put interpretation in normalized fields. This is a core trust rule.

## Messy Cases Required In V0

The first dataset should intentionally include:

- high-confidence exact or near-exact match
- medium-confidence ambiguous match
- low-confidence blocked match
- no catalog match
- missing unit
- unit mismatch, such as pack versus piece
- price mismatch
- duplicate line
- discontinued product with substitute
- multilingual German/English term, such as "Edelstahl", "inox", "Stk", "Kugellager"
- abbreviation or typo, such as "hex bolt m8x40 inox", "sens M12 pnp 24v", "qty 500"
- customer part number that conflicts with text
- delivery date ambiguity

## Eval Data Implications

The mock data should include labels that later backend tasks can use:

- expected extracted customer, PO/RFQ id, dates, quantities, units, prices, and line descriptions
- expected top-1 SKU where clear
- expected top-3 SKU set where ambiguous
- expected exception category
- expected ERP-readiness blocker
- expected human decision: accept, review, reject, substitute, create item, or block

V0 eval cards can be synthetic but should tie back to visible examples. Later v1.0 backend work should compute these metrics from labels rather than leaving them static.

## Data Safety Rules

- Do not copy real purchase orders, customer documents, customer names, or catalog rows.
- Use synthetic companies and synthetic SKUs.
- Use public sources only for structure, terminology, and common product attribute patterns.
- Mark demo data as grounded synthetic/sample data where users might otherwise assume it is real.
- Avoid using Comena customer names as sample customers unless they are clearly in a source discussion, not in order data.
