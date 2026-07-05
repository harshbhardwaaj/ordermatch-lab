# Screen Map

**Date**: July 2, 2026
**Purpose**: Map every major section to its job, proof point, action, and UX states.

## Screen-State Contract

Every screen or independent section must define:

- loading
- success
- error
- empty
- partial

If one section fails, the rest of the page should remain usable.

## Current State Rules

The state plan uses the current blue-first light/dark design system plus the UX product playbook:

- light mode default, dark mode available through the persistent theme toggle
- shared rail navigation on secondary pages, expanded by a subtle sidebar toggle
- native opacity-only route transitions with reduced-motion support
- loading: skeletons for major sections, inline spinners for contained actions
- empty: helpful message plus clear next action
- error: message near the affected area, announced accessibly when implemented
- recovery: retry, fallback, or alternate action
- tables: horizontal scroll or stacked card fallback on small screens
- dense workflow: row hover, filters, compact metrics, and predictable drill-down

## Major Sections

| Section | Goal | Proof point | Primary action | Loading | Success | Error | Empty | Partial |
|---|---|---|---|---|---|---|---|---|
| Opening | Explain why this exists for Comena. | Candidate story drives product. | Show me. | Skeleton for first viewport if assets/data load later. | Reviewer understands Comena-specific project. | Supporting link unavailable with fallback copy. | No supporting proof loaded, still show core pitch. | Prototype link works even if proof badges fail. |
| Problem orientation | State the messy-order-email problem in plain words. | The problem is real and specific, not abstract AI framing. | See how I'd solve this for Comena. | n/a, static content. | Reviewer understands the pain point before seeing the workflow. | n/a. | n/a. | n/a. |
| Workflow diagram | Show the shape of the solution before the reviewer touches it. | Most orders never need a person; the fork is the whole idea. | Experience it yourself. | n/a, static diagram, live-measured connectors. | Order comes in, AI-assisted review, CLEAR/NEEDS REVIEW fork, AFTER FIX loop all visible. | n/a. | n/a. | n/a. |
| Order intake | Let the reviewer pick a real order to follow, or bring their own. | The system reduces to one order, one story, at a time. | Review this order. | n/a, static sample cards. | Sample orders and own-order panel render; already-sent orders marked and de-emphasized. | n/a, own-order paste/upload has no failure path in the prototype. | n/a, sample data is always present. | Own-order panel remains usable even if clipboard access is blocked. |
| Processing | Watch the order get read and matched live. | Matching is an inspectable process, not a black box. | Continue to order summary. | The staggered per-line reveal is itself the loading state. | All lines revealed, matched or flagged, banner reflects the outcome. | n/a, purely client-side simulation. | n/a, every sample order has at least one line. | A flagged line can be deferred and revisited without blocking the rest of the reveal. |
| Summary | Show the fully resolved order before it is sent. | Every match has a reason, not just a score. | Send to ERP. | n/a, resolved instantly from prior screen state. | Order fully resolved and ready to send. | Any line still needing a decision blocks the send action with a clear count. | n/a. | The traceability panel opens per line without disturbing the rest of the list. |
| Sent confirmation | Make a completed send feel finished, not just logged. | The order genuinely left the review queue. | Handle what else needs you, or start a new order. | Brief "Sending to the ERP" button state. | Centered animated confirmation with the order reference. | n/a, the simulated action cannot fail in this prototype. | n/a. | n/a. |
| Waiting queue | Prove the system handles more than one order at a time. | Background orders keep moving while the reviewer works one at a time. | Review this order. | n/a, static per session. | Still-open background orders listed with their flagged-item counts. | n/a. | Nothing waiting, reviewer is caught up. | n/a. |
| Engineering thesis | Explain production problems as a guided walkthrough, not a long essay. | Extraction, normalization, matching, confidence, evals, traceability, onboarding, all grounded in real published research and real production examples, not invented claims. | Next / Back through 7 slides, ending in a link to setup and a references list. | n/a, static per-slide content, no async data. | Reviewer can step through all 7 slides; the matching, confidence, and evals slides are interactive (toggle search modes, drag a review threshold, toggle every-run vs grouped-patterns). | n/a, nothing in this walkthrough depends on a network call. | n/a, all 7 slides always render. | n/a. |
| Onboarding/setup | Show repeatability of new customer setup, as its own dedicated route. | Customer onboarding is part of the hard problem; matching only works once a catalog is connected. | Next / Back through 6 steps (Connect catalog, Map fields, Customer names, Rules and thresholds, Baseline check, Ready to go live), ending in "Finish setup." | n/a, static per-step content. | All 6 steps render; choices made in "Rules and thresholds" and whether "Baseline check" was run carry through honestly to the final readiness summary. | n/a, nothing in this walkthrough depends on a network call. | n/a, all 6 steps always render. | Reviewer can jump back to any earlier step via the step chips without losing progress on later steps. |
| Candidate proof | Connect Harsh's relevant work to Comena needs. | Product proof is backed by selective candidate evidence. | Open relevant project link. | Card skeleton. | Proof cards render. | Link missing or unavailable with fallback. | No approved links, keep section compact. | Some links missing, proof copy remains. |
| Contact / Next step | Make the next step obvious. | The project asks for an internship conversation. | Call or email. | Link check spinner only if needed. | Contact/project links available. | Calendar unavailable, show email fallback. | No calendar selected, use email. | Some links unavailable, contact path still works. |

