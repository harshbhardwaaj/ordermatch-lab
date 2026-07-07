# Implementation Plan: OrderMatch Lab

**Spec**: `docs/spec-kit/specification.md`
**Clarifications**: `docs/spec-kit/clarifications.md`
**Date**: July 2, 2026 (Backend Architecture section revised July 6, 2026, see `docs/spec-kit/clarifications.md` §7)

## Summary

Build OrderMatch Lab as a full-stack web product that combines a direct candidate story with a polished interactive AI order-operations workflow. The build sequence is frontend-first, but the final v1.0 target is not frontend-only. v1.0 should be a finished deployed product with a polished frontend, backend/API layer, realistic data handling, and enough real functionality to support the core extraction, matching, evaluation, and ERP-readiness story.

The plan intentionally starts with the visible product surface because the story, workflow, UX, data model, trust model, and review loop must be clear before backend work hardens around them. Later milestones replace mocked flows with real services behind the same interface. Frontend-first means sequence, not final scope.

## Technical / Methodological Context

**Stack / Approach**: Next.js with TypeScript for the frontend, Tailwind CSS for styling, shadcn/ui for accessible base components, lucide-react for icons, and Vercel for frontend deployment. The backend target is Python/Django with Postgres, hosted on Render, with the OpenAI API called server-side for order extraction and matching-assist, aligning with Comena's public stack of Python/Django, TypeScript, Postgres, and LLMs.

**Primary dependencies**:

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- lucide-react
- local JSON/TypeScript mock data for v0
- Python/Django backend for v0.6+ real functionality
- Postgres for persisted orders, catalogs, eval runs, and customer/configuration data, managed via Render
- Render for backend web service and Postgres hosting
- OpenAI API for order extraction and matching-assist, called only from backend endpoints, never directly from the browser
- file upload/storage path for purchase orders, RFQs, PDFs, spreadsheets, and pasted text
- background job mechanism if parsing, matching, or evals become long-running
- optional later charting library for eval dashboards
- optional later animation library only if CSS/Tailwind transitions are not enough

**Storage / Output**:

- Planning artifacts stay in `docs/spec-kit/`.
- Product/story context stays in `docs/`.
- Design system artifacts should be created before code in `docs/design-system/`.
- Frontend source will live in the app scaffold once Step 5 tasks are confirmed.
- Backend source should be added in a separate backend app/folder once the v0.6 backend milestone begins.
- Mock data should live in a clearly named local data folder after scaffolding.

**Target audience / platform**:

- Primary audience: Comena founders, engineers, and hiring decision-makers.
- Primary platform: desktop web, because the workflow involves tables, documents, line items, review states, and ERP-style screens.
- Secondary platform: mobile-friendly enough to avoid broken layout, but not optimized as the main workflow surface.

**Performance / quality goals**:

- First meaningful view should load quickly enough for a busy reviewer.
- Core product prototype should be reachable from the first screen in one clear action.
- UI must look polished enough to share without apology.
- Every major section should define loading, empty, success, error, and partial states.
- Interactions that are mocked or simulated should feel intentional and should not overclaim production readiness.

**Constraints**:

- No private customer data.
- No raw secrets or API keys in frontend code.
- No backend overbuild before the product surface is strong.
- No v1.0 release without backend-backed core functionality.
- No generic portfolio dump.
- No AI-slop visual style.
- No Codex/OpenAI/AI co-author commit trailers.
- No implementation before tasks are confirmed.

## Constitution Check

- [OK] Candidate Story Drives The Product: The first screen, final CTA, and candidate proof points remain tied to Comena relevance and product work.
- [OK] Product Proof Over Claims: The main proof is the prototype workflow, not self-description.
- [OK] Trust Before Flash: The design direction is restrained, operational, readable, and modern.
- [OK] UX Must Cover Reality: Loading, success, error, empty, and partial states are planned as first-class UI requirements.
- [OK] Frontend First, Functionality Layered In: v0.x starts with a polished frontend and grounded synthetic data; v1.0 is a finished full-stack product.
- [OK] Comena-Specific, Later Adaptable: Comena is explicit in the opening and CTA, while the core product language remains reusable.
- [OK] Engineering Thesis Must Stay Visible: The product flow centers extraction, normalization, SKU matching, confidence, exceptions, ERP readiness, evals, traceability, onboarding repeatability, and graceful degradation.

