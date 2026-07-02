# Tasks: OrderMatch Lab

**Plan**: `docs/spec-kit/plan.md`
**Spec**: `docs/spec-kit/specification.md`
**Date**: July 2, 2026

## Phase 1: Planning Lock, Research, And Design Foundation

**Purpose**: Finish the non-code foundation so implementation starts with a clear product, design, data, and Comena-specific direction.

- [x] T001 Review `docs/spec-kit/plan.md` and confirm the v0.x to v1.0 version strategy.
- [x] T002 [P] Refresh Comena research and save a compact brief to `docs/research/comena-brief.md`, including product understanding, public stack signals, likely workflow pain, and claims to avoid.
- [x] T003 [P] Do a focused public procurement/product example research pass and save findings to `docs/data-research/grounding-notes.md`.
- [x] T004 [P] Create `docs/data-research/source-map.md` mapping each grounded synthetic data choice to a public source, public pattern, or explicit design assumption.
- [x] T005 [P] Create `docs/design-system/visual-direction.md` defining visual tone, color direction, typography principles, density, motion, and anti-patterns.
- [x] T006 [P] Create `docs/design-system/component-rules.md` defining rules for tables, badges, buttons, tabs, sidebars, review panels, confidence states, and cards.
- [x] T007 [P] Create `docs/design-system/screen-map.md` mapping each major screen/section to its goal, proof point, primary action, and loading/success/error/empty/partial states.
- [x] T008 [P] Create `docs/design-system/wireframes.md` with low-fidelity screen compositions for opening, workflow, evals, candidate proof, CTA, and onboarding/setup.
- [x] T009 [P] Create `docs/design-system/copy-principles.md` defining direct/bold voice, Comena framing, candidate tone, banned words/phrases, and no-overclaim rules.
- [x] T010 Create `docs/qa/reviewer-test-plan.md` defining the 60-second first impression test, 3-minute walkthrough test, and final send-readiness checklist.
- [x] T011 Update `docs/spec-kit/plan.md` if Comena research or data research changes product, stack, mock data, or backend assumptions.
- [x] T012 Confirm that the design docs preserve the constitution: candidate story, product proof, trust before flash, UX states, frontend-first sequence, Comena specificity, and engineering thesis.

**Checkpoint**: Research, design direction, data grounding, and reviewer QA plan are ready. No app code is required yet.

---

## Phase 2: Frontend Scaffold And Core Types

**Purpose**: Create the frontend foundation for the v0.x product surface.

- [x] T013 Scaffold the Next.js app with TypeScript, Tailwind CSS, App Router, and a clean project structure.
- [x] T014 Add shadcn/ui setup and install the first required UI primitives.
- [x] T015 Add lucide-react and define icon usage conventions for navigation, status, review actions, and CTA links.
- [x] T016 Create base layout files for app shell, metadata, global styles, and responsive constraints.
- [x] T017 Create initial folders for `components/narrative`, `components/product`, `components/candidate`, `components/onboarding`, `data`, `lib`, and `types`.
- [x] T018 Define TypeScript types for orders, line items, catalog items, match candidates, exceptions, eval metrics, onboarding setup, and candidate proof items.
- [x] T019 Define shared UI state types for loading, success, error, empty, partial, stale, simulated, and backend-backed states.
- [x] T020 Create formatter helpers for currency, dates, quantities, confidence, statuses, and units.
- [x] T021 Create confidence and readiness helper functions for high-confidence, review-needed, blocked, no-match, and ERP-ready states.
- [x] T022 Add initial app README notes for local development, v0/v1 version intent, and what must be true before the app is sent.

**Checkpoint**: Frontend app runs locally with empty shell, typed project foundations, and UI state concepts ready before screen work begins.

---

## Phase 3: Grounded Synthetic Data V0

**Purpose**: Build the first realistic data layer that makes the frontend prototype feel grounded instead of fake.

