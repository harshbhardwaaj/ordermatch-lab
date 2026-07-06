# Specification: OrderMatch Lab

**Status**: Clarified for Step 4 planning  
**Date**: July 2, 2026 (Functional Requirements, Success Criteria, and Edge Cases extended July 6, 2026, see `docs/spec-kit/clarifications.md` §7)

## Purpose

OrderMatch Lab is a polished web experience that pitches Harsh to Comena by combining a researched candidate story with an interactive AI order-operations prototype.

The app must show that Harsh studied Comena's product direction, understood the hard engineering problems behind B2B order automation, and built a relevant prototype before asking for a chance.

The product should not feel like a generic portfolio, generic AI demo, or decorative SaaS concept. It should make the engineering thesis visible: reliable AI order automation depends on extraction, normalization, SKU matching, confidence, validation, review loops, traceability, onboarding repeatability, graceful degradation, and evaluation.

## User Stories

### User Story 1 - Understand Why This Exists (Priority: P1 MVP)

A Comena reviewer opens the link and immediately understands that Harsh built this specifically after studying Comena's order automation problem. The opening experience should create enough curiosity and trust for the reviewer to continue into the prototype.

**Why P1**: If the first impression feels generic, the rest of the app loses force. The opening must establish relevance, initiative, and the candidate story.

**Independent Test**: A reviewer can spend 30-60 seconds on the opening section and explain: "This is a candidate pitch built around Comena's order-processing workflow."

**Acceptance Scenarios**:

1. Given a reviewer opens the site, When they see the first screen, Then they understand the project was built for Comena and is not a generic portfolio.
2. Given the reviewer has limited time, When they scan the intro, Then they can choose a clear next action to view the product prototype.
3. Given the reviewer wants evidence, When they continue, Then the app transitions from candidate story into a concrete order-operations workflow.
4. Given the reviewer is skeptical of self-promotion, When they read the opening, Then the message feels grounded in research and product work rather than inflated claims.

---

### User Story 2 - See The Core Order Workflow (Priority: P1 MVP)

A reviewer can walk through a realistic AI order-operations workflow: incoming order or RFQ, extracted fields, normalized line items, SKU match suggestions, exceptions, confidence, and ERP-readiness state.

**Why P1**: The product prototype is the main proof that Harsh understands Comena's real problem. It turns the candidate pitch into evidence.

**Independent Test**: A reviewer can complete the core walkthrough using realistic mocked data and understand the operational flow without needing a live backend.

**Acceptance Scenarios**:

1. Given an incoming purchase order or RFQ, When the reviewer opens it, Then they see the original order context and extracted structured fields.
2. Given extracted line items, When the reviewer inspects them, Then they see original text preserved beside normalized product details.
3. Given suggested SKU matches, When the reviewer opens match details, Then they see confidence, matching reasons, and alternate candidates.
4. Given ambiguous or low-confidence line items, When the reviewer reaches exception review, Then the app clearly shows what needs human attention.
5. Given all blocking issues are resolved or simulated as resolved, When the reviewer reaches the final state, Then the order appears ERP-ready or approval-ready.

---

### User Story 3 - See The Engineering Thesis (Priority: P1 MVP)

A reviewer can see that this is not just a nice interface or LLM wrapper. The app must expose the actual engineering problems behind B2B order automation: extraction, line-item normalization, SKU matching, confidence scoring, exception routing, ERP validation, traceability, onboarding repeatability, graceful degradation, and evals.

**Why P1**: This is the strongest hiring signal. It shows that Harsh understands the production problems behind the product, not just the visible UI.

**Independent Test**: A reviewer can identify at least five real engineering problems the prototype represents or explains.

**Acceptance Scenarios**:

1. Given messy line-item text, When the reviewer inspects the prototype, Then they see original customer wording, normalized attributes, and possible ambiguity.
2. Given multiple plausible SKU matches, When the reviewer checks match details, Then they see confidence and reasons instead of fake certainty.
3. Given a risky order state, When the reviewer checks ERP readiness, Then the app shows what blocks safe approval.
4. Given the eval section, When the reviewer scans metrics, Then they understand how automation quality would be measured before trusting the system.
5. Given a section fails or has no data, When the reviewer continues, Then the app remains usable and communicates the partial state clearly.

---

### User Story 4 - Understand The Product's Trust Model (Priority: P1 MVP)

A reviewer can understand how the product decides what can be suggested, what needs review, what is blocked, and what is safe to mark ERP-ready.

**Why P1**: Trust is central to operational AI. A wrong SKU, unit, quantity, or customer field can create business problems. The prototype must show that uncertainty is designed into the workflow.

**Independent Test**: A reviewer can explain how the app treats high-confidence matches, medium-confidence review items, low-confidence blocked items, and no-match cases.