## v1 Quality Bar

v1.0 is not a client MVP, trial build, or rough first release. v1.0 is the version that gets sent to a Comena founder, engineer, or hiring decision-maker who may only look at it once for a few minutes.

The v1.0 standard is:

> The reviewer should understand the project quickly, feel that it was built with unusual care, see the engineering depth, and feel that taking a call with Harsh is the obvious next step.

v1.0 must feel finished. It should not require an apology, explanation, or "this is still rough" framing. It must be refined enough to create a strong first-pass impression.

v1.0 must deliver:

- a sharp Comena-specific opening that earns attention immediately
- a polished, modern, non-generic UI
- a guided path that works for a busy reviewer
- a product prototype that makes the engineering thesis visible without long reading
- backend-backed functionality where it supports credibility
- realistic grounded synthetic data that does not feel fake or overly clean
- visible confidence, exceptions, review states, ERP readiness, evals, and traceability
- strong UX states: loading, success, error, empty, and partial
- polished copy and microcopy
- responsive handling good enough that the app never feels broken
- reliable deployment
- a direct CTA that makes a quick call feel low-friction and worthwhile

v1.0 does not need to solve every possible real-world document parsing or SKU-matching case. It does need to avoid feeling flimsy, shallow, fake, or purely aesthetic. The bar is not "feature complete for a paying customer"; the bar is "impressive enough that a serious reviewer wants to speak with Harsh."

## Architecture / Structure

### Experience Architecture

The app should be a guided but non-linear web experience:

1. **Opening / Why I Built This**
   - Direct Comena-specific candidate framing.
   - Primary CTA to enter the product prototype.
   - Secondary navigation to relevant proof, evals, or final CTA.

2. **What I Learned**
   - Concise research-backed understanding of the workflow: inbox/email/PDF/RFQ to extraction to SKU matching to review to ERP readiness.
   - No long essay. The app should move quickly into product proof.

3. **Interactive Product Prototype**
   - Order/RFQ queue.
   - Order review with original context beside extracted fields.
   - Line-item normalization.
   - SKU match suggestions with confidence and reasons.
   - Exception review.
   - ERP-readiness state.

4. **Engineering Thesis / Quality**
   - Evals and failure modes.
   - Confidence thresholds.
   - Human correction rate.
   - False confident match risk.
   - Traceability and graceful degradation.

5. **Relevant Candidate Evidence**
   - Curated proof, selected for relevance to Comena.
   - Emphasize ALEVOR AI classification, AI Investment Analyst, CV-JD Fit Scorer, and selected TUM coursework.
   - Keep this section secondary to the product.

6. **Final CTA**
   - Direct invitation to a quick call.
   - Calendar link placeholder until a tool is chosen.
   - GitHub, LinkedIn, relevant projects, resume, and direct contact.

### Frontend Architecture

After Step 5 confirms tasks, the frontend should be scaffolded with a structure similar to:

```text
app/
  page.tsx
  layout.tsx
  globals.css
components/
  narrative/
  product/
  candidate/
  ui/
data/
  orders.ts
  catalog.ts
  evals.ts
  candidate.ts
lib/
  formatters.ts
  confidence.ts
  mock-workflow.ts
types/
  order.ts
  catalog.ts
  eval.ts
docs/
  design-system/
  spec-kit/
```

This structure keeps the story, product UI, data, helper logic, and types separate enough to support later functionality.

### Backend Architecture

v0.1-v0.5 should not require a backend. These milestones should use local mock data and client-side interactions to prove the story, workflow, UI, and data model.

v0.6+ should introduce a real backend/API layer. The architecture should make replacement of mocked flows natural:

- Product data should be shaped like API responses.
- Mock workflow helpers should behave like service calls where useful.
- Long-running actions should be represented as state machines or steps, not hardcoded visual tricks.
- File upload, document parsing, SKU matching, eval runs, persistence, and background jobs should be treated as future backend-owned concerns.

Backend target:

- Python/Django backend to align with Comena's public stack.
- Postgres for persisted orders, catalogs, eval runs, and customer/setup configuration.
- Hosted on Render (backend web service + managed Postgres), not Railway. See `docs/spec-kit/clarifications.md` §7 for why.
- OpenAI API called server-side for extraction and matching-assist, never called directly from the browser. See `docs/spec-kit/clarifications.md` §8 for why OpenAI over the originally-decided Claude API.
- Background workers for document processing, matching, and eval runs if needed.
- Next.js/Vercel remains the frontend deployment surface.