## P1 Flow

The P1 walkthrough should work in this order:

1. Opening.
2. Problem orientation.
3. Workflow diagram.
4. Order intake.
5. Processing.
6. Summary.
7. Sent confirmation.
8. Waiting queue.
9. Engineering thesis ("How it works" walkthrough).
10. Onboarding/setup, reached from the sent-confirmation screen or from the end of the thesis walkthrough.

The reviewer should also be able to skip directly from opening to the prototype's problem orientation.

## Scope Notes (Phase 6 reality check)

Written after Phase 6 shipped, to keep this table honest:

- **"What I learned" is gone.** The standalone section (and its component) was removed. Its intent, orienting a reviewer on the workflow before going deeper, is now the first slide of the "How it works" walkthrough instead of a separate section.
- **"Evals" is not a standalone section.** It never became a metrics dashboard. It is one slide inside the Engineering thesis walkthrough, demonstrating the grouping method (every run vs. grouped into patterns) rather than showing invented accuracy numbers.
- **Onboarding/setup exceeded the original plan.** Rather than a compact section, it is a full 6-step page, linked both from the guided prototype flow and from the thesis walkthrough.

## Scope Notes (Phase 8 reality check)

Written after Phase 8 shipped:

- **Candidate proof is a scroll-triggered vertical timeline, not static cards.** The "Card skeleton" / "Proof cards render" wording in the Major Sections table above is still directionally accurate (loading and success states exist), but the actual built layout is four numbered timeline stops that fade/slide in via `IntersectionObserver` as the reader scrolls, not a grid of cards. See `docs/design-system/wireframes.md`'s Candidate Proof section and `docs/design-system/component-rules.md` for the layout rule.
- **Four proof points, not three.** TUM Coursework (including Python for Engineering and Data Analysis, in progress) is its own timeline stop alongside ALEVOR AI Classification, AI Investment Analyst, and CV-JD Fit Scorer.
- **The Bomberman Java project was dropped**, not included as a fourth or fifth item. Decided not AI/data-specific enough to earn a place next to the other three.

## Scope Notes (Phase 9 reality check)

Written after Phase 9 shipped:

- **Contact/Next step's "Primary action" and error/empty wording above is stale.** The Major Sections table row still says "Calendar unavailable, show email fallback" and "No calendar selected, use email" — those assumed no calendar link existed yet. A real Calendly link now exists (`https://calendly.com/harshbhardwaaj29/chat-with-harsh`), so the page instead shows calendar, email, and phone as three equal-weight actions, not a primary-plus-fallback pair.
- **GitHub and LinkedIn only, not resume or project links.** Resume has no link ready yet, and the AI Investment Analyst / CV-JD Fit Scorer project links already live on `/proof` and are deliberately not repeated on `/contact`, this page is contact-only. See `docs/design-system/component-rules.md` and `docs/design-system/wireframes.md` for the shipped layout.
- **The shared `RouteShell` placeholder component is gone.** `/contact` was its last remaining usage; it was deleted rather than left as dead code.

## State Coverage Rules

- Loading state must preserve layout shape where possible.
- Empty state must explain what is empty and what to do next.
- Error state must say what happened, why it matters, and the recovery path.
- Partial state must keep unaffected sections usable.
- Success state must be visible after meaningful actions.
- Simulated actions must be marked as prototype/sample behavior where a user might otherwise infer live automation.
- Table-heavy sections must preserve comparison on desktop and avoid viewport overflow on mobile.
- Errors must be placed near the problem and later implemented with accessible announcement.