**Acceptance Scenarios**:

1. Given a high-confidence match, When the reviewer sees the line item, Then it appears safe but still inspectable.
2. Given a medium-confidence match, When the reviewer sees the line item, Then the app recommends human review.
3. Given a low-confidence or no-match item, When the reviewer sees the line item, Then the app blocks ERP readiness until it is resolved.
4. Given a suggested match, When the reviewer asks why, Then the app shows traceable reasons such as size, material, unit, standard, customer part number, or catalog attributes.
5. Given an order-level readiness status, When the reviewer inspects it, Then they can see which fields or line items are preventing approval.

---

### User Story 5 - Experience A Guided But Non-Linear Journey (Priority: P2)

A reviewer can follow the intended story step by step, but can also jump directly to the prototype, engineering thesis, evals, candidate background, or CTA if they are short on time.

**Why P2**: Founders, engineers, and hiring reviewers browse differently. The app should guide without trapping the user in a slide deck.

**Independent Test**: A reviewer can either complete the guided journey or reach the product prototype within one clear action from the opening screen.

**Acceptance Scenarios**:

1. Given a reviewer wants guidance, When they click through the story, Then each step naturally leads to the next.
2. Given a reviewer wants speed, When they use navigation or a primary CTA, Then they can jump directly to the product prototype.
3. Given a reviewer returns after browsing, When they navigate back, Then the app state remains understandable.
4. Given a reviewer skips candidate context, When they inspect the prototype, Then they can still understand why the project exists.

---

### User Story 6 - See Relevant Candidate Evidence (Priority: P2)

A reviewer can view a curated version of Harsh's relevant background, projects, and technical strengths, mapped to what Comena likely needs.

**Why P2**: The prototype proves initiative, but the reviewer still needs to understand the candidate behind it. This should feel like evidence selection, not a full resume dump. Candidate content should be sourced from `docs/story-bank-harsh.md`, but it must stay secondary to the product and engineering thesis.

**Independent Test**: A reviewer can see relevant work and connect each highlighted item to product engineering, AI/data systems, workflow thinking, deployment, reliability, or UX judgment.

**Acceptance Scenarios**:

1. Given the reviewer reaches the candidate section, When they scan Harsh's experience, Then they see only relevant projects and capabilities.
2. Given a listed project, When the reviewer reads it, Then it connects to a Comena-relevant capability.
3. Given the reviewer wants more detail, When they interact with a project card or link, Then they can access supporting context without derailing the main story.
4. Given the reviewer is evaluating fit, When they read the candidate section, Then they understand why this project is a signal of how Harsh would work as an intern.
5. Given the candidate section pulls from Harsh's story bank, When content is selected, Then it favors proof of relevant building, AI/data evaluation, workflow automation, deployment, and product judgment over broad personal background.

---

### User Story 7 - Leave With A Clear Next Step (Priority: P3)

A reviewer reaches the end and sees a clear, confident call to action to book a quick call with Harsh or inspect supporting links.

**Why P3**: The app needs to convert interest into action, but only after the story and prototype have built credibility.

**Independent Test**: A reviewer can find the final CTA and understand exactly what Harsh wants: a short call or interview conversation for the internship.

**Acceptance Scenarios**:

1. Given the reviewer finishes the experience, When they reach the final section, Then they see a concise invitation to book a quick call.
2. Given the reviewer wants to follow up, When they click the CTA, Then they can access a calendar booking link or direct contact option.
3. Given the reviewer wants supporting evidence, When they reach the CTA area, Then they can access GitHub, LinkedIn, relevant project links, social links where appropriate, and resume.
4. Given the reviewer is not ready to contact, When they leave the app, Then the project still leaves a memorable candidate/product impression.

## Functional Requirements