Core backend responsibilities for v1.0, mapped directly onto what `/thesis` already narrates rather than a new invented approach:

- Accept order inputs through upload or sample/demo import flows.
- Store orders, extracted fields, line items, catalog entries, match candidates, setup configuration, review decisions, and eval runs.
- **Extraction**: call the OpenAI API to turn pasted/uploaded order text into structured line items, replacing the client-side timer simulation with real structured output.
- **Matching**: implement the hybrid approach already described on the `/thesis` confidence slide: deterministic attribute/unit/part-number normalization rules first, then OpenAI-assisted semantic matching against the catalog for remaining ambiguity.
- **Confidence**: compute a real per-line score from the matching pipeline. Compare it against persisted setup-config thresholds (auto-approve threshold, price-flag threshold) to decide routing. The raw score and any multi-band classification stay backend-internal; the frontend continues to express outcomes only through the existing two-signal model (clean match / risk flag) already used by the resolve-or-defer picker. Do not reintroduce a 4-band confidence badge UI (`lib/confidence.ts` was already deleted as dead code in Phase 6).
- **Setup configuration**: persist auto-approve threshold, price-flag threshold, and rule toggles in Postgres, and read them at match time so they actually gate live order routing, replacing `/prototype/setup`'s disconnected simulated click-through.
- **Evals**: compute real metrics by running the pipeline against the existing grounded, labeled sample dataset in `docs/data-research/`, rather than the hardcoded figures in `frontend/data/evals.ts`.
- Persist human review decisions such as accepted match, rejected match, corrected SKU, resolved exception, and ERP-ready status.
- Expose eval metrics through API endpoints so real numbers exist even if the frontend keeps them out of a numeric dashboard, consistent with the Phase 6 decision not to build one.
- Keep secrets, LLM API keys, and provider calls out of browser code.
- Define real error/recovery behavior for LLM provider timeout, rate limiting, malformed responses, and Render service/database unavailability. This is now a real requirement, not a hypothetical one: Phase 13's original plan deferred graceful degradation specifically because "there is no backend yet for these failures to be real." That reasoning no longer holds once extraction/matching call a real external API.

Possible backend layout after v0.6:

```text
backend/
  manage.py
  ordermatch/
  orders/
  catalogs/
  matching/
  evals/
  uploads/
  requirements.txt
frontend/
  app/
  components/
  data/
  lib/
  types/
```

The exact folder structure can change during Step 5 tasks, but the boundary should remain: frontend displays and orchestrates; backend owns persistence, parsing, matching, evals, and secrets.

## Data Strategy

Use grounded synthetic data.

v0 should use a small handcrafted dataset with enough edge cases to make the UI real:

- 3-5 purchase orders or RFQs.
- 30-80 catalog items.
- 8-15 visible line items across the demo flow.
- high-confidence match cases.
- medium-confidence review cases.
- low-confidence blocked cases.
- no-match cases.
- missing units.
- duplicate line items.
- price or unit mismatch.
- German/English terminology variants.
- traceable reasons for SKU suggestions.
- eval metrics that match the visible workflow.

Grounding sources:

- OCDS/TED for procurement structure, item fields, quantities, units, classifications, and terminology.
- Orbis/TUM-accessible research for plausible customer profiles, company sizes, industries, and regions.
- Public industrial catalog examples for product naming patterns.

Deep dataset sourcing and eval dataset generation should happen later, when real backend/eval work begins. This later work is required before v1.0, even though it is not required for the earliest frontend prototypes.

### Focused Data Research Pass

Before creating the first mock dataset, do a short grounding pass. This is not a long academic research phase. It is a practical check to make the sample orders, RFQs, catalog rows, units, and exceptions feel believable.

The research pass should answer:

- What fields commonly appear on purchase orders and RFQs?
- How are line items usually described?
- What units, quantities, prices, delivery fields, and item numbers appear?
- What industrial product names and attributes are common for fasteners, bearings, seals, valves, sensors, cables, motors, and fittings?
- What public procurement schemas or examples can inform structure?
- What edge cases should be represented in the first demo data?

Useful sources:

- OCDS item and tender structures
- TED/public procurement examples
- public purchase order and RFQ templates
- public industrial catalog examples
- Orbis/TUM-accessible company research for plausible customer profiles