- [ ] T023 [P] Create `data/catalog.ts` with 30-80 industrial catalog items covering fasteners, bearings, seals, valves, sensors, cables, motors, and fittings.
- [ ] T024 [P] Create `data/orders.ts` with 3-5 purchase orders or RFQs using realistic fields and customer profiles.
- [ ] T025 [P] Create `data/evals.ts` with extraction, matching, human review, false confident match, exception category, and time-saved metrics.
- [ ] T026 [P] Create `data/candidate.ts` using selected proof points from `docs/story-bank-harsh.md`.
- [ ] T027 Add messy line-item cases: abbreviations, missing units, German/English variants, duplicate line, price mismatch, ambiguous SKU, no-match item, discontinued item, and low-confidence item.
- [ ] T028 Add traceability reasons for match candidates, such as size, material, standard, unit, synonym, customer part number, and catalog attribute.
- [ ] T029 Add ground-truth labels for extraction fields, expected SKU matches, expected blocked cases, and expected eval outcomes.
- [ ] T030 Create an edge-case coverage matrix in `docs/data-research/edge-case-matrix.md` showing which sample orders cover each required uncertainty/failure case.
- [ ] T031 Add comments or metadata that mark the dataset as grounded synthetic/sample data without weakening the product story.
- [ ] T032 Validate that sample data can support every P1 user story in `docs/spec-kit/specification.md`.

**Checkpoint**: Mock data is realistic, traceable, labeled, and broad enough to drive the narrative, product prototype, eval dashboard, onboarding/setup view, and candidate proof section.

---

## Phase 4: User Story 1 - Opening And Guided Journey (P1 MVP)

**Goal**: A reviewer quickly understands why this exists and can enter the product prototype.

**Independent Test**: A reviewer can spend 30-60 seconds on the opening section and explain that this is a Comena-relevant candidate pitch built around order automation.

- [ ] T033 [US1] Build the opening section with direct Comena-specific framing and a primary CTA to enter the prototype.
- [ ] T034 [US1] Add a concise "what I learned" section that explains the workflow from inbox/PDF/RFQ to extraction, SKU matching, review, and ERP readiness.
- [ ] T035 [US1] Add top-level navigation that supports both guided reading and direct jumps.
- [ ] T036 [US1] Add secondary CTAs for product prototype, engineering thesis, candidate evidence, and final CTA.
- [ ] T037 [US1] Add narrative section states for loading, empty, error, and partial content where a link, research note, or supporting proof fails to load.
- [ ] T038 [US1] Add responsive behavior so the opening never feels broken on mobile, even though the product is desktop-first.
- [ ] T039 [US1] Run the 60-second first impression test from `docs/qa/reviewer-test-plan.md` and record findings in `docs/qa/v0-first-impression-notes.md`.

**Checkpoint**: US1 complete. The first impression is Comena-specific, direct, testable, and not generic.

---

## Phase 5: User Story 2 - Core Product Workflow (P1 MVP)

**Goal**: A reviewer can walk through the order-operations workflow using realistic data.

**Independent Test**: A reviewer can inspect an order, understand extracted fields, inspect SKU matches, resolve or view exceptions, and reach an ERP-ready/approval-ready state.

- [ ] T040 [US2] Build the order/RFQ queue with statuses, customer names, confidence, exception count, and time-saved indicators.
- [ ] T041 [US2] Add queue states for loading, empty, partial/stale data, and row-level API or simulated data errors.
- [ ] T042 [US2] Build the order review layout with original order context beside extracted structured fields.
- [ ] T043 [US2] Add document/original-context states for loading preview, failed preview, unavailable document, and fallback extracted text.
- [ ] T044 [US2] Build the line-item normalization table showing original text and normalized product details.
- [ ] T045 [US2] Build SKU match cards or rows with suggested SKU, confidence, alternate candidates, and match reasons.
- [ ] T046 [US2] Build exception review UI for missing units, ambiguous SKUs, price mismatch, duplicate line, no-match, discontinued item, and low-confidence cases.
- [ ] T047 [US2] Build order-level ERP readiness panel showing blockers, required fields, and approval-ready state.
- [ ] T048 [US2] Add simulated state transitions for selecting an order, accepting a match, rejecting a match, resolving an exception, and marking the order ready.
- [ ] T049 [US2] Add success, rollback, and failure feedback for accepted match, rejected match, resolved exception, and ERP-ready actions.
- [ ] T050 [US2] Add clear prototype/sample-data indicators where needed so mocked behavior is honest.

**Checkpoint**: US2 complete. The product workflow can be clicked through without backend support and still shows realistic state behavior.

---

## Phase 6: User Story 3 And 4 - Engineering Thesis And Trust Model (P1 MVP)

**Goal**: A reviewer understands that the product is about reliable AI workflow design, not just a nice interface.

**Independent Test**: A reviewer can identify at least five engineering problems and explain how the trust model handles confidence, review, blocked states, and traceability.