- **FR-001**: The app MUST open with a Comena-specific narrative introduction that explains why the project exists.
- **FR-002**: The app MUST make clear that the project is a candidate pitch plus product prototype, not a standalone SaaS company.
- **FR-003**: The app MUST include a guided path from candidate story to product prototype.
- **FR-004**: The app MUST allow direct navigation to key sections for reviewers with limited time.
- **FR-005**: The app MUST include a realistic order-operations prototype using mocked or synthetic data.
- **FR-006**: The prototype MUST show an incoming order or RFQ queue.
- **FR-007**: The prototype MUST show an order review view with original order context and extracted structured fields.
- **FR-008**: The prototype MUST preserve original line-item text alongside normalized product interpretation.
- **FR-009**: The prototype MUST show line-item SKU match suggestions with confidence and reasoning.
- **FR-010**: The prototype MUST show alternate SKU match candidates where ambiguity exists.
- **FR-011**: The prototype MUST show exception handling for ambiguous, missing, or low-confidence matches.
- **FR-012**: The prototype MUST show order-level ERP readiness or approval readiness.
- **FR-013**: The prototype MUST show which blocking issues prevent an order from becoming ERP-ready.
- **FR-014**: The app MUST include an eval or quality section showing how extraction and matching quality would be measured.
- **FR-015**: The eval section MUST include metrics that communicate production AI reliability, such as extraction accuracy, SKU top-1 accuracy, SKU top-3 recall, human correction rate, auto-approval rate, false confident matches, exception categories, or estimated time saved.
- **FR-016**: The app MUST include selected candidate background and projects relevant to Comena.
- **FR-017**: Candidate evidence MUST be curated from `docs/story-bank-harsh.md` and tied to Comena-relevant capabilities rather than presented as a generic CV.
- **FR-018**: The app MUST include a final hiring-oriented CTA.
- **FR-019**: The app MUST support both guided reading and direct navigation to key sections.
- **FR-020**: The app MUST use realistic industrial order/catalog data, even if synthetic.
- **FR-021**: Mock data MUST include messy industrial order cases such as abbreviations, missing units, ambiguous SKUs, multilingual terms, discontinued products, duplicate lines, or price/unit mismatches.
- **FR-022**: The app MUST avoid private, scraped, or copyrighted customer data.
- **FR-023**: Each major screen or section MUST define loading, success, error, empty, and partial states.
- **FR-024**: The app MUST visibly represent AI uncertainty rather than hiding it.
- **FR-025**: The app MUST show traceability for important AI suggestions, especially SKU matches.
- **FR-026**: The app MUST be polished enough to deploy and share as a public link.
- **FR-027**: The first shareable version MUST not require login.
- **FR-028**: The app MUST not expose secrets, API keys, raw backend errors, or private implementation details.
- **FR-029**: The app MUST make clear when an interaction is simulated or prototype-level if a user could otherwise mistake it for production automation.
- **FR-030**: The app MUST not imply access to Comena private systems, internal customers, or proprietary data.
- **FR-031**: Candidate content MUST stay secondary to the product and engineering thesis. The app should sell Harsh through relevant proof, not by turning into a full personal biography.
- **FR-032**: The final CTA MUST invite the reviewer to book a quick call or start a short conversation about the internship.
- **FR-033**: The CTA area MUST include or make room for a calendar booking link, GitHub, LinkedIn, relevant project links, social links where appropriate, resume, and direct contact.
- **FR-034**: The app MUST use Comena explicitly in the opening and final CTA, while keeping the core product prototype language reusable enough to adapt for other companies later.
- **FR-035**: The first version MAY use frontend-only mocked data, but future real functionality MUST be designed around a clear backend/API boundary.
- **FR-036**: The app MUST NOT assume that long-running AI/data work belongs only inside Vercel-hosted frontend logic.
- **FR-037**: Future real functionality MUST be able to support backend work such as document parsing, SKU matching, eval runs, file processing, persistence, and background jobs.
- **FR-038**: Demo data MUST follow a grounded synthetic data policy: public procurement sources guide structure and terminology, market/company research guides customer profiles, and generated industrial order/catalog data provides safe controllable examples.
- **FR-039**: The app MUST be honest that demo data is synthetic or sample data where relevant, without weakening the product story.
- **FR-040**: Real order extraction MUST be performed server-side via the OpenAI API, called only from backend endpoints, never directly from the browser.
- **FR-041**: SKU matching MUST use a hybrid approach: deterministic attribute/unit/part-number normalization rules first, combined with OpenAI-assisted semantic matching against the catalog for remaining ambiguity.
- **FR-042**: Confidence MUST be computed server-side as a real per-line score derived from the matching pipeline. The raw score and any multi-band classification MUST remain backend-internal and MUST NOT be exposed to the frontend as new UI (no numeric badge, no confidence-band grid). The frontend MUST continue to express outcomes only through the existing two-signal model (clean match / risk flag).
- **FR-043**: Setup/onboarding configuration (auto-approve threshold, price-flag threshold, rule toggles) MUST persist in Postgres and MUST be read at match time to gate real order routing, replacing the simulated setup flow's disconnection from the live workflow.
- **FR-044**: Eval metrics MUST be computed for real by running the extraction/matching pipeline against the existing grounded, labeled sample dataset (`docs/data-research/`), not hardcoded.
- **FR-045**: The backend MUST define real error/recovery behavior for LLM provider timeout, rate limiting, and malformed responses, and for backend service/database unavailability. The frontend MUST surface these as specific, actionable states rather than silent failure or a generic error.

## Success Criteria

