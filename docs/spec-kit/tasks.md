# Tasks: OrderMatch Lab

**Plan**: `docs/spec-kit/plan.md`
**Spec**: `docs/spec-kit/specification.md`
**Date**: July 2, 2026 (Phases 11-13 revised July 6, 2026, see `docs/spec-kit/clarifications.md` §7)

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

- [x] T023 [P] Create `data/catalog.ts` with 30-80 industrial catalog items covering fasteners, bearings, seals, valves, sensors, cables, motors, and fittings.
- [x] T024 [P] Create `data/orders.ts` with 3-5 purchase orders or RFQs using realistic fields and customer profiles.
- [x] T025 [P] Create `data/evals.ts` with extraction, matching, human review, false confident match, exception category, and time-saved metrics.
- [x] T026 [P] Create `data/candidate.ts` using selected proof points from `docs/story-bank-harsh.md`.
- [x] T027 Add messy line-item cases: abbreviations, missing units, German/English variants, duplicate line, price mismatch, ambiguous SKU, no-match item, discontinued item, and low-confidence item.
- [x] T028 Add traceability reasons for match candidates, such as size, material, standard, unit, synonym, customer part number, and catalog attribute.
- [x] T029 Add ground-truth labels for extraction fields, expected SKU matches, expected blocked cases, and expected eval outcomes.
- [x] T030 Create an edge-case coverage matrix in `docs/data-research/edge-case-matrix.md` showing which sample orders cover each required uncertainty/failure case.
- [x] T031 Add comments or metadata that mark the dataset as grounded synthetic/sample data without weakening the product story.
- [x] T032 Validate that sample data can support every P1 user story in `docs/spec-kit/specification.md`.

**Checkpoint**: Mock data is realistic, traceable, labeled, and broad enough to drive the narrative, product prototype, eval dashboard, onboarding/setup view, and candidate proof section.

---

## Phase 4: User Story 1 - Opening And Guided Journey (P1 MVP)

**Goal**: A reviewer quickly understands why this exists and can enter the product prototype.

**Independent Test**: A reviewer can spend 30-60 seconds on the opening section and explain that this is a Comena-relevant candidate pitch built around order automation.

- [x] T033 [US1] Build the opening section with direct Comena-specific framing and a primary CTA to enter the prototype.
- [x] T034 [US1] Add a concise "what I learned" section that explains the workflow from inbox/PDF/RFQ to extraction, SKU matching, review, and ERP readiness.
- [x] T035 [US1] Add top-level navigation that supports both guided reading and direct jumps.
- [x] T036 [US1] Add secondary CTAs for product prototype, engineering thesis, candidate evidence, and final CTA. Scope changed: the 4-card secondary CTA row was replaced by direct jumps in the nav rail plus a dedicated contact page with verified links and pending slots for final call/email/LinkedIn details.
- [ ] T037 [US1] Add narrative section states for loading, empty, error, and partial content where a link, research note, or supporting proof fails to load. Intentionally deferred to Phase 5 so these states attach to real product-workbench sections instead of unused narrative demo components.
- [x] T038 [US1] Add responsive behavior so the opening never feels broken on mobile, even though the product is desktop-first.
- [x] T039 [US1] Run the 60-second first impression test from `docs/qa/reviewer-test-plan.md` and record findings in `docs/qa/v0-first-impression-notes.md`.

**Checkpoint**: US1 complete. The first impression is Comena-specific, direct, testable, and not generic.

---

## Phase 5: User Story 2 - Core Product Workflow (P1 MVP)

**Goal**: A reviewer can walk through the order-operations workflow using realistic data.

**Independent Test**: A reviewer can pick a sample order, watch it get read and matched, resolve or defer anything ambiguous, and send a fully resolved order to the ERP.

- [x] T040 [US2] Build the order/RFQ queue with statuses, customer names, confidence, exception count, and time-saved indicators. Superseded: the dense queue table was replaced by the guided order-intake screen (T042) once the reviewer flow moved from browsing everything at once to picking one order and following it through. The old table and its supporting `OrderReviewProvider`/`OrderReviewFrame`/stage-placeholder code were removed once the new flow was validated.
- [x] T041 [US2] Add queue states for loading, empty, partial/stale data, and row-level API or simulated data errors. Superseded: state handling now lives on the intake, processing, and summary screens described below instead of a single dense table.
- [x] T042 [US2] Build the order-intake screen: sample order cards with real data and clear source labels, plus a "use your own order" panel with paste-text, upload-file, and an intentionally inert "connect email" tab. The screen reflects session progress: already-sent sample orders show a sent badge and switch to a secondary "view sent order" action, and the headline updates once anything has been sent.
- [x] T043 [US2] Build the live processing screen: header fields and line items reveal on a staggered timer inside a timeline/log layout, each line tagged matched or needs-a-decision, with a running progress indicator and an ambient side rail showing other sample orders processing in the background on their own independent timers.
- [x] T044 [US2] Build the inline resolve-or-defer picker for flagged line items: up to three ranked catalog candidates plus a combined "type the correct match or decide later" option. Resolution is non-blocking, so the rest of the order keeps revealing while a flagged line waits for a decision.
- [x] T045 [US2] Build the order-summary screen: the full resolved order, each line expandable to show match traceability (why it matched, using real proof items), and any line still unresolved reopens the same resolve-or-defer picker before the order can be sent.
- [x] T046 [US2] Build the "Send to ERP" action: disabled while anything is unresolved, a brief simulated sending state, then an animated, centered sent-confirmation takeover (the line items hide, a check icon pops in, and the order reference is shown) once complete.
- [x] T047 [US2] Build the "waiting for you" queue screen: surfaces other background-processed sample orders that still have flagged items, tracked for the browser session so an order drops off the list once it has been sent, with a clean "you're all caught up" empty state once nothing remains.
- [x] T048 [US2] Add session-scoped state (not backend-persisted) for line resolutions and sent-order history, so decisions and progress carry across the processing, summary, waiting-queue, and intake screens within one browser session.
- [x] T049 [US2] Add clear "Confirmed" vs "Matched" and "Sent" vs "Review this order" labeling so a reviewer can tell an automatic match from a human-confirmed one, and an already-sent order from one still waiting.
- [x] T050 [US2] Add clear prototype/sample-data indicators where needed so mocked behavior is honest. Covered by the intake screen's own-order panel note (matching your own inventory starts with connecting your catalog). The fuller backend-vs-simulated architecture story belongs in the Phase 6 engineering thesis section, not embedded in this flow.

**Checkpoint**: US2 complete. The product workflow can be clicked through without backend support and still shows realistic state behavior. Old dashboard-plan code (four-panel fields/lines/exceptions/readiness review, the `[orderId]` stage routes, and their supporting components) has been removed now that this flow is built and validated.

