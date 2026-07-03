# Low-Fidelity Wireframes

**Date**: July 2, 2026
**Purpose**: Lock the first product compositions before UI implementation.

These are structural wireframes, not visual designs. They define hierarchy, comparison surfaces, and where trust states belong.

## Current Design-System Alignment

The structure now follows the approved blue-first light/dark visual system in `docs/design-system/visual-direction.md`.

Key alignment points:

- light mode is the default entry experience, with a small theme toggle available
- dark mode uses the same semantic blue tokens
- the opening screen stays focused on the Comena-specific problem and the `Show me` action
- secondary pages use the left rail with a subtle sidebar toggle for labels
- route changes use understated opacity-only view transitions
- product surfaces still preserve dense operational workflow patterns, responsive table handling, row highlighting, toolbar/filter affordances, and drill-down paths

## Opening

```text
+----------------------------------------------------------------------+
|                                                   [theme icon]       |
+----------------------------------------------------------------------+
|                                                                      |
|                  The email made you curious?                         |
|                  Here's what I built for Comena.                     |
|                                                                      |
|                         [Show me ->]                                 |
|                                                                      |
|          A working prototype. 30 seconds. No signup.                 |
|                                                                      |
|                                      [floating sample order card]    |
+----------------------------------------------------------------------+
```

Rules:

- Product signal appears before candidate biography.
- Comena is named in opening copy.
- `Show me` reaches the prototype in one action.
- The theme toggle is available without distracting from the headline.

## What I Learned

```text
+----------------------------------------------------------------------+
| What I learned                                                       |
+---------------+---------------+---------------+----------------------+
| Manual entry  | Article search| Quote speed   | Onboarding knowledge|
| Inbox to ERP  | Error risk    | Days to mins  | Years of expertise  |
+---------------+---------------+---------------+----------------------+
```

Rules:

- Keep concise.
- Each point must connect to a product screen later.

## Product Prototype Shell

```text
+----------------------------------------------------------------------+
| [rail] | Prototype                                                    |
|        +-------------------------------------------------------------+
| icon   | Selected order: PO-1048                                     |
| icon   | Customer, source, received time, readiness, blockers        |
| icon   | [Review exceptions] [View match reasons] [ERP check]        |
| icon   +-----------------------+-------------------------------------+
| icon   | Original context      | Extracted fields                    |
| theme  | PDF/email text        | PO id, customer, delivery            |
|        | fallback state        | missing/valid flags                 |
|        +-----------------------+-------------------------------------+
|        | Line normalization table                                    |
|        | original text | normalized attributes | qty | unit          |
|        +-------------------------------------------------------------+
|        | SKU match candidates and exceptions                         |
|        +-------------------------------------------------------------+
|        | ERP readiness checklist                                     |
+--------------+-------------------------------------------------------+
```

Rules:

- Original and normalized views stay adjacent.
- Readiness is visible near decision controls.
- Queue remains usable if one selected-order panel fails.
- Queue has search/filter affordances before row data grows.
- Dense tables can scroll horizontally on small screens.
- Rail labels expand only from the subtle sidebar toggle; icons remain enough for quick repeat navigation.

## SKU Match Detail

```text
+----------------------------------------------------------------------+
| Line 03: "hex bolt m8x40 inox qty 500"                              |
+------------------------------------+---------------------------------+
| Suggested SKU                      | Why this matched                |
| SKU-FST-M8-40-A2                   | size: M8x40                     |
| High confidence                    | material: inox -> A2 stainless  |
| [Accept] [Review alternates]       | standard: DIN/ISO family        |
+------------------------------------+---------------------------------+
| Alternates: SKU-FST-M8-35-A2, SKU-FST-M8-40-ZN                      |
+----------------------------------------------------------------------+
```

Rules:

- Do not show a confidence number without reason.
- Alternates make ambiguity visible.
- Accept/reject actions need success and failure feedback.

## Exception Review

```text
+----------------------------------------------------------------------+
| Exceptions                                                           |
+----------------------------------------------------------------------+
| Filter: All | Blocking | Review | Resolved       Bulk: safe actions  |
+--------------+--------------+--------------+------------------------+
| Blocking     | Review       | Resolved     | ERP readiness impact   |
+--------------+--------------+--------------+------------------------+
| Missing unit | Price diff   | Duplicate    | 2 blockers remain      |
| No match     | Ambiguous    |              | [View blockers]        |
+--------------+--------------+--------------+------------------------+
```

Rules:

- Exceptions are categories with recovery actions.
- Zero exceptions should feel like readiness, not emptiness.
- Row-level failure appears next to the affected exception.

## Evals

```text
+----------------------------------------------------------------------+
| Quality and evals                                                    |
+--------------+--------------+--------------+------------------------+
| Extraction   | SKU top-1    | SKU top-3    | False confident matches|
| accuracy     | accuracy     | recall       |                        |
+--------------+--------------+--------------+------------------------+
| Exception category breakdown                                         |
| Human correction rate | Auto-approval rate | Estimated time saved    |
| [Run sample eval] [Open failed cases] [View top-3 recall examples]   |
+----------------------------------------------------------------------+
```

Rules:

- Eval metrics must connect to visible sample cases.
- No eval state must offer a sample benchmark.
- Failed chart state must not hide metric cards.
- Drill-down links reveal the sample lines behind the metric.

## Onboarding And Setup

```text
+----------------------------------------------------------------------+
| Repeatable setup                                                     |
+--------------+--------------+--------------+------------------------+
| Catalog      | Field map    | Rules        | Eval baseline          |
| imported     | mapped       | configured   | created                |
+--------------+--------------+--------------+------------------------+
| Setup readiness checklist: ERP fields, units, customer aliases,      |
| blocked categories, approval thresholds                              |
+----------------------------------------------------------------------+
```

Rules:

- Setup proves onboarding repeatability.
- It should be compact in v0 but visible enough to support the thesis.

## Candidate Proof

```text
+----------------------------------------------------------------------+
| Relevant proof                                                       |
+--------------------+--------------------+----------------------------+
| ALEVOR AI eval     | AI Investment      | CV-JD Fit Scorer          |
| Prompt benchmark   | Full-stack tool    | Document workflow         |
| 320k classifications| Python + Next.js  | PDF + structured output   |
+--------------------+--------------------+----------------------------+
```

Rules:

- Candidate proof stays after product proof.
- Each card maps to a Comena-relevant capability.

## Contact / Next Step

```text
+----------------------------------------------------------------------+
| Next step                                                            |
| Short, direct contact copy for a hiring reviewer.                    |
|                                                                      |
| [Call] [Email] [GitHub] [LinkedIn] [Resume/project links as ready]   |
+----------------------------------------------------------------------+
```

Rules:

- Direct and confident.
- Calendar can wait until Harsh chooses a tool.
- Email fallback must work.