The output should be a compact note or data brief, not a giant research report. Its job is to guide grounded synthetic data creation.

## Design System Workflow

Before scaffolding the app, create `docs/design-system/` artifacts:

- `docs/design-system/visual-direction.md`
- `docs/design-system/component-rules.md`
- `docs/design-system/screen-map.md`
- optionally `docs/design-system/copy-principles.md`

Design direction:

- modern operational SaaS
- minimal but not empty
- confident, direct, and serious
- data-dense where useful
- restrained color palette
- excellent table/review UI
- clear confidence and status badges
- no generic AI gradient aesthetic

Use the installed UI/UX skills or design-system tooling to assist, but the constitution and UX playbook remain higher priority than any generated style recommendation.

## Research Needed

- [BLOCKING BEFORE FINAL CTA] Choose a calendar booking tool or decide on direct email first.
- [BLOCKING BEFORE CANDIDATE SECTION FINAL COPY] Select exact candidate links: GitHub, LinkedIn, resume, AI Investment Analyst, CV-JD Fit Scorer, and any social links.
- [BLOCKING BEFORE MOCK DATA] Do a focused public procurement/product example research pass to ground the mock data vocabulary.
- [NON-BLOCKING BEFORE V0] Review Comena's public pages again before final copy so the opening and ending feel current.
- [LATER BACKEND PHASE] Investigate deeper data sources through TUM OPAC, Orbis, TED bulk data, OCDS registry, and public catalog examples.
- [BLOCKING BEFORE v1.0] Decide whether Django REST Framework, Django Ninja, or another Django API pattern fits best.
- [BLOCKING BEFORE v1.0] Decide how to run background jobs for parsing, matching, and evals if they exceed normal request time.
- [RESOLVED July 6, 2026] Backend hosting and database provider: Render (web service + managed Postgres). The original default was Railway (matches the AI Investment Analyst deploy), but that account's trial credit is nearly exhausted and its Limited Trial gates outbound network access behind GitHub re-verification or a payment method. Render needs no card for its free Postgres + web service tier. See `docs/spec-kit/clarifications.md` §7.
- [RESOLVED July 6, 2026, SUPERSEDED July 6, 2026] LLM provider for extraction and matching-assist: originally Claude API (Anthropic) per `docs/spec-kit/clarifications.md` §7, switched to OpenAI API (`gpt-5.4-mini`) for cost-efficient iteration during development; called only from backend endpoints either way. See `docs/spec-kit/clarifications.md` §8.
- [BLOCKING BEFORE v1.0] Decide how uploaded files are stored or whether v1.0 uses pasted/sample content only.
- [OPEN, DEFERRED TO PHASE 13] Decide whether real eval numbers get any new frontend display, or stay backend-only/documented, consistent with the Phase 6 decision not to build a numeric eval dashboard.
- [HARSH INPUT BEFORE FINAL CTA] Provide or choose calendar booking tool/link.
- [HARSH INPUT BEFORE CANDIDATE SECTION FINAL COPY] Provide final preferred GitHub, LinkedIn, resume, project links, and any social links worth including.

## Decisions & Rationale