---

## Phase 6: User Story 3 And 4 - Engineering Thesis And Trust Model (P1 MVP)

**Goal**: A reviewer understands that the product is about reliable AI workflow design, not just a nice interface.

**Independent Test**: A reviewer can identify at least five engineering problems and explain how the trust model handles confidence, review, blocked states, and traceability.

- [x] T051 [US3] Build the engineering thesis section around extraction, normalization, SKU matching, confidence, exceptions, ERP readiness, evals, onboarding repeatability, traceability, and graceful degradation. Built as a 7-slide interactive walkthrough at `/thesis` (`components/narrative/how-it-works.tsx`), replacing the old static placeholder page. Each concept is a slide with a real interaction (extraction reveal, hybrid-search mode toggle, confidence-threshold slider, evals every-run/grouped toggle) rather than prose, and grounded in real research and production examples rather than invented claims. Graceful degradation is covered as one text slide, not mocked UI, see T058 note.
- [ ] T052 [US3] Build eval dashboard cards for extraction accuracy, SKU top-1 accuracy, SKU top-3 recall, human correction rate, auto-approval rate, false confident matches, exception categories, and time saved. Deliberately not built. Decision: a numeric metrics dashboard would be invented precision with no backend computing it, and it is redundant given every uncertain line already gets a human decision. Superseded by the evals slide in T051, which demonstrates the grouping method instead of showing fake numbers. `data/evals.ts` (the Phase 3 grounded eval dataset) is kept, unused for now, for when a real backend can compute these metrics for real.
- [ ] T053 [US3] Add eval dashboard states for no eval runs, eval running, eval failed, stale metrics, and eval complete. Not applicable, no dashboard was built, see T052.
- [x] T054 [US3] Build failure-mode examples that connect visible UI states to real engineering problems. Done differently: folded into the confidence slide (near-identical bearing variants, a too-vague motor request) and the evals slide (recurring failure patterns), reusing real sample-order edge cases instead of a separate failure-mode gallery.
- [ ] T055 [US4] Build confidence state rules and UI badges for high-confidence, review-needed, blocked, and no-match states. The rules existed from an earlier phase (`lib/confidence.ts`) but were never wired into any UI, and are now deleted as dead code. Decision: no persistent 4-band badge on live screens, the human-in-the-loop resolve picker already carries that job. The concept survives only as the one-time interactive confidence-threshold slide in T051.
- [x] T056 [US4] Build traceability detail UI explaining why a SKU was suggested. Not rebuilt. The existing "why this matched" panel from Phase 5 (`order-summary.tsx`) is reused and pointed to directly from the confidence slide, rather than building a second, parallel component.
- [x] T057 [US4] Build ERP readiness reasoning that shows which fields or lines block approval. Not rebuilt. The existing unresolved-count gate on "Send to ERP" from Phase 5 is reused and pointed to directly from the "keeping it honest" slide.
- [ ] T058 [US3] Build graceful degradation examples or UI states for failed document preview, failed eval chart, unavailable SKU matching, and stale cached order data. Deliberately not built as UI. Decision: mocking broken states next to a working prototype would read as confusing, not thoughtful, and there is no backend yet for these failures to be real. Covered as three sentences of text on the "making it real" slide instead (per-customer ERP write-back, and that failure fallbacks get built once there is a backend that can actually fail).
- [x] T059 [US3] Add a lightweight onboarding/setup view showing catalog ingestion, field mapping, customer-specific rules, eval baseline, and readiness checks. Went beyond "lightweight": built as its own full page (`/prototype/setup`, `components/onboarding/setup-flow.tsx`), a 6-step click-through stepper (connect catalog, map fields, customer names, rules and thresholds, baseline check, readiness), linked from both the end of the guided order flow and the end of the thesis walkthrough. Explicitly labeled a "sample walkthrough" so a reviewer does not think a real upload is happening.

**Checkpoint**: US3/US4 complete. The prototype makes uncertainty, measurement, onboarding repeatability, and review loops obvious. Scope changed from the original task wording in several places (no metrics dashboard, no confidence badges, no graceful-degradation mockups), each a deliberate product decision made and confirmed in-session, not a shortfall.

---

## Phase 7: User Story 5 - Guided But Non-Linear Navigation (P2)

**Goal**: Reviewers can follow the story or jump directly to what they care about.

**Independent Test**: A reviewer can reach the prototype from the first screen in one action and can also complete the guided story without feeling trapped.

- [x] T060 [US5] Add section navigation with current-section awareness. `app-shell.tsx` highlights the active top-level nav item, and since this session also highlights the active child sub-item where the URL alone can tell which one is active (Prototype vs. Setup); the 7 thesis sub-links share one route so they render as plain jump links without individual highlighting.
- [x] T061 [US5] Add jump links for prototype, evals, onboarding/setup, candidate proof, and final CTA. "What I built" now splits into Prototype/Setup sub-links, and "How it works" lists all 7 thesis steps as sub-links (including evals), each deep-linking to `/thesis?step=N`. Sub-items only render for the currently active top-level section, collapsing everywhere else, so the rail does not get cluttered. Candidate proof (`/proof`) and final CTA (`/contact`) were already reachable as flat top-level items, no change needed there.
- [x] T062 [US5] Make prototype entry and exit paths obvious. Satisfied by the existing guided flow's single-CTA screens (see the T065 walkthrough notes).
- [x] T063 [US5] Preserve understandable UI state when navigating between narrative and prototype sections. Done via `lib/processing-state.ts`.
- [x] T064 [US5] Add compact mobile navigation that avoids hiding primary actions. The existing `details`/`summary` mobile header now mirrors the same sub-section accordion as the desktop rail.
- [x] T065 [US5] Run a 3-minute guided walkthrough test and record whether the reviewer can reach prototype, trust model, candidate proof, and CTA without explanation. An AI self-review originally recorded findings in `docs/qa/v0-reviewer-walkthrough-notes.md`, since deleted, it was a v0-era Codex artifact and its two flagged gaps (`/proof` and `/contact` being placeholders) are resolved as of Phase 8/9. Superseded by Harsh's own real walkthrough pass after Phase 9 shipped: confirmed the experience works as intended, the complexity reflects the project being genuinely Comena-specific rather than a generic template, and no changes were requested.

**Checkpoint**: US5 complete. The app works for both quick scanners and guided readers.

---

## Phase 8: User Story 6 - Candidate Evidence (P2)

**Goal**: The reviewer sees relevant proof about Harsh without the app becoming a resume dump.

**Independent Test**: A reviewer can connect each candidate proof item to a capability Comena likely values.

