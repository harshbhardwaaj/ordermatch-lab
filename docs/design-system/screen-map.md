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

## UI/UX Pro Max State Rules

The state plan uses the following `ui-ux-pro-max` guidance:

- loading: skeletons for major sections, inline spinners for contained actions
- empty: helpful message plus clear next action
- error: message near the affected area, announced accessibly when implemented
- recovery: retry, fallback, or alternate action
- tables: horizontal scroll or stacked card fallback on small screens
- dense workflow: row hover, filters, compact metrics, and predictable drill-down

## Major Sections

| Section | Goal | Proof point | Primary action | Loading | Success | Error | Empty | Partial |
|---|---|---|---|---|---|---|---|---|
| Opening | Explain why this exists for Comena. | Candidate story drives product. | Enter prototype. | Skeleton for first viewport if assets/data load later. | Reviewer understands Comena-specific project. | Supporting link unavailable with fallback copy. | No supporting proof loaded, still show core pitch. | CTA works even if proof badges fail. |
| What I learned | Summarize public workflow understanding. | Harsh studied inbox-to-ERP automation and article matching. | Continue to workflow. | Small skeleton rows. | Research points render. | Source preview unavailable, keep summarized insight. | No source cards, show compact narrative. | Some research cards absent, core workflow remains. |
| Order queue | Show incoming POs/RFQs and operational triage. | Order automation starts with messy work intake. | Open primary sample order. | Table skeleton. | Orders visible with status/confidence/exceptions. | Row or queue refresh failure with retry near table. | No orders waiting, offer sample import. | Stale queue visible with warning. |
| Original context | Preserve source order text/document. | Extraction is traceable to original customer wording. | Inspect extracted fields. | Document preview skeleton. | Preview/text visible. | Preview failed, show extracted text fallback. | No source document, explain unavailable sample. | Preview missing but fields remain usable. |
| Extracted fields | Show structured order header and fields. | ERP readiness depends on field completeness. | Review field blockers. | Field skeleton. | Required fields visible. | Field extraction unavailable with retry. | No fields extracted, suggest sample import. | Some fields missing with inline flags. |
| Line normalization | Show original line text beside normalized interpretation. | Normalization is separate from overwriting customer text. | Inspect match candidates. | Table skeleton. | Lines normalized with original text preserved. | Line parsing failed for row, rest remain. | No lines found, show extraction issue. | Some rows parsed, some flagged. |
| SKU matching | Show suggested SKU, alternates, confidence, and reasons. | Matching is ranking plus traceability. | Accept/reject/review match. | Candidate skeleton or inline spinner. | Suggested and alternate matches visible. | Matching service unavailable, keep lines visible. | No match found, route exception. | Some lines matched, some unavailable. |
| Exception review | Make uncertainty actionable. | Low confidence becomes routed work. | Resolve exception. | Exception list skeleton. | Exceptions grouped with blockers. | Save/resolve failure shown inline. | No unresolved exceptions, show ready-state achievement. | Some exception groups fail to load. |
| ERP readiness | Show whether order can safely move downstream. | Approval is validation after extraction. | Mark ERP-ready when allowed. | Checklist skeleton. | Ready or blockers visible. | Validation unavailable, block final action. | No order selected. | Checklist visible with stale/partial warning. |
| Engineering thesis | Explain production problems without a long essay. | Extraction, normalization, matching, confidence, evals, onboarding, traceability, graceful degradation. | Jump to evals or setup. | Section skeleton. | Problem cards tied to prototype examples. | One example unavailable. | No examples, show thesis summary. | Some examples visible. |
| Evals | Show how quality would be measured. | Production AI needs measurement. | Run sample eval. | Metric skeleton or progress steps. | Metrics complete. | Eval failed with retry and preserved last results. | No eval runs, offer sample benchmark. | Some charts fail, metric cards remain. |
| Onboarding/setup | Show repeatability of new customer setup. | Customer onboarding is part of the hard problem. | View setup checklist. | Step skeleton. | Catalog, mapping, rules, baseline, readiness steps visible. | Setup import failed with recovery. | No setup yet, offer sample setup. | Some setup steps complete, others blocked. |
| Candidate proof | Connect Harsh's relevant work to Comena needs. | Product proof is backed by selective candidate evidence. | Open relevant project link. | Card skeleton. | Proof cards render. | Link missing or unavailable with fallback. | No approved links, keep section compact. | Some links missing, proof copy remains. |
| Final CTA | Make the next step obvious. | The project asks for an internship conversation. | Book call or email. | Link check spinner only if needed. | Calendar/email/project links available. | Calendar unavailable, show email fallback. | No calendar selected, use email. | Some links unavailable, CTA still works. |

## P1 Flow

The P1 walkthrough should work in this order:

1. Opening.
2. What I learned.
3. Order queue.
4. Order review.
5. Line normalization.
6. SKU matching.
7. Exception review.
8. ERP readiness.
9. Evals.

The reviewer should also be able to skip directly from opening to prototype.

## State Coverage Rules

- Loading state must preserve layout shape where possible.
- Empty state must explain what is empty and what to do next.
- Error state must say what happened, why it matters, and the recovery path.
- Partial state must keep unaffected sections usable.
- Success state must be visible after meaningful actions.
- Simulated actions must be marked as prototype/sample behavior where a user might otherwise infer live automation.
- Table-heavy sections must preserve comparison on desktop and avoid viewport overflow on mobile.
- Errors must be placed near the problem and later implemented with accessible announcement.