- [ ] T051 [US3] Build the engineering thesis section around extraction, normalization, SKU matching, confidence, exceptions, ERP readiness, evals, onboarding repeatability, traceability, and graceful degradation.
- [ ] T052 [US3] Build eval dashboard cards for extraction accuracy, SKU top-1 accuracy, SKU top-3 recall, human correction rate, auto-approval rate, false confident matches, exception categories, and time saved.
- [ ] T053 [US3] Add eval dashboard states for no eval runs, eval running, eval failed, stale metrics, and eval complete.
- [ ] T054 [US3] Build failure-mode examples that connect visible UI states to real engineering problems.
- [ ] T055 [US4] Build confidence state rules and UI badges for high-confidence, review-needed, blocked, and no-match states.
- [ ] T056 [US4] Build traceability detail UI explaining why a SKU was suggested.
- [ ] T057 [US4] Build ERP readiness reasoning that shows which fields or lines block approval.
- [ ] T058 [US3] Build graceful degradation examples or UI states for failed document preview, failed eval chart, unavailable SKU matching, and stale cached order data.
- [ ] T059 [US3] Add a lightweight onboarding/setup view showing catalog ingestion, field mapping, customer-specific rules, eval baseline, and readiness checks.

**Checkpoint**: US3/US4 complete. The prototype makes uncertainty, measurement, onboarding repeatability, and review loops obvious.

---

## Phase 7: User Story 5 - Guided But Non-Linear Navigation (P2)

**Goal**: Reviewers can follow the story or jump directly to what they care about.

**Independent Test**: A reviewer can reach the prototype from the first screen in one action and can also complete the guided story without feeling trapped.

- [ ] T060 [US5] Add section navigation with current-section awareness.
- [ ] T061 [US5] Add jump links for prototype, evals, onboarding/setup, candidate proof, and final CTA.
- [ ] T062 [US5] Make prototype entry and exit paths obvious.
- [ ] T063 [US5] Preserve understandable UI state when navigating between narrative and prototype sections.
- [ ] T064 [US5] Add compact mobile navigation that avoids hiding primary actions.
- [ ] T065 [US5] Run a 3-minute guided walkthrough test and record whether the reviewer can reach prototype, trust model, candidate proof, and CTA without explanation.

**Checkpoint**: US5 complete. The app works for both quick scanners and guided readers.

---

## Phase 8: User Story 6 - Candidate Evidence (P2)

**Goal**: The reviewer sees relevant proof about Harsh without the app becoming a resume dump.

**Independent Test**: A reviewer can connect each candidate proof item to a capability Comena likely values.

- [ ] T066 [US6] Select final candidate proof points from `docs/story-bank-harsh.md`.
- [ ] T067 [US6] Write concise candidate proof copy for ALEVOR AI classification.
- [ ] T068 [US6] Write concise candidate proof copy for AI Investment Analyst.
- [ ] T069 [US6] Write concise candidate proof copy for CV-JD Fit Scorer.
- [ ] T070 [US6] Write concise education/coursework proof tied to AI/data/product engineering.
- [ ] T071 [US6] Decide whether the Bomberman Java project is useful enough to include.
- [ ] T072 [US6] Build candidate proof cards with links, metrics, Comena-relevant capability labels, and concise proof-to-product mapping.
- [ ] T073 [US6] Add supporting links for relevant projects.
- [ ] T074 [US6] Add candidate section empty/error states for missing links, unavailable project links, or resume placeholder.
- [ ] T075 [US6] Run copy against `docs/story-bank-harsh.md` writing rules, including banned words, no grade leakage, no fake claims, no em dashes, and no overclaiming.

**Checkpoint**: US6 complete. Candidate section supports the product and does not overpower it.

---

## Phase 9: User Story 7 - Final CTA And Links (P3)

**Goal**: The app ends with a direct, confident next step.

**Independent Test**: A reviewer understands that Harsh wants a quick call or interview conversation and can act without friction.

- [ ] T076 [US7] Choose a calendar booking tool or decide to use direct email first.
- [ ] T077 [US7] Add final CTA copy inviting a quick call about the internship.
- [ ] T078 [US7] Add GitHub, LinkedIn, resume, AI Investment Analyst, CV-JD Fit Scorer, and other approved links.
- [ ] T079 [US7] Build final CTA section with clear hierarchy and low-friction action.
- [ ] T080 [US7] Add fallback contact option if calendar link is unavailable.
- [ ] T081 [US7] Add CTA loading/error/success states for calendar link, copied email, opened project link, and unavailable resume link.

**Checkpoint**: US7 complete. The final section makes the call feel like the natural next step.

---

## Phase 10: UX States, Polish, Frontend Validation, And Public Repo Polish

**Purpose**: Raise the v0.x frontend to the v1 quality bar visually and experientially before backend work begins.

