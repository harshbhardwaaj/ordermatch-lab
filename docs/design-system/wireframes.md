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
- the product surface is a guided, one-order-at-a-time sequence (intake, processing, summary, sent, waiting queue), not a dense browsable dashboard

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

## Order Intake

```text
+----------------------------------------------------------------------+
| [rail] | Pick an order to review.                                     |
| icon   | Choose one of the sample orders below, or bring your own.    |
| icon   +----------------------------+----------------------------+   |
| icon   | Vogt Hydraulik GmbH        | MainSpindel Services AG    |   |
| icon   | PO-2026-0142 . PDF         | RFQ-778 . Email             |   |
| theme  | [Review this order]        | [Sent] [View sent order]   |   |
|        +----------------------------+----------------------------+   |
|        | [Use your own order]                                       |
|        | Paste text | Upload a file | Connect email                 |
+--------------+-------------------------------------------------------+
```

Rules:

- Sample orders use real synthetic data, not placeholder rows.
- An already-sent sample order shows a sent badge and switches its action to a secondary "view sent order" link.
- The own-order panel's "connect email" tab is intentionally inert, styled the same as the working tabs, with no disclaimer.
- Own-order matching runs against the same sample catalog; the panel says so in one line, no gate.

## Processing

```text
+----------------------------------------------------------------------+
| [rail] | Reading Vogt Hydraulik GmbH's order          | Also          |
| icon   | 4 of 4 checked  [======================]     | processing    |
| icon   | Customer / Deliver by / Deliver to            | right now     |
| icon   +------------------------------------------------+--------------+
| theme  | o Hex bolt M8x40 A2 stainless        [Matched] | MainSpindel  |
|        | o Deep groove ball bearing 6205-2RS  [Needs a  | . matching   |
|        |   Which did you mean?                 decision]| NordEifel    |
|        |   [ ] candidate A   [ ] candidate B             | . 2 flagged  |
|        |   [type answer] [Use this answer] [Decide later]|              |
|        | o O-ring 10x2 FKM                    [Matched] |              |
+--------------+-------------------------------------------------------+
```

Rules:

- The reveal is a timeline/log, not a boxed form; each line appends as it is checked.
- A flagged line's picker sits inline, capped at three ranked candidates plus one combined "type it / decide later" slot.
- Resolving is non-blocking: later lines keep revealing while an earlier flagged line waits.
- The side rail is ambient only, ticking on its own timers, never competing for attention.

## Summary

```text
+----------------------------------------------------------------------+
| [rail] | Vogt Hydraulik GmbH's order is ready for the ERP.            |
| icon   | Customer / Deliver by / Deliver to                          |
| icon   +----------------------------------------------------------- +
| icon   | Hex bolt M8x40 A2 stainless      [Matched]   Why this matched|
| theme  | Deep groove ball bearing 6205-2RS [Confirmed] Why this matched|
|        | O-ring 10x2 FKM                  [Matched]   Why this matched|
|        +--------------------------------------------------------------+
|        |                        [Send to ERP]                        |
+--------------+-------------------------------------------------------+
```

Rules:

- This is the review form; it shows exactly what will be sent, nothing hidden.
- "Why this matched" expands per line into real proof items (size, material, standard, and so on), not a bare confidence number.
- Any line still needing a decision reopens the resolve picker in place and blocks "Send to ERP" until clear.

## Sent Confirmation

```text
+----------------------------------------------------------------------+
|                                                                        |
|                              [ check ]                                |
|                                                                        |
|                Vogt Hydraulik GmbH's order has been sent.             |
|                     Sent to the ERP as PO-2026-0142.                  |
|                                                                        |
|        [Handle what else needs you]   [Start a new order]             |
|                                                                        |
+----------------------------------------------------------------------+
```

Rules:

- Line items are hidden entirely; this moment is a confirmation, not another data screen.
- The check icon animates in; the moment should read as an event, not a static banner.
- Two real destinations follow: the background queue, or a fresh order.

## Waiting Queue

```text
+----------------------------------------------------------------------+
| [rail] | While you were reviewing, a few more came in.                |
| icon   +----------------------------+----------------------------+   |
| icon   | MainSpindel Services AG    | NordEifel Robotics KG      |   |
| icon   | 3 items need a decision    | 2 items need a decision    |   |
| theme  | [Review this order]        | [Review this order]        |   |
|        +----------------------------+----------------------------+   |
|        | [Start a new order]                                        |
+--------------+-------------------------------------------------------+
```

Rules:

- Only orders that actually have something flagged appear here; anything already sent drops off.
- Clicking an order goes straight to its summary screen, not back through a live reveal, since it already finished in the background.
- Empty state reads "Nothing waiting on you right now. You're all caught up," not a generic empty-list message.

## Evals

Superseded: the metric-dashboard layout below was the original plan, but was deliberately not built. A live-updating numeric dashboard (accuracy percentages, recall, correction rate) would be fake data dressed up as fact, since there is no backend computing it yet. Real product decision, not a shortcut: showing invented precision numbers is worse than not showing them.

What was built instead is one slide inside the "How it works" walkthrough (`/thesis`, step 5, "Keeping it honest"), demonstrating the *method* rather than a fake result:

```text
+----------------------------------------------------------------------+
| Keeping it honest                                                     |
| Prove it keeps working, not just that it worked once.                |
|                                                                        |
| [Every run] [Grouped into patterns]                                  |
|                                                                        |
| Every run:       12 tiles, pass/fail per run                          |
| Grouped view:     Near-neighbor bearing picks     3 runs               |
|                    Missing unit on motor lines     2 runs               |
|                    Price below catalog             1 run                |
+----------------------------------------------------------------------+
```

Rules:

- No invented accuracy percentages. The demo shows the grouping *method* (many individual pass/fail runs collapse into a few recurring patterns), not a fabricated score.
- The toggle between "every run" and "grouped into patterns" is the whole point: it demonstrates why population-level grouping beats reading one run at a time once there is real volume.
- Copy is upfront about the limit: this needs a real population of runs before patterns mean anything, so it is a later-phase capability, not day one.
- Grounded in real published sources (BERTopic clustering, OpenAI's macro-evals cookbook), listed on a references slide at the end of the walkthrough, not asserted as an OrderMatch Lab invention.

## Onboarding And Setup

Built as its own dedicated route (`/prototype/setup`), not a compact section. A 6-step click-through stepper, linked from the end of the guided order flow ("Set this up for your own catalog" on the sent-confirmation screen) and from the "How it works" walkthrough's last content slide:

```text
+----------------------------------------------------------------------+
| Setting up a new customer                          [Sample walkthrough]|
| (1) Connect catalog  (2) Map fields  (3) Customer names               |
| (4) Rules and thresholds  (5) Baseline check  (6) Ready to go live    |
+----------------------------------------------------------------------+
| Connect catalog: spreadsheet / ERP feed / product database cards,     |
| explicit "nothing uploads, nothing leaves your browser" disclosure    |
+----------------------------------------------------------------------+
```

Rules:

- Setup proves onboarding repeatability, illustrated end to end rather than compressed into a summary card.
- Every interactive control in step 1 (catalog source cards) is explicitly labeled as illustrative so a reviewer does not think a real upload is happening.
- The final "Rules and thresholds" and "Baseline check" values a reviewer sets are carried through to the "Ready to go live" summary, so the summary reflects what was actually chosen, not fixed placeholder numbers.

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