- [x] T066 [US6] Select final candidate proof points from `docs/story-bank-harsh.md`. Selected: ALEVOR AI classification, AI Investment Analyst, CV-JD Fit Scorer, and TUM coursework (including Python for Engineering and Data Analysis, in progress, exam this semester, added directly by Harsh rather than pulled from the story bank).
- [x] T067 [US6] Write concise candidate proof copy for ALEVOR AI classification.
- [x] T068 [US6] Write concise candidate proof copy for AI Investment Analyst.
- [x] T069 [US6] Write concise candidate proof copy for CV-JD Fit Scorer.
- [x] T070 [US6] Write concise education/coursework proof tied to AI/data/product engineering.
- [x] T071 [US6] Decide whether the Bomberman Java project is useful enough to include. Decided: dropped. Not AI/data-specific enough next to the other three, and the page is meant to stay short.
- [x] T072 [US6] Build candidate proof cards with links, metrics, Comena-relevant capability labels, and concise proof-to-product mapping. Built as `components/narrative/candidate-proof.tsx`, replacing the generic `RouteShell` placeholder at `/proof`. Went through a bento-grid draft first, then switched to a scroll-triggered vertical timeline per Harsh's request: each of the 4 proof points (ALEVOR, AI Investment Analyst, CV-JD Fit Scorer, TUM Coursework) is a numbered stop on a vertical line, revealing with a fade/slide-up animation via `IntersectionObserver` as the reader scrolls to it, no buttons needed. Respects `prefers-reduced-motion` (content shows immediately, no animation) and falls back to showing content immediately if `IntersectionObserver` is unavailable. Each stop leads with the actual project name as its title (not an achievement sentence or the capability label), tagged with what kind of proof it is (work project, personal project, coursework) and a small "Comena-relevant skill" pill, so a first-time reader immediately understands whose project it is and why it is here. Opens with one line naming OrderMatch Lab itself as the strongest proof already seen, linking back to `/prototype` and `/thesis`, rather than repeating it as a fifth stop.
- [x] T073 [US6] Add supporting links for relevant projects. AI Investment Analyst links to its live Vercel deployment and GitHub repo, and CV-JD Fit Scorer links to its live Streamlit deployment, all confirmed reachable. Its initial redirect through a login-looking screen turned out to just be Streamlit Community Cloud waking a sleeping free-tier app, not a real access issue, confirmed with Harsh. ALEVOR intentionally has no clickable link, see T074.
- [x] T074 [US6] Add candidate section empty/error states for missing links, unavailable project links, or resume placeholder. Two link states built: `live` (working external link) and `none` (ALEVOR has no public link since it lives inside another company's internal systems). An `unavailable` state also exists in the component for a genuinely broken link, unused for now since all current live links resolve.
- [x] T075 [US6] Run copy against `docs/story-bank-harsh.md` writing rules, including banned words, no grade leakage, no fake claims, no em dashes, and no overclaiming. Checked against both the story bank's banned-word list and `docs/design-system/copy-principles.md`. No grades mentioned, Python for Engineering and Data Analysis is explicitly framed as in progress rather than completed.

**Checkpoint**: US6 complete. Candidate section supports the product and does not overpower it.

---

## Phase 9: User Story 7 - Final CTA And Links (P3)

**Goal**: The app ends with a direct, confident next step.

**Independent Test**: A reviewer understands that Harsh wants a quick call or interview conversation and can act without friction.

- [x] T076 [US7] Choose a calendar booking tool or decide to use direct email first. Decided: Calendly (free tier), event link `https://calendly.com/harshbhardwaaj29/chat-with-harsh`. Conflict-checking calendar is Google Calendar, which itself subscribes to Harsh's iCloud calendar via a `webcal://` → `https://` "From URL" feed (Calendly does not connect to iCloud/CalDAV reliably, so this indirect route was used instead).
- [x] T077 [US7] Add final CTA copy inviting a quick call about the internship. Superseded by Harsh's direction mid-session: dropped the persuasive paragraph entirely, reasoning that a reviewer reaching this page has already heard the pitch elsewhere in the app. Copy is now a short eyebrow ("Get in touch"), a one-line title ("Let's talk about Comena."), and a single supporting line ("Book a call, email, or call directly, whichever is easiest.").
- [x] T078 [US7] Add GitHub, LinkedIn, resume, AI Investment Analyst, CV-JD Fit Scorer, and other approved links. Deviated from the literal task list by explicit decision: only GitHub and LinkedIn are included, as a small secondary row below the main actions. Resume is left off (no link ready yet). AI Investment Analyst and CV-JD Fit Scorer are deliberately not repeated here since they already live on `/proof`; this page is contact-only, not a second project index.
- [x] T079 [US7] Build final CTA section with clear hierarchy and low-friction action. Rebuilt from the original flat link grid (which shared the generic `RouteShell` placeholder with other routes) into three equal-weight primary action cards, calendar, email, phone, plus a small GitHub/LinkedIn pill row underneath. `RouteShell` had no other usages left after this change and was deleted.
- [x] T080 [US7] Add fallback contact option if calendar link is unavailable. Superseded: since a real Calendly link exists, "fallback" became "equally-weighted alternative" instead, email and phone sit at the same visual weight as the calendar link rather than behind it.
- [x] T081 [US7] Add CTA loading/error/success states for calendar link, copied email, opened project link, and unavailable resume link. Built: the email card has a real success state (click-to-copy shows "Copied" for 2 seconds) and a real error/fallback path (falls back to opening `mailto:` if `navigator.clipboard.writeText` throws, e.g. no clipboard permission). Calendar and phone are plain external/`tel:` links with standard browser handling, no custom state needed. "Opened project link" and "unavailable resume link" states no longer apply since project links and resume were dropped from this page per T078.

**Checkpoint**: US7 complete. The final section makes the call feel like the natural next step.

---

## Phase 10: UX States, Polish, Frontend Validation, And Public Repo Polish

**Purpose**: Raise the v0.x frontend to the v1 quality bar visually and experientially before backend work begins.

- [x] T082 Audit every major section against loading, success, error, empty, and partial state requirements from `docs/ux-product-playbook.md`. Read through `order-intake.tsx`, `order-processing.tsx`, `order-summary.tsx`, `order-waiting-queue.tsx`, `setup-flow.tsx`, `prototype-workflow.tsx`, and `how-it-works.tsx` against the playbook. Most sections already match the playbook closely (documented in `screen-map.md`'s Major Sections table). Found two real gaps, both fixed under T086/T089 below, plus confirmed the intake/setup screens' lack of upload/parse error states is intentional (explicitly labeled "nothing uploads and nothing leaves your browser," not a missed state).
- [x] T083 Add or refine loading states for order queue, order review, SKU matching, eval dashboard, onboarding/setup, candidate links, and CTA interactions. No gaps found beyond T086.
- [x] T084 Add or refine empty states for no orders, no eval runs, no SKU matches, no exceptions, no catalog items, and no setup rules. No gaps found, `order-waiting-queue.tsx` already has a real "Nothing waiting on you right now" empty state.
- [x] T085 Add or refine error states with specific recovery actions for document preview, SKU matching, eval chart, setup/import, and save/review actions. No gaps found beyond what's already documented as an intentional non-goal (no fake upload/parse failures on the simulated intake/setup flows).
- [x] T086 Add or refine success states for accepted match, resolved exception, completed eval run, completed setup step, and ERP-ready order. Fixed one real inconsistency: `setup-flow.tsx`'s "Run sample benchmark" button flipped to its result instantly with no transitional feedback, while the equivalent "Send to ERP" action elsewhere shows a brief "Sending..." state. Added a matching "Running benchmark..." disabled state for 600ms before completing.
- [x] T087 Add or refine partial states so one failed section does not break the whole experience. No gaps found.
- [x] T088 Run copy pass to remove vague AI language, resume-dump tone, generic portfolio language, and overclaims. Grepped the full banned-word list from `docs/design-system/copy-principles.md` plus em/en dash characters across `app/` and `components/`. Found and fixed one literal em dash used as a table placeholder in `order-summary.tsx` (swapped `"—"` for `"n/a"`). No banned words found (one "Dynamic" match was Conexiom's actual product-mode name, not the generic adjective, left as-is).
- [x] T089 Run responsive pass for desktop, laptop, tablet, and mobile. Found and fixed two real bugs: (1) `prototype-workflow.tsx`'s AI-review-to-outcome fork (ready for ERP vs. human reviews) is only explained by desktop-only SVG connector labels ("CLEAR" / "NEEDS REVIEW"), so on mobile it read as a plain 4-step list with no fork explanation at all, undermining the page's whole point on a phone. Added a mobile-only "Splits into two outcomes, based on confidence" label and tightened the excess gap between the two outcome cards. (2) `how-it-works.tsx`'s two-column thesis slide layout overflowed horizontally on mobile (a classic CSS grid `min-width: auto` bug: grid items don't shrink below their content's intrinsic width by default), clipping text on every non-stacked slide. Fixed with `min-w-0` on the grid container and its two direct children. Verified all 7 thesis slides and every other route at mobile/tablet/desktop widths afterward, no remaining horizontal overflow anywhere.
- [x] T090 Run accessibility pass for keyboard focus, color contrast, button labels, semantic structure, and table usability. Confirmed consistent `focus-visible:ring` states, `aria-hidden` on decorative icons, `aria-label` on icon-only buttons (verified the theme toggle specifically), `aria-current="step"` on step indicators, `aria-live="polite"` on the copy-email state, and a skip-to-content link. One minor, non-blocking finding: the muted text color (`--om-muted`, `#64748b`) sits right at the WCAG AA edge (4.46:1, just under the 4.5:1 threshold) when placed directly on the page background (`--om-bg`) rather than on white card surfaces (4.76:1 there). Not fixed, changing a foundational color token for a 0.04 gap felt like overstepping a polish pass, flagged for Harsh instead.
- [x] T091 Run visual QA against `docs/design-system/`, `docs/ux-product-playbook.md`, and the no-AI-slop direction. Screenshotted every major route at desktop, tablet, and mobile widths during the T089 pass. Consistent with the documented design system throughout (accent-blue, mono uppercase labels, custom brand mark, Comena-specific copy), no generic AI-gradient template look found.
- [x] T092 Run the 3-minute busy-reviewer test again and save findings to `docs/qa/v0-reviewer-walkthrough-notes.md`. Superseded: Harsh did his own real walkthrough pass after Phase 9 shipped (see the updated T065 note above) and confirmed it holds up as intended, no new synthetic AI self-review file was created for this round.
- [x] T093 Create or update the public GitHub README with project purpose, screenshots or GIF plan, architecture, what is real vs simulated, deployment link placeholder, and clean setup instructions. Rewrote the root `README.md` from its stale Phase-1-era draft (it described the project before most of the actual UI existed). Now covers the candidate-pitch framing, a full route map, an explicit real-vs-simulated section, tech stack, local dev instructions, a pointer to `docs/` for the full process, and a screenshots section noting what to capture before sending this out (not yet added, no live deployment link yet either).

**Checkpoint**: Frontend prototype is polished, understandable, and repo-presentable enough to justify backend work.

---

## Phase 11: Backend Scaffold (v0.6)

**Purpose**: Introduce the real backend/API layer required for v1.0, hosted on Render. Scope and rationale recorded in `docs/spec-kit/clarifications.md` §7.

- [x] T094 Decide Django API pattern: Django REST Framework, Django Ninja, or another Django approach. Decided: DRF, for the production-Django-shop signal it sends given Comena's stack.
- [ ] T095 Provision a Render web service (backend) and a Render managed Postgres database. Deliberately deferred: built and verified everything locally first (real Postgres 16, running server, real HTTP requests against every endpoint) before touching deployment, per Harsh's direction to build/run locally before deploying.
- [x] T096 Scaffold Python/Django backend in a separate `backend/` folder using the chosen API pattern. Apps: `catalogs`, `orders`, `matching`, `onboarding`, `evals`, plus a plain `common` module for shared choice/enum definitions used across app models.
- [x] T097 Add backend environment configuration and secret-handling pattern, including the LLM API key, read from environment variables only, never committed. `.env.example` documents every variable; `.env` stays gitignored. Originally `ANTHROPIC_API_KEY`; switched to `OPENAI_API_KEY` at the start of Phase 13 (see `clarifications.md` §8), still read only in `settings.py`, never referenced from any frontend code.
- [x] T098 Configure Postgres connection for local development and the Render-hosted deployment. Local: real Postgres 16 role/database (`ordermatch`/`ordermatch_dev`), migrations applied and verified. Deployed: settings.py reads `DATABASE_URL` via `dj-database-url`, which is exactly the variable Render injects automatically once T095 happens; no code change should be needed when that lands.
- [x] T099 Define backend models for orders, order lines, catalog items, match candidates, setup configuration (auto-approve threshold, price-flag threshold, rule toggles), review decisions, and eval runs. All fields mirror `frontend/types/*.ts` directly; `onboarding.SetupConfiguration` is new (the thresholds only existed as component `useState` before, see `setup-flow.tsx`).
- [x] T100 Create initial API endpoints that mirror the frontend mock data shape (orders, catalog, setup config). Read-only DRF viewsets under `/api/`, verified against a running server, not just unit tests.
- [x] T101 Add API contract documentation or typed schemas so frontend and backend stay aligned. Documented in `backend/README.md`; DRF's browsable API also serves as a live, always-current reference.
- [x] T102 Add seed-data loading from the existing grounded synthetic examples (`frontend/data/`, `docs/data-research/`). `backend/scripts/export_frontend_data.mjs` exports `frontend/data/*.ts` to JSON fixtures (using Node's built-in TypeScript stripping, no extra tooling needed) committed under `backend/seed_data/`; `python manage.py seed_sample_data` loads them, verified against real Postgres (46 catalog items, 4 orders, 16 line items, 11 exceptions, 11 readiness checks, 24 match candidates, 2 eval runs).
- [ ] T103 Update frontend data access layer so frontend can switch between local mock data and backend API data via an environment flag. Not started: this is frontend-side work and out of scope for this backend-scaffold pass until confirmed.

**Checkpoint**: Backend scaffold is built, migrated, seeded, and verified against a real running server and real Postgres, locally. Not yet on Render and not yet called by the frontend — both deliberately deferred, not blocked.

---

## Phase 12: Backend-Backed Workflow (v0.7)

**Purpose**: Replace key mocked workflow state with persisted backend behavior.

- [x] T104 Persist orders, line items, catalog items, match candidates, setup configuration, and review decisions in Postgres. Setup configuration was previously unseeded (zero rows); it now seeds one real row matching `setup-flow.tsx`'s actual defaults. See also the onboarding model simplification: `OnboardingStep`/`CustomerRule` were dropped, they mirrored `frontend/types/onboarding.ts`, deleted the same day as dead code the real setup flow never used.
- [x] T105 Add API endpoint to list orders/RFQs. Already existed from Phase 11 (`GET /api/orders/`).
- [x] T106 Add API endpoint to retrieve order review details. Already existed from Phase 11 (`GET /api/orders/<id>/`).
- [x] T107 Add API endpoint to accept, reject, or correct a SKU match. `POST /api/line-items/<id>/decide/` with `{candidate_id}` or `{custom_label}`, plus `POST .../defer/` and `POST .../reopen/`. No standalone "reject" action: the real picker (`match-pick-list.tsx`) only ever accepts a candidate, accepts free text, or defers, never rejects a specific candidate in isolation. `MatchDecision.candidate` had to become nullable, with a new `custom_label` field, to record the free-text path at all. Verified against a running server: candidate accept, custom-text accept, defer, reopen, and all three validation cases (neither field, both fields, candidate belonging to a different line item) all return the correct status codes.
- [x] T108 Add API endpoint to resolve a flagged/exception line item. `POST /api/exceptions/<id>/resolve/`. Verified against a running server.
- [x] T109 Add API endpoint to compute or retrieve ERP-readiness status from persisted state. Implemented as computed `erp_ready`/`unresolved_line_count` fields on the order detail serializer rather than a separate endpoint, since both derive directly from the same nested line items already in that response. Verified live: resolving both flagged lines on a real order flips `erp_ready` from `false` to `true`.
- [x] T110 Add API endpoints to read and update setup/onboarding configuration (auto-approve threshold, price-flag threshold, rule toggles). `GET`/`PATCH /api/setup-configuration/<id>/`. Verified against a running server.
- [x] T111 Update frontend order-intake, processing, summary, waiting-queue, and setup screens to read/write backend-backed state instead of local mock functions. Added `frontend/lib/api.ts`: a typed fetch client plus adapters translating the backend's snake_case/partly-flattened JSON into the exact camelCase/nested shapes the existing components already expect, so rendering logic barely changed, only where the data comes from. `lib/processing-state.ts` (the sessionStorage simulation) is deleted; `lib/product-workflow.ts`'s local-data lookups are gone, replaced by the real fetch functions. Two real bugs caught by actually clicking through the wired-up UI, not just reading the diff: (1) the human-readable PO/RFQ number (`header.orderId`, e.g. "PO-2026-0142") was silently dropped by the seed pipeline, no backend field captured it at all, fixed by adding `OrderRecord.order_number`; (2) the intake screen's one-line order descriptions went blank because the lightweight list endpoint excluded `source_document_summary`, added it back since it's real content a reviewer uses to pick an order, not decoration. A third issue found via navigation, not a single page: "Confirmed" vs "Matched" was computed as a client-side per-page-mount snapshot, so it silently reset to "Matched" the moment a reviewer moved from the processing screen to the summary screen seconds after resolving a line. Fixed by adding a real `resolved_by_decision` computed field to the backend line item serializer (true once an accepted `MatchDecision` exists), so the distinction is correct from any screen or after a reload, not just within one page's session.
- [x] T112 Add backend error handling and frontend recovery states for API/database failures (Render service unavailable, database connection failure). Every screen wired in T111 has real loading/error states, surfaces `ApiError` messages inline (not a silent failure), and now has a "Try again" retry action on initial page-load failures (order-intake, processing, summary, waiting-queue, setup-flow), not just a static message requiring a full page reload. Verified for real, not just read: stopped the Django server, confirmed all five screens fail with a clear message and working retry button (caught one real stale-dev-server bug along the way, unrelated to the backend, `.next` cache serving 404s for core JS chunks after many hot-reloads, which silently prevented any state update at all; the fix is the standard `rm -rf .next` restart already documented in this project's testing gotchas). Restarted the server and confirmed every retry button recovers cleanly. Render-specific failure modes (service cold start, managed Postgres connection limits) remain untested since nothing is deployed yet (T095/T128).
- [x] T113 Add backend tests or endpoint checks for order listing, match decision persistence, exception resolution, setup-config updates, and ERP-readiness behavior. Real Django `TestCase` coverage added (13 tests, run against actual Postgres, not SQLite or mocks): order list/detail shape and confidence-field exclusion, decide with a candidate, decide with free text, both decide validation-error cases, defer/reopen, exception resolution, send-to-erp gating (blocked while unresolved, succeeds once clear), and the `order_number`/`source_document_summary` list-shape fields. Frontend test coverage added too (previously zero): Vitest, testing `frontend/lib/api.ts`'s adapters (header flattening, order_number-to-orderId mapping, nested-to-flat match-candidate reconstruction, exceptionIds reconstruction, confidence fields staying undefined) and its fetch functions against a mocked backend (success, network-failure ApiError, non-2xx ApiError, correct request bodies for decide/defer/setup-config-update), 11 tests, `npm test` in `frontend/`.

**Checkpoint**: Phase 12 is complete. The core review workflow is backend-backed, persists state including setup configuration and review decisions, has real automated test coverage on both sides (13 backend + 11 frontend tests), and has been verified three ways: automated tests against real Postgres, manually clicking through the wired-up frontend against a real running backend end to end (pick an order, resolve a flagged line via a candidate, resolve another via free text, defer and reopen a line, send to ERP, see it marked sent back on the intake screen, change a real setup threshold and see it persist), and a real backend-down/recovery pass across every screen. Not yet done, and out of this phase's scope: Render deployment (T095/T128) and Render-specific failure modes, both only testable once actually deployed.

---

## Phase 13: Extraction, Matching, Confidence, And Real Evals (v0.8)

**Purpose**: Implement the real functionality already narrated in `/thesis`, via the OpenAI API, rather than a newly invented approach. Scope and rationale recorded in `docs/spec-kit/clarifications.md` §7 (superseded on LLM provider by §8: OpenAI, not Claude, for cost reasons using existing hackathon credits).

- [x] T114 Decide v1 input scope: upload files, pasted text, sample import, or a combination. Decided: pasted text plus the existing sample orders. Pasted text is the only "bring your own order" path with real UI and validation today (`order-intake.tsx`'s `OwnOrderPanel`); file upload only ever captured a filename with no content read, and email is a copy-paste address stub. Parsing PDF/Excel bytes is a materially different, separately-scoped problem from extraction quality, which is what this phase is about. Upload/email real support deferred to v1.x.
- [x] T115 Implement input validation for uploaded, pasted, or sample order content before it is sent to the extraction call. `backend/orders/extraction.py` rejects empty text and text over 8000 characters before ever calling OpenAI.
- [x] T116 Implement real extraction via the OpenAI API (`gpt-5.4-mini`, Structured Outputs): turn pasted/uploaded order text into structured line items, replacing the client-side timer simulation. `backend/orders/extraction.py`'s `extract_order` uses a strict JSON schema (header fields plus a `line_items` array) so the response is always well-typed, no manual text parsing. The system prompt includes the real current date so relative delivery phrases ("next Friday") resolve to a concrete `YYYY-MM-DD` instead of passing through free text (a real bug caught by actually pasting an order with a relative date through the UI: it crashed `formatDate` with "Invalid time value" before this fix; `frontend/lib/formatters.ts`'s `formatDate` was also hardened to fall back to the raw string instead of throwing, since a model can still return an unresolvable phrase for a case with no real reference date).
- [x] T117 Implement deterministic normalization helpers for units, quantities, common abbreviations, and product attributes, as the first stage of matching. `backend/matching/pipeline.py`'s `_deterministic_score`: exact customer-part-number and SKU lookups, case-insensitive attribute-value matching against the catalog's structured `attributes`, plus fuzzy name/description similarity as a smaller signal.
- [x] T118 Implement hybrid SKU matching: deterministic attribute/part-number rules first, then OpenAI-assisted semantic matching against the catalog for remaining ambiguity. `match_order_lines` (originally `match_line_item`, renamed when batching was added, see below) skips the LLM call entirely per line when the deterministic top candidate is strong and unambiguous (score >= 92, margin >= 15 over the runner-up); otherwise that line escalates to `gpt-5.4-mini` with the full catalog (small enough, ~46 items, to pass whole) to rank up to 3 candidates. Verified live: a line item whose extracted attributes didn't exactly match the catalog's attribute names still got auto-matched correctly once escalated to the LLM path, and a genuinely ambiguous line (two pressure sensors differing only in bar rating, no way to disambiguate from the source text) correctly stayed in "needs review" with both real candidates in the picker. **Batched after initial ship**: an order's escalated lines are now matched in a single combined OpenAI call instead of one call per ambiguous line (`matching/pipeline.py`'s `match_order_lines` collects every line needing escalation first, then calls `_semantic_match_batch` once for all of them together). Found to matter by reasoning through scale, not by a live bug: the original one-call-per-line design meant a large order with many ambiguous lines was that many sequential round trips, each re-sending the full catalog, which scales badly (linear latency, repeated token cost) and risks hitting a request timeout once actually deployed. Verified live: a 3-line order where every line needed semantic matching completed in ~7.7 seconds total (extraction plus one combined matching call), and a dedicated test (`matching/tests.py`'s `BatchedMatchingTests`) proves both that multiple ambiguous lines share exactly one call and that deterministically-confident lines are excluded from it.
- [x] T119 Implement real per-line confidence scoring from the matching pipeline, and gate routing (auto-approved vs. flagged for review) against the persisted setup-config thresholds from T110. `backend/orders/services.py`'s `create_order_from_pasted_text`: a line auto-matches only if its top candidate's score clears `SetupConfiguration.auto_approve_threshold`; otherwise it's routed to "review-needed" (or "no-match" if nothing plausible was found at all) with candidates populated for the picker. `price_flag_threshold` (a separate rule about requested price vs. catalog price, unrelated to match confidence) is intentionally not wired into this pass: nothing in the live UI renders `OrderException`/`ReadinessCheck` today (confirmed by grep across every component), so building price-flag exception generation now would be unverifiable, dead code. Revisit if/when the summary or waiting-queue screens start surfacing exceptions.
- [x] T120 Keep the confidence score and any internal band classification backend-only; do not add new frontend UI beyond the existing two-signal (clean match / risk flag) model already used by the resolve-or-defer picker. `MatchCandidateSerializer` already excluded `confidence_band`/`score` before this phase (Phase 11); real Phase 13 candidates go through the same serializer, confirmed via a live API response showing neither field present.
- [x] T121 Implement traceability output for SKU match reasons (size, material, standard, unit, synonym, customer part number, catalog attribute) so the existing "why this matched" panel renders real reasons instead of sample-data reasons. Both the deterministic pass and the LLM semantic-match path populate real `proof_items` (kind/label/source-value/catalog-value/supports-match), verified live: a near-miss candidate (same bolt, wrong alloy) showed a real "Material mismatch" reason with both values.
- [x] T122 Implement real eval run generation: run the extraction/matching pipeline against the grounded, labeled sample dataset and compute real extraction accuracy, SKU top-1 accuracy, SKU top-3 recall, auto-approval rate, human correction rate, and false confident match rate. `backend/evals/generation.py`'s `generate_eval_run()` reads `backend/seed_data/sample_orders.json` directly (not live `OrderRecord` rows, so a run is unaffected by whatever visitors have done to the shared demo database), runs each of the 4 sample orders' real pasted text through the actual `extract_order` + `match_order_lines`, and scores the result against each order's `groundTruth`. Persists a real (`is_simulated=False`) `EvalRun`/`EvalMetric`/`EvalFailureCase` via a new `python manage.py run_eval` command, not an API endpoint: unlike order intake, running an eval is not part of the demo experience and spends real OpenAI credit on every invocation (4 extraction calls plus up to 4 batched matching calls per run), so it should not be one click away for every visitor. Deliberately scoped to what the pipeline actually attempts: header/line extraction fidelity and hybrid SKU matching under confidence gating, not the duplicate-line/price-mismatch/missing-unit business rules that exist as onboarding toggles but are never enforced in v1 (see T119) — scoring against those would penalize the pipeline for a capability it was never built to have, so a line whose *only* expected exception categories are those is excluded from the false-confident-matches metric specifically (still counted in human-correction-rate, since a human would genuinely need to look either way). A sample real run: extraction accuracy 51.5%, SKU top-1 accuracy 85.7%, SKU top-3 recall 92.9%, auto-approval rate 62.5%, human correction rate 31.2%, false-confident matches 6.2% (n=16 lines, n=14 SKU-bearing lines for the SKU metrics). Numbers vary run to run since they depend on live, temperature-sampled OpenAI calls; treat single-run numbers as a snapshot, not an exact repeatable score. Running this for real surfaced two further real pipeline gaps (see below) and confirmed the low extraction-accuracy number is mostly a ground-truth-vs-input-format artifact, not a pipeline defect: customer name is never stated anywhere in the raw pasted text for any of the 4 sample orders, nor is a country/state suffix on delivery location (ground truth expects "Augsburg, DE", the text only ever says "Augsburg"), so extraction correctly returns null or the bare city per its own "don't guess" design rather than inventing the rest. Currency is the one field that's *not* uniformly unstated (checked directly against all 4 `originalExcerpt` strings after an adversarial review flagged the original wording here as an overgeneralization): 3 of the 4 orders never state a currency at all, but the LakePort order literally says "Currency USD." in the text, so a currency mismatch on that specific order would be a real extraction gap, not a fair-target problem.

**A note on eval independence, since it matters for how much to trust these numbers**: the extraction/matching pipeline, this ground-truth dataset, and this eval-scoring code were all written by the same AI assistant (Claude, across sessions), with no independent human or model check on any of it until an adversarial review pass (prompted by a direct user question about bias) was run against this specific eval. That review confirmed the `groundTruth` data (`frontend/data/orders.ts`, committed as `9563f46`) predates the extraction pipeline (`backend/orders/extraction.py`, committed as `2170686`, 10 commits later) — ruling out the ground truth being reverse-engineered by watching the pipeline's actual output — and independently re-verified that the false-confident-matches out-of-scope exclusion above is real (grepped: `price_flag_threshold`/`flag_duplicate_lines` are stored and serialized but never read by any routing code) rather than a rationalization, and that the ambiguous-SKU/no-match ground-truth cases are genuine catalog near-collisions, not manufactured softballs. It also caught two real problems, both fixed here: the currency overgeneralization above, and a substring-matching leniency in `_value_found` that could spuriously credit a short value (for example a single-digit pin count) against an unrelated number embedded in free text — tightened to only substring-match values longer than 2 characters against the free-text description, with shorter values checked only against the structured attribute list. What this does *not* rule out: the pipeline's prompts and this ground truth were still authored by the same underlying model across the project's history, so shared blind spots (as opposed to literal answer-key-fitting) can't be fully excluded without a genuinely independent, differently-sourced dataset or human domain-expert review — worth naming as a real v1.x limitation rather than treating these numbers as an independently validated benchmark.
- [x] T123 Define minimum v1 eval thresholds or quality expectations for the sample dataset. Given the small, hand-picked, edge-case-dense sample (16 lines across 4 orders) and real LLM run-to-run variance, exact-percentage gates would be noise; the thresholds that matter: (1) false-confident matches should stay in the single digits, with any hit individually reviewed rather than treated as a pass/fail cliff, since this is the trust-destroying failure mode the whole confidence-gating design exists to prevent; (2) SKU top-3 recall should stay at or above ~90%, since that is the real safety net when top-1 misses (a human still sees the right answer in the picker); (3) SKU top-1 accuracy in the 80s-90s is healthy given several lines are deliberately ambiguous by design; (4) extraction accuracy is not gated numerically at all in v1, since (as found by T122) the ground truth encodes header information not derivable from the input format this pipeline actually accepts (pasted text only, no sender/customer metadata) — tracked qualitatively via failure cases instead of a numeric gate.
- [x] T124 Add real error/recovery states for OpenAI API timeout, rate limiting, and malformed responses, surfaced as specific frontend states rather than silent failure. `POST /api/orders/extract/` returns a 502 with a clear `detail` message if extraction fails outright, before any order is created; the frontend's existing inline-error pattern (`OwnOrderPanel`) surfaces it with no new UI needed. A failed semantic-match call degrades to deterministic-only results instead of failing the whole order (`matching.pipeline.MatchingError` is caught inside `match_order_lines`, not propagated). **Error copy rewritten after live testing**: the original messages were flat/technical ("No line items could be extracted from that text.") or, worse, leaked the raw OpenAI SDK exception text straight into the API response ("Extraction call failed: {exc}"). Rewritten to be specific and actionable (for example, "Couldn't find any order details in that text. Try pasting something like a product, quantity, and unit (for example, \"50 pcs of M8 bolts\").") and the real exception is now logged server-side only (`logger.exception(...)` in `extraction.py`), never shown to the reviewer verbatim.
- [x] T125 Add backend tests or scripts for extraction, normalization, matching, confidence scoring, traceability, and eval generation on the sample dataset. 31 Django tests total (up from 13 at the end of Phase 12): `matching/tests.py` covers the deterministic-confident-skip path, the semantic-match fallback, a failed semantic call still degrading gracefully, the fully-empty-result case, and (added when matching was batched) that multiple ambiguous lines share exactly one combined call while deterministically-confident lines are excluded from it; `orders/tests.py` covers extraction validation, a mocked successful/malformed OpenAI response, the `/api/orders/extract/` endpoint end to end (success-with-mixed-routing and the 502-creates-nothing failure case), the discontinued-part-substitution force-review behavior (both the original stated-identifier case and the LLM-inferred-with-no-stated-identifier case found via T122), the confidence-margin-at-final-approval behavior found the same way, and the reset-demo-data endpoint; `evals/tests.py` covers `generate_eval_run` end to end with a clean match, the out-of-scope-category exclusion from false-confident-matches, and an extraction failure being recorded as a blocking failure case. All mock the OpenAI client, no test calls the real API.
- [x] T126 Decide whether real eval numbers get a lightweight frontend display or stay backend-only/documented. Decided: backend-only, consistent with the Phase 6 decision not to build a numeric eval dashboard (T052). Checked first rather than assumed: `sampleEvalRuns` (`frontend/data/evals.ts`) is not imported or rendered anywhere in the frontend today — not even fetched — so there is no existing display to preserve or extend. The real numbers also need real interpretation to not mislead (the low extraction-accuracy number is a ground-truth-vs-input-format artifact, not a pipeline defect; see T122), which argues against a raw live number on a pitch page with no room for that context. Real eval runs are visible via the existing read-only `GET /api/eval-runs/` endpoint and `python manage.py run_eval`, and are documented here (this file) with what's real, what's simulated/sample-only, and what remains v1.x.

**Found and fixed by actually using the wired-up pipeline, not part of the original T114-T126 scope:**

- The order-intake grid (`/prototype/start`) showed every order ever created, samples and real ones mixed, sorted newest-first, so real test orders pushed the curated 4 samples down and "Bring your own order" kept sinking further as testing accumulated. Fixed by capping that grid to only the 4 seeded samples (filtered by `is_simulated`), moving "Bring your own order" to a fixed, prominent position, and adding a quiet "Looking for an order you already tried? See the full order log." link next to it.
- New **Order log** screen (`/prototype/orders`, linked under "What I built" in the nav): a full tabular history of every order ever created, sample or real, with All/Not sent/Sent filters. No backend change needed, `GET /api/orders/` already returned everything. This is also a real, legitimate feature (an order history/log view) any ops team using this tool would need, not just a demo-testing utility.
- Self-serve **"Reset demo data"** (on the Order log screen, with a confirm step since it's destructive and shared): there is no login, so this is one shared database across every visitor. Deletes every real "bring your own" order and restores the 4 sample orders and setup thresholds to their original state. Two real gaps found by reading `seed_sample_data.py` before building this, not assumed: its setup-configuration step uses `get_or_create`, which silently leaves an already-existing row untouched (thresholds would not actually reset without an explicit force-update), and it never touches `MatchDecision` at all, so a real decide/defer/reopen action taken on a sample order's line during testing would survive a reset and keep showing "Confirmed" instead of "Matched". Both fixed and covered by a dedicated test.
- Three real navigation gaps found by actually clicking through the wired-up app: "View sent order" showed only a bare success checkmark with no order content at all, now shows the real customer/line-item/match data alongside the sent confirmation; the order-summary screen's picker had no "decide later" option (the processing screen's picker did), now consistent between both; and "back to order list" was hardcoded to the intake page regardless of where a reviewer actually came from (for example, from the new Order log), now uses real browser back-navigation (`router.back()`) so it returns to wherever the reviewer started.
- A real discontinued-part-substitution gap found by testing: a line naming a discontinued part's old customer part number could get matched to its active replacement (the semantic-match step reasons its way there from the description) confidently enough to auto-approve silently, with no flag that a substitution happened at all. Fixed in `orders/services.py`'s `_discontinued_replacement_map`: any line whose top candidate is the listed replacement for a discontinued item now always routes to human review regardless of score, with a real "Requested part is discontinued, matched to its replacement" reason attached. Covered by a dedicated test.
- The error-copy rewrite (see T124) and matching being batched into one combined call per order (see T118) both also came from this same pass.
- **Two more real trust gaps found by running T122's real eval against the labeled sample dataset, not by manual testing this time:**
  - The discontinued-substitution guard above only fired when the customer's stated identifier (their part number, or the discontinued SKU itself) matched `_discontinued_replacement_map`. It missed a line that described a discontinued part in free text with no identifier stated at all (the semantic-match step still reasoned its way to the replacement, and silently auto-approved it), and a line where the customer *did* state the old part number but extraction filed it into a generic attribute instead of `customer_part_number`, so the lookup never had anything to match against. Fixed by also flagging any candidate that was matched via the LLM path (`matched_via == "llm"`, i.e. not an exact identifier hit) and whose SKU is *someone's* designated replacement (`orders/services.py`'s `_is_substitution`), independent of whether the customer named the old part explicitly. The same map was also missing catalog items with status `"replacement-available"` (it only checked `"discontinued"`), silently exempting a real item in the sample catalog from the guard entirely — both statuses are excluded from the active-items match pool the same way, so both are now covered.
  - The confidence-margin check that prevents an LLM call from being skipped when a deterministic candidate is strong but has a close runner-up (`CONFIDENT_MARGIN`, T118) was never re-checked at the final auto-approve decision for lines that *did* go to the LLM. A single strong-looking LLM candidate for a line deliberately built to be ambiguous (several near-identical catalog variants) auto-approved anyway, since nothing compared it to its own runner-up. Fixed by applying the same margin check at final approval too (`orders/services.py`'s `_is_confidently_ahead`), not just at the skip-the-LLM-call decision.
  - Both are covered by dedicated tests in `orders/tests.py`, and running the eval again after both fixes dropped false-confident matches from 37.5% to 6.2% on the same sample run.

**Checkpoint**: The core extraction -> hybrid matching -> confidence-gated routing pipeline is real and verified end to end, not just unit-tested: pasted a real order through the actual browser UI against a live backend and OpenAI, got a correct auto-approved match, a correct ambiguous-match escalation to the LLM with two real ambiguous candidates surfaced for human review, a real ERP-ready state once resolved, and it persisted and reloaded correctly from Postgres. Beyond the original scope, the whole workflow around that pipeline (order discovery, reset, navigation, error messages) was hardened by actually using it repeatedly, not just building it once, and running a real eval against the labeled sample dataset (T122) surfaced and fixed two further trust gaps in the discontinued-substitution and confidence-margin logic. Phase 13 is complete.

**Checkpoint**: Backend functionality supports real extraction, hybrid matching, backend-computed confidence, traceability, and evals enough for the core demo, with no new frontend confidence UI and checks that prevent fake confidence.

---

## Phase 14: Deployment And Full-Stack Beta (v0.9)

**Purpose**: Deploy and test the full-stack system before declaring v1.0.

- [ ] T127 Deploy frontend to Vercel.
- [ ] T128 Deploy backend to Render.
- [ ] T129 Provision production Postgres database on Render.
- [ ] T130 Configure environment variables and secret management on Vercel and Render, including the OpenAI API key.
- [ ] T131 Run smoke test for static and narrative routes that do not require API calls.
- [ ] T132 Run smoke test for backend API endpoints.
- [ ] T133 Run full workflow test: open app, import/sample order, review matches, resolve exception, reach ERP-ready state, view eval metrics.
- [ ] T134 Test deployment failure modes: backend unavailable, database unavailable, OpenAI API unavailable/rate-limited, slow eval run, broken document preview, and unavailable calendar/project links.
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