- [ ] T082 Audit every major section against loading, success, error, empty, and partial state requirements from `docs/ux-product-playbook.md`.
- [ ] T083 Add or refine loading states for order queue, order review, SKU matching, eval dashboard, onboarding/setup, candidate links, and CTA interactions.
- [ ] T084 Add or refine empty states for no orders, no eval runs, no SKU matches, no exceptions, no catalog items, and no setup rules.
- [ ] T085 Add or refine error states with specific recovery actions for document preview, SKU matching, eval chart, setup/import, and save/review actions.
- [ ] T086 Add or refine success states for accepted match, resolved exception, completed eval run, completed setup step, and ERP-ready order.
- [ ] T087 Add or refine partial states so one failed section does not break the whole experience.
- [ ] T088 Run copy pass to remove vague AI language, resume-dump tone, generic portfolio language, and overclaims.
- [ ] T089 Run responsive pass for desktop, laptop, tablet, and mobile.
- [ ] T090 Run accessibility pass for keyboard focus, color contrast, button labels, semantic structure, and table usability.
- [ ] T091 Run visual QA against `docs/design-system/`, `docs/ux-product-playbook.md`, and the no-AI-slop direction.
- [ ] T092 Run the 3-minute busy-reviewer test again and save findings to `docs/qa/v0-reviewer-walkthrough-notes.md`.
- [ ] T093 Create or update the public GitHub README with project purpose, screenshots or GIF plan, architecture, what is real vs simulated, deployment link placeholder, and clean setup instructions.

**Checkpoint**: Frontend prototype is polished, understandable, and repo-presentable enough to justify backend work.

---

## Phase 11: Backend Scaffold (v0.6)

**Purpose**: Introduce the real backend/API layer required for v1.0.

- [ ] T094 Decide Django API pattern: Django REST Framework, Django Ninja, or another Django approach.
- [ ] T095 Decide backend hosting and database provider.
- [ ] T096 Scaffold Python/Django backend in a separate backend folder.
- [ ] T097 Add backend environment configuration and secret-handling pattern.
- [ ] T098 Add Postgres configuration for local and deployed environments.
- [ ] T099 Define backend models for orders, order lines, catalog items, match candidates, exceptions, review decisions, setup rules, uploaded inputs, and eval runs.
- [ ] T100 Create initial API endpoints that mirror the frontend mock data shape.
- [ ] T101 Add API contract documentation or typed schemas so frontend and backend stay aligned.
- [ ] T102 Add seed-data loading from grounded synthetic examples.
- [ ] T103 Update frontend data access layer so frontend can switch between local mock data and backend API data.

**Checkpoint**: Backend exists, loads sample data, documents its API shape, and can serve the same core data shape used by the frontend.

---

## Phase 12: Backend-Backed Workflow (v0.7)

**Purpose**: Replace key mocked workflow state with persisted backend behavior.

- [ ] T104 Persist orders, line items, catalog items, match candidates, exceptions, setup rules, and review decisions.
- [ ] T105 Add API endpoint to list orders/RFQs.
- [ ] T106 Add API endpoint to retrieve order review details.
- [ ] T107 Add API endpoint to accept or reject a SKU match.
- [ ] T108 Add API endpoint to resolve an exception.
- [ ] T109 Add API endpoint to compute or retrieve ERP-readiness status.
- [ ] T110 Add API endpoint to retrieve setup/onboarding configuration.
- [ ] T111 Update frontend order queue, review screens, and onboarding/setup view to use backend-backed state.
- [ ] T112 Add backend error handling and frontend recovery states for API failures.
- [ ] T113 Add backend tests or endpoint checks for order listing, match decision persistence, exception resolution, and ERP-readiness behavior.

**Checkpoint**: The core review workflow is backend-backed, persists state, and has basic checks for the behavior that matters.

---

## Phase 13: Extraction, Matching, And Eval Functionality (v0.8)

**Purpose**: Add enough real functionality to support the v1 engineering thesis.

