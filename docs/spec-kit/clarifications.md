# Clarifications: OrderMatch Lab

**Status**: Clarified for Step 4 planning  
**Date**: July 2, 2026 (§7 added July 6, 2026)

This file records Step 3 decisions from the Spec Kit flow. It exists so future planning does not drift from the constitution and specification.

## 1. Candidate Content

Candidate content should be selected from `docs/story-bank-harsh.md`.

The candidate section should not become a full biography or generic CV page. It should sell Harsh through proof that is relevant to Comena's likely needs:

- full-stack building
- AI/data evaluation
- workflow automation
- fast deployment
- product judgment
- ability to research a domain and build something useful without waiting for permission

Recommended candidate proof points:

- **ALEVOR AI classification system**: strongest proof for AI/data evaluation, prompt benchmarking, production deployment, and process automation.
- **AI Investment Analyst**: proof of full-stack deployment, Python backend, Next.js frontend, finance/business logic, and building a serious tool quickly.
- **CV-JD Fit Scorer**: proof of fast AI product shipping, document parsing, structured output, and workflow automation.
- **TUM coursework**: use only the relevant signal, especially Machine Learning & Causal Discovery, Big Data Analytics, Introduction to Programming, Applied Econometrics, and Operations Research.
- **Bomberman Java project**: optional supporting proof for programming fundamentals if the candidate section needs a lightweight coding-fundamentals artifact.

Do not let the candidate section overpower the product. The product should remain the main proof.

## 2. CTA

The final CTA should invite a quick call or short internship conversation.

The CTA should eventually include:

- a calendar booking link, once Harsh chooses a tool
- direct contact option
- GitHub
- LinkedIn
- relevant project links
- resume
- social links only where they support credibility

Tone should be direct and confident, not timid or overly formal.

## 3. Comena Framing

Use Comena explicitly in the opening and final CTA.

The core product prototype should use more reusable product language:

- B2B order automation
- industrial distributors
- manufacturers
- purchase orders
- RFQs
- SKU catalogs
- ERP readiness
- exception review
- evals

This keeps the first version Comena-specific enough to impress, while making it easier to adapt the project later for similar companies.

## 4. Data Policy

Use grounded synthetic data.

The project should not rely on private customer data or pure invented data. The data strategy is:

1. Public procurement sources such as OCDS/TED guide structure, fields, terminology, item descriptions, quantities, units, classifications, and edge cases.
2. Orbis and TUM-accessible research can guide realistic company/customer profiles, industries, geographies, and market context.
3. The actual demo uses synthetic industrial orders, RFQs, catalogs, and exceptions so the examples are safe, controllable, and shareable.

The first frontend/story pass should use a small handcrafted dataset that is realistic enough to support the UI. Deep dataset sourcing, data generation, and eval dataset design belong later in the backend/functionality phase.

## 5. Backend Boundary

The first shareable version can be frontend-first and use mocked data.

The spec should still preserve a future backend/API boundary because real functionality will need more than static frontend state:

- document parsing
- SKU matching
- eval runs
- file processing
- persistence
- background jobs
- ERP-readiness validation

Do not assume long-running AI/data workflows belong only inside Vercel-hosted frontend logic.

Final stack decisions belong in Step 4: Plan. However, Comena's public job post mentions TypeScript frontend, Python/Django backend, Postgres, and LLMs, so the plan should consider matching or aligning with that stack where it makes sense.

## 6. Tone

The candidate/product story should feel direct and bold.

The tone should communicate:

- confidence
- initiative
- seriousness
- domain understanding
- builder energy

Avoid cringe, inflated claims, or fake certainty. Let the product and engineering thesis carry the confidence.

## 7. Backend Realization: Render, Claude API, And Confidence Scoring (Added July 6, 2026)

This entry records the decision that moved backend work from an abstract "v0.6+" placeholder into a real target, reusing what `/thesis` already narrates rather than inventing a new approach. It supersedes the open backend-hosting and LLM-provider items in `docs/spec-kit/plan.md`'s Research Needed list.

**Hosting**: Render, not Railway. Railway was the original default because it's what the AI Investment Analyst project used, but that account's trial credit is nearly exhausted ($3.61 of $5 left, 0 trial days remaining) and Railway's Limited Trial gates outbound network access behind GitHub re-verification (`railway.com/verify`) or a payment method. Render's free Postgres + web service tier needs no card, and using it isolates this project's risk from the AI Investment Analyst deployment's uptime.

**Extraction and matching**: Real, via the Claude API called only from backend endpoints, never from the browser. Extraction replaces the client-side timer simulation with real structured output from pasted/uploaded order text. Matching implements the hybrid approach already described on the `/thesis` confidence slide: deterministic attribute/unit/part-number rules first, Claude-assisted semantic matching against the catalog for remaining ambiguity. Neither is a new invented method; both are what the engineering thesis already claims the product does.

**Confidence**: Computed server-side as a real per-line score from the matching pipeline. The score is compared against persisted setup-config thresholds (auto-approve threshold, price-flag threshold) to decide routing. The raw score and any multi-band classification stay backend-internal. Explicit decision: do not reintroduce a 4-band confidence badge UI (`lib/confidence.ts` was already deleted as dead code in Phase 6, T055, once it was found unused). The frontend keeps expressing outcomes only through the existing two-signal model (clean match / risk flag) already used by the resolve-or-defer picker. This is real backend work with no new frontend surface.

**Setup configuration**: Auto-approve threshold, price-flag threshold, and rule toggles persist in Postgres and are read at match time to gate real routing, replacing `/prototype/setup`'s disconnected simulated click-through with something that actually drives the live order review.

**Evals**: Computed for real by running the pipeline against the existing grounded, labeled sample dataset in `docs/data-research/`, closing the gap noted when the eval dashboard was killed in Phase 6 (T052: "`data/evals.ts` is kept, unused for now, for when a real backend can compute these metrics for real"). Whether real eval numbers get any new frontend display, or stay backend-only/documented, remains an open decision, deferred to Phase 13 (T126).

**Graceful degradation**: Now a real requirement, not a hypothetical one. Phase 13's original T058 was deferred specifically because "there is no backend yet for these failures to be real." Once extraction/matching genuinely call the Claude API, real failure modes exist (timeout, rate limit, malformed response, Render service/database unavailability) and need real recovery states, covered under the rebuilt Phase 12 (T112) and Phase 13 (T124).