- **SC-001**: Within 60 seconds, a reviewer can explain that the app was built specifically as a Comena-relevant candidate pitch.
- **SC-002**: Within 3 minutes, a reviewer can complete or understand the core product walkthrough.
- **SC-003**: The prototype shows at least 6 realistic order automation concepts: extraction, line-item normalization, SKU matching, confidence, exceptions, ERP readiness, and evals.
- **SC-004**: The app includes at least 5 realistic failure or uncertainty cases, such as ambiguous SKU, missing unit, low-confidence match, no catalog match, price mismatch, duplicate line, or blocked ERP readiness.
- **SC-005**: A reviewer can identify at least 5 engineering problems represented by the prototype.
- **SC-006**: The candidate section includes only relevant work and maps each highlighted item to a Comena-relevant capability.
- **SC-007**: The first deployable version is polished enough to share without explaining that it is "still rough."
- **SC-008**: A reviewer can reach the product prototype from the first screen in one clear action.
- **SC-009**: A reviewer can understand what blocks ERP readiness for at least one order.
- **SC-010**: A reviewer can understand why at least one SKU match was suggested.
- **SC-011**: The app has a clear final CTA with contact or follow-up options.
- **SC-012**: The backend computes real eval metrics (extraction accuracy, SKU top-1/top-3 accuracy, human correction rate) from the grounded sample dataset, rather than displaying hardcoded numbers.
- **SC-013**: Changing a setup-config threshold (auto-approve threshold, price-flag threshold) in the onboarding/setup flow measurably changes match routing outcomes in the live order review flow.

## Assumptions

- Comena reviewers are busy and may only give the app 2-5 minutes on first pass.
- The first version can use realistic mocked data instead of a real backend.
- A polished frontend can create enough trust to earn attention before deeper functionality is added.
- Comena will value domain understanding, product judgment, eval thinking, implementation initiative, and clarity around AI uncertainty.
- The app will be desktop-first because order review, tables, documents, and ERP-style workflows are work-machine tasks.
- The product should be Comena-specific in framing but reusable for similar companies later.
- Public B2B order data may be limited, so synthetic data grounded in public examples is acceptable.
- The project will use grounded synthetic data rather than pure invented data or private real customer data.
- Public procurement sources such as OCDS/TED can guide structure, fields, terminology, item descriptions, quantities, units, classifications, and edge cases.
- Orbis and TUM-accessible research can guide realistic customer/company profiles, industries, geographies, and market context.
- The actual shareable demo data should remain synthetic so it is safe, controllable, and easy to shape around the intended product story.
- Deep dataset sourcing, data generation, and eval dataset design belong primarily to the later backend/functionality phase, not the first frontend/story pass.
- Harsh will provide or approve the relevant CV/project items before they are included.
- Candidate content will be selected from `docs/story-bank-harsh.md`, but only the Comena-relevant pieces should appear in the app.
- The first version should be honest about mocked/simulated behavior while still feeling polished and useful.
- The app should not present itself as a competitor to Comena; it should present itself as evidence of candidate fit.
- The core prototype should use more general product language than the opening and ending sections so the project can later be adapted for adjacent companies.
- Vercel is suitable for the initial deployed frontend and lightweight interactions, but heavier AI/data workflows may require a separate backend, database, file storage, and background processing later.

## Edge Cases

- What happens if the reviewer skips the story and jumps straight to the product?
- What happens if the reviewer only scans the first screen?
- What happens if mocked product data feels fake, too clean, or too generic?
- What happens if grounded synthetic data introduces bias or unrealistic edge-case coverage?
- What happens if public procurement data does not map cleanly to private B2B SKU matching workflows?
- What happens if the prototype looks like a generic SaaS dashboard rather than a Comena-specific product?
- What happens if the candidate section feels like a resume dump?
- What happens if a user clicks an action that is simulated rather than real?
- What happens if a user expects upload or AI extraction to be live in the first version?
- What happens if an eval chart, order preview, or product section fails to load?
- What happens if the app is opened on mobile even though the experience is desktop-first?
- What happens if a Comena reviewer interprets this as trying to compete with them rather than trying to get hired?
- What happens if the app overpromises functionality that is only mocked in v1?
- What happens if AI confidence appears too precise or fake?
- What happens if the product story talks too much about Harsh and not enough about Comena's problem?
- What happens if the product story talks too much about Comena and not enough about why Harsh should be hired?
- What happens if later functionality changes the product flow and conflicts with the constitution?
- What happens if the candidate section pulls in too much background from the story bank and distracts from the product?
- What happens if the final CTA feels too aggressive, too vague, or makes scheduling a call feel like too much effort?
- What happens if future backend functionality is harder than expected because early frontend assumptions were not designed around an API boundary?
- What happens if the OpenAI API times out, rate-limits, or returns a malformed response during extraction or matching?
- What happens if Render's backend service or database is temporarily unavailable?
- What happens if a reviewer changes a setup threshold while an order is already mid-review?