- [ ] T114 Decide v1 input scope: upload files, pasted text, sample import, or a combination.
- [ ] T115 Implement sample/demo import flow that creates backend orders from grounded synthetic examples.
- [ ] T116 Implement input validation for uploaded, pasted, or sample order content.
- [ ] T117 Implement initial extraction logic for pasted/sample order content.
- [ ] T118 Implement deterministic normalization helpers for units, quantities, common abbreviations, and product attributes.
- [ ] T119 Implement initial SKU matching logic against the catalog.
- [ ] T120 Implement confidence scoring rules for high-confidence, review-needed, blocked, and no-match outcomes.
- [ ] T121 Implement traceability output for SKU match reasons.
- [ ] T122 Implement eval run generation from known sample ground truth.
- [ ] T123 Define minimum v1 eval thresholds or quality expectations for sample data, such as no false confident blocked cases and correct top-3 match for known ambiguous cases.
- [ ] T124 Connect frontend eval dashboard to backend eval outputs.
- [ ] T125 Add backend tests or scripts for extraction, normalization, matching, confidence scoring, traceability, and eval generation on the sample dataset.
- [ ] T126 Document what is real, what is simulated, what is sample-only, and what remains v1.x.

**Checkpoint**: Backend functionality supports extraction, matching, confidence, traceability, and evals enough for the core demo, with checks that prevent fake confidence.

---

## Phase 14: Deployment And Full-Stack Beta (v0.9)

**Purpose**: Deploy and test the full-stack system before declaring v1.0.

- [ ] T127 Deploy frontend to Vercel.
- [ ] T128 Deploy backend to selected provider.
- [ ] T129 Provision production database.
- [ ] T130 Configure environment variables and secret management.
- [ ] T131 Run smoke test for static and narrative routes that do not require API calls.
- [ ] T132 Run smoke test for backend API endpoints.
- [ ] T133 Run full workflow test: open app, import/sample order, review matches, resolve exception, reach ERP-ready state, view eval metrics.
- [ ] T134 Test deployment failure modes: backend unavailable, database unavailable, slow eval run, broken document preview, and unavailable calendar/project links.
- [ ] T135 Add user-facing error states for deployment/API failures.
- [ ] T136 Validate no secrets, API keys, raw backend errors, private data, or misleading Comena claims are exposed.

**Checkpoint**: Full-stack beta is deployed and supports the complete review flow under normal and degraded conditions.

---

## Phase 15: v1.0 Final Polish And Send Readiness

**Purpose**: Meet the v1 quality bar before sending the link.

- [ ] T137 Re-read constitution, specification, clarifications, plan, product story brief, UX playbook, story bank, and task list before final polish.
- [ ] T138 Verify every P1 user story passes its independent test.
- [ ] T139 Verify every success criterion in the specification is met or explicitly scoped.
- [ ] T140 Perform final UI polish pass for spacing, typography, color, status badges, charts, review panels, onboarding/setup, and CTA.
- [ ] T141 Perform final copy pass for direct, confident, non-cringe tone, using `docs/story-bank-harsh.md` writing rules.
- [ ] T142 Verify Comena appears strongly in opening and CTA, while product core remains reusable.
- [ ] T143 Verify candidate section is selective and linked to Comena-relevant capabilities.
- [ ] T144 Verify CTA has calendar/contact fallback and correct links.
- [ ] T145 Run final 60-second first impression test and 3-minute busy-reviewer walkthrough test.
- [ ] T146 Test desktop, laptop, tablet, and mobile layouts.
- [ ] T147 Run production smoke test after final deployment.
- [ ] T148 Verify public GitHub README, repo structure, commit history, and deployment link look intentional if a reviewer clicks through.
- [ ] T149 Prepare a short send message to Comena explaining the project and inviting a call.

**Checkpoint**: v1.0 is ready to send to Comena.

---

## Execution Order

1. Phase 1 must happen first because research, design, data direction, and reviewer QA affect every later task.
2. Phases 2-3 build the frontend foundation and grounded data.
3. Phases 4-7 deliver the P1/P2 product and story experience with UX states built into each section.
4. Phases 8-9 complete candidate proof and CTA.
5. Phase 10 polishes the frontend and public repo before backend work hardens the product.
6. Phases 11-13 add backend-backed functionality required for v1.0.
7. Phases 14-15 deploy, validate, and prepare the final send.

## Parallel Opportunities

- T002-T010 can run in parallel if research, design, data, copy, and QA setup are split.
- T023-T026 can run in parallel after data types are clear.
- T033-T039 and T040-T050 should not run fully in parallel until layout/design rules are set, but individual components can be split.
- T066-T075 can run in parallel with product UI work after candidate proof points are selected.
- T082-T087 can be handled section by section once screens exist.
- T104-T110 can be split across backend endpoints after models are stable.
- T138-T148 can be parallelized during final QA.

## Notes

- Do not start implementation until this task list is reviewed and confirmed.
- Keep commits clean and do not add AI co-author trailers.
- Treat v1.0 as the first serious send-to-Comena release, not a rough MVP.
