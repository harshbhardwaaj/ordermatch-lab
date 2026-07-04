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
| What I learned | Summarize public workflow understanding. | Harsh studied inbox-to-ERP automation and article matching. | Continue to workflow. | Small skeleton rows. | Research points render. | Source preview unavailable, keep summarized insight. | No source cards, show compact narrative. | Some research cards absent, core workflow remains. |
| Problem orientation | State the messy-order-email problem in plain words. | The problem is real and specific, not abstract AI framing. | See how I'd solve this for Comena. | n/a, static content. | Reviewer understands the pain point before seeing the workflow. | n/a. | n/a. | n/a. |
| Workflow diagram | Show the shape of the solution before the reviewer touches it. | Most orders never need a person; the fork is the whole idea. | Experience it yourself. | n/a, static diagram, live-measured connectors. | Order comes in, AI-assisted review, CLEAR/NEEDS REVIEW fork, AFTER FIX loop all visible. | n/a. | n/a. | n/a. |
| Order intake | Let the reviewer pick a real order to follow, or bring their own. | The system reduces to one order, one story, at a time. | Review this order. | n/a, static sample cards. | Sample orders and own-order panel render; already-sent orders marked and de-emphasized. | n/a, own-order paste/upload has no failure path in the prototype. | n/a, sample data is always present. | Own-order panel remains usable even if clipboard access is blocked. |
| Processing | Watch the order get read and matched live. | Matching is an inspectable process, not a black box. | Continue to order summary. | The staggered per-line reveal is itself the loading state. | All lines revealed, matched or flagged, banner reflects the outcome. | n/a, purely client-side simulation. | n/a, every sample order has at least one line. | A flagged line can be deferred and revisited without blocking the rest of the reveal. |
| Summary | Show the fully resolved order before it is sent. | Every match has a reason, not just a score. | Send to ERP. | n/a, resolved instantly from prior screen state. | Order fully resolved and ready to send. | Any line still needing a decision blocks the send action with a clear count. | n/a. | The traceability panel opens per line without disturbing the rest of the list. |
| Sent confirmation | Make a completed send feel finished, not just logged. | The order genuinely left the review queue. | Handle what else needs you, or start a new order. | Brief "Sending to the ERP" button state. | Centered animated confirmation with the order reference. | n/a, the simulated action cannot fail in this prototype. | n/a. | n/a. |
| Waiting queue | Prove the system handles more than one order at a time. | Background orders keep moving while the reviewer works one at a time. | Review this order. | n/a, static per session. | Still-open background orders listed with their flagged-item counts. | n/a. | Nothing waiting, reviewer is caught up. | n/a. |
| Engineering thesis | Explain production problems without a long essay. | Extraction, normalization, matching, confidence, evals, onboarding, traceability, graceful degradation. | Jump to evals or setup. | Section skeleton. | Problem cards tied to prototype examples. | One example unavailable. | No examples, show thesis summary. | Some examples visible. |
| Evals | Show how quality would be measured. | Production AI needs measurement. | Run sample eval. | Metric skeleton or progress steps. | Metrics complete. | Eval failed with retry and preserved last results. | No eval runs, offer sample benchmark. | Some charts fail, metric cards remain. |
| Onboarding/setup | Show repeatability of new customer setup. | Customer onboarding is part of the hard problem. | View setup checklist. | Step skeleton. | Catalog, mapping, rules, baseline, readiness steps visible. | Setup import failed with recovery. | No setup yet, offer sample setup. | Some setup steps complete, others blocked. |
| Candidate proof | Connect Harsh's relevant work to Comena needs. | Product proof is backed by selective candidate evidence. | Open relevant project link. | Card skeleton. | Proof cards render. | Link missing or unavailable with fallback. | No approved links, keep section compact. | Some links missing, proof copy remains. |
| Contact / Next step | Make the next step obvious. | The project asks for an internship conversation. | Call or email. | Link check spinner only if needed. | Contact/project links available. | Calendar unavailable, show email fallback. | No calendar selected, use email. | Some links unavailable, contact path still works. |

## P1 Flow

The P1 walkthrough should work in this order:

1. Opening.
2. What I learned.
3. Problem orientation.
4. Workflow diagram.
5. Order intake.
6. Processing.
7. Summary.
8. Sent confirmation.
9. Waiting queue.
10. Evals.

The reviewer should also be able to skip directly from opening to the prototype's problem orientation.

## State Coverage Rules

- Loading state must preserve layout shape where possible.
- Empty state must explain what is empty and what to do next.
- Error state must say what happened, why it matters, and the recovery path.
- Partial state must keep unaffected sections usable.
- Success state must be visible after meaningful actions.
- Simulated actions must be marked as prototype/sample behavior where a user might otherwise infer live automation.
- Table-heavy sections must preserve comparison on desktop and avoid viewport overflow on mobile.
- Errors must be placed near the problem and later implemented with accessible announcement.
