# Reviewer Test Plan

**Date**: July 2, 2026
**Purpose**: Define how OrderMatch Lab will be judged before it is sent.

## 60-Second First Impression Test

Goal:

- A reviewer understands that this is a Comena-specific candidate pitch plus product prototype.

Method:

1. Open the app from a cold start.
2. Spend no more than 60 seconds on the opening and first scroll.
3. Ask the reviewer or evaluator to answer:
   - Who is this for?
   - What problem is it about?
   - Why did Harsh build it?
   - What is the primary next action?

Pass criteria:

- Reviewer says Comena or Comena-like industrial order automation.
- Reviewer mentions inbox/email/PDF/RFQ to ERP or order-entry automation.
- Reviewer understands Harsh built this as candidate proof.
- Reviewer can reach the prototype in one action.

Fail signals:

- Feels like a generic portfolio.
- Feels like a generic AI SaaS landing page.
- Reviewer cannot tell what the prototype does.
- Candidate story appears before product relevance.
- Primary CTA is unclear.

## 3-Minute Busy-Reviewer Walkthrough

Goal:

- A reviewer can understand the core workflow and engineering thesis without a guided explanation.

Method:

1. Start at the opening.
2. Enter prototype.
3. Open the primary sample order.
4. Inspect original text and extracted fields.
5. Inspect line-item normalization.
6. Inspect one SKU match and its reasons.
7. Inspect one exception.
8. Inspect ERP readiness blockers.
9. Jump to evals.
10. Find candidate proof and CTA.

Pass criteria:

- Reviewer identifies at least five concepts from extraction, normalization, SKU matching, confidence, exceptions, ERP readiness, evals, traceability, onboarding repeatability, and graceful degradation.
- Reviewer can explain why one SKU match was suggested.
- Reviewer can explain why one order is or is not ERP-ready.
- Reviewer notices uncertainty is routed, not hidden.
- Reviewer understands what is sample/prototype behavior.

Fail signals:

- Reviewer sees only a polished dashboard, not the engineering problem.
- Confidence looks fake or unexplained.
- Exceptions feel decorative.
- Eval metrics feel disconnected from sample data.
- Candidate proof feels like a resume dump.

## UX State Audit

Before a screen is called done, verify:

- loading state exists
- success state exists
- error state exists
- empty state exists
- partial state exists
- user has a recovery path after error
- simulated actions are labelled where needed
- one failed section does not break the whole workflow

Sections to audit:

- opening
- what I learned
- order queue
- document/original context
- extracted fields
- line-item normalization
- SKU matching
- exception review
- ERP readiness
- eval dashboard
- onboarding/setup
- candidate proof
- final CTA

## Data Credibility Audit

Pass criteria:

- sample orders use grounded synthetic data
- original line text includes realistic messiness
- catalog has near-neighbor SKUs
- each exception maps to a visible data issue
- match reasons are specific
- eval metrics are plausible and tied to examples
- sample-data disclosure is present where needed

Fail signals:

- data is too clean
- product names feel random
- no German/English or abbreviation cases
- no unit or price ambiguity
- every match is perfect
- no blocked ERP-readiness case

## Copy Audit

Pass criteria:

- Comena appears clearly in opening and CTA
- product core uses reusable B2B order automation language
- candidate proof stays secondary
- no private Comena access is implied
- no overclaiming live backend functionality
- no banned story-bank wording
- no em dashes or en dashes
- CTA is direct and low-friction

Fail signals:

- generic AI claims
- vague enthusiasm
- resume-first flow
- unsupported metrics
- customer testimonial numbers presented as Harsh's own results
- apology language around sample data

## Visual QA Checklist

- page is not dominated by purple, beige, brown/orange, or one hue family
- tables are readable
- statuses are consistent
- confidence, exception, and readiness states are visible
- text fits in controls across desktop and mobile
- no cards inside cards
- no decorative blobs or abstract hero art
- focus states are visible
- contrast is acceptable
- mobile layout is usable enough, even if desktop-first

## Final Send-Readiness Checklist

Before sending to Comena:

- P1 user stories pass independent tests
- 60-second test passes
- 3-minute walkthrough passes
- all major states are covered
- Comena research is current
- final CTA links work or have fallback
- GitHub README is polished
- deployment smoke test passes
- no secrets or private data are exposed
- app does not imply access to Comena systems
- app is polished enough to share without apology