| Decision | Why | Alternative Rejected |
|---|---|---|
| Build frontend-first, not frontend-only | The early deliverable must earn attention quickly, and the frontend makes story, workflow, trust, uncertainty, and review loops visible. v1.0 still requires backend-backed core functionality. | Building backend first would delay the pitch and risk proving infrastructure before product judgment. Stopping at frontend-only would undercut the engineering thesis. |
| Use Next.js + TypeScript | Fits polished web storytelling and dashboard UI, deploys easily to Vercel, and aligns with Comena's TypeScript frontend expectation. | Plain React/Vite is simpler but less natural for deployed app structure and future route-level growth. |
| Use Tailwind + shadcn/ui | Fast path to a clean, modern, accessible SaaS UI while preserving customization and restraint. | Fully custom CSS would slow v0; heavy UI kits could make the app look generic. |
| Use lucide-react icons | Familiar, clean icon set for operational UI controls and status indicators. | Custom SVGs add unnecessary work and inconsistency. |
| Deploy frontend on Vercel | Fastest path to a polished public link. Harsh already has relevant Vercel experience. | Self-hosting or heavier deployment would slow down v0. |
| Defer real backend until v0.6 | v0.1-v0.5 should prove workflow and product thinking first. Backend becomes mandatory for v1.0 once real extraction, matching, evals, uploads, or persistence are needed. | Forcing backend into the first prototype risks spending time on infrastructure before the product story is clear. Shipping v1.0 without backend would be too shallow. |
| Plan future backend around Python/Django/Postgres | Comena publicly uses Python/Django, TypeScript, Postgres, and LLMs. Aligning later backend work with that stack is a hiring signal. | FastAPI may fit Harsh's previous project, but Django better mirrors Comena's public stack. |
| Use grounded synthetic data | Real B2B PO/SKU data is hard to access and private data is unsafe. Grounding reduces fake-data bias while keeping examples controllable. | Pure synthetic data could be too clean; pure public procurement data may not map to SKU matching. |
| Keep Comena in opening/end and reusable product language in core prototype | Makes the first version feel built for Comena while preserving later adaptability. | Naming Comena everywhere could make repurposing harder; staying generic everywhere would weaken the pitch. |
| Candidate proof stays secondary | The product should sell Harsh through evidence. Candidate content should support, not dominate, the experience. | A full resume-style section would dilute the product and feel less tailored. |
| Host the real backend on Render, not Railway | Render's free Postgres + web service tier needs no card and has no equivalent network-restriction gate. The Railway account already used for the AI Investment Analyst deploy is down to its last trial credit and would put both projects' uptime at risk. | Railway was the original default per this plan's earlier stack alignment, but its trial state (GitHub-verification-gated network access, minimal credit remaining) made it impractical without either verifying an account of uncertain standing or adding billing. |
| Use the OpenAI API for real extraction and matching-assist (originally planned as Claude API, see §8) | Real structured output from messy order text is exactly the extraction problem the engineering thesis already describes; computing this server-side keeps keys out of the browser and makes confidence a real model signal instead of a hardcoded timer. OpenAI was chosen for cost-efficient iteration during development, and the thesis narrative only ever says "a language model," never naming a provider, so nothing user-facing needed to change. | Building a custom extraction/parsing model from scratch would be far more work for no accuracy benefit at this catalog scale, and would abandon the hybrid matching approach already narrated on the `/thesis` confidence slide. |
| Compute confidence as a real backend score, but expose only the existing two-signal frontend model | Preserves the review UI already built and tested in Phase 5/6 while making the underlying score genuinely real and threshold-driven. Avoids reintroducing the 4-band badge UI already deleted as dead code. | A visible numeric or 4-band confidence UI was considered and rejected: it would be new frontend surface area with no clear reviewer benefit over the existing resolve-or-defer picker, and would contradict the earlier decision that killed `lib/confidence.ts`. |
| Persist setup-config thresholds in Postgres and use them to gate real routing | Turns `/prototype/setup` from a disconnected simulated click-through into something that actually drives the live order review, closing the gap noted when the eval dashboard was killed in Phase 6. | Keeping setup as a pure demo would leave two disconnected simulations instead of one coherent, backend-real product. |

## Version Strategy

- **v0.1**: Planning artifacts and design system.
- **v0.2**: Frontend scaffold, layout system, mock data types.
- **v0.3**: Narrative shell and static product screens.
- **v0.4**: Clickable prototype with simulated state changes.
- **v0.5**: UX states, polish, responsiveness, copy pass.
- **v0.6**: Backend scaffold with Python/Django, initial API boundary, and Postgres data model, deployed on Render.
- **v0.7**: Backend-backed orders, catalog, setup configuration, review decisions, and persisted workflow state.
- **v0.8**: Real extraction, hybrid matching, backend-computed confidence, and eval services implemented via the OpenAI API, enough to support the core demo.
- **v0.9**: Deployed full-stack beta with frontend on Vercel, backend and database on Render, realistic data, and end-to-end review flow.
- **v1.0**: Finished deployed full-stack product with polished story, frontend, backend/API layer, grounded data, core extraction/matching/eval functionality, candidate proof, and CTA.
- **v1.x**: Improve matching quality, eval depth, onboarding flows, and real data generation.

## Step 5 Preparation

The task breakdown should be organized by independently deliverable user stories:

- Setup and design system foundation.
- Opening story and navigation.
- Core product prototype.
- Engineering thesis/eval section.
- Candidate evidence section.
- CTA and links.
- UX states and polish.
- Deployment and validation.

Each task should be specific enough to execute without reinterpreting the plan.
