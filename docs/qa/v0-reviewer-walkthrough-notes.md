# V0 Reviewer Walkthrough Notes

**Date**: July 5, 2026
**Reviewer type**: AI self-review
**Scope**: Phase 7 (T065) — the guided walkthrough defined in `docs/qa/reviewer-test-plan.md`
**Status**: Recorded here for Harsh to confirm before T065 is marked complete, same pattern as `v0-first-impression-notes.md` for T039.

## A note on "3 minutes"

The plan document calls this the "3-Minute Busy-Reviewer Walkthrough," but the actual walkthrough (opening through CTA, resolving lines, opening the traceability panel, reading all 7 thesis slides) runs well past 3 minutes end to end. That is expected. The name is shorthand for the design goal, not a stopwatch target: each screen should hook the reviewer into the next one, and the nav rail (with the Phase 7 subsections just built) is the deliberate escape hatch for anyone who would rather skip than follow the story linearly. This review judges pull-to-next-step and skip-ability, not elapsed time.

## Test Method

Walked the full 10-step method from `reviewer-test-plan.md` live in the browser: opening → "Show me" → problem orientation → workflow diagram → "Experience it yourself" → intake (picked the Vogt Hydraulik GmbH PDF order) → processing (resolved the flagged bearing line inline, deferred the elbow fitting with "Decide later") → summary (opened "Why this matched" on the resolved bolt line, resolved the deferred elbow line, sent to ERP) → sent confirmation → "Handle what else needs you" (waiting queue) → "How it works" (all 7 thesis slides, including a nav deep-link test straight to slide 5) → "See why me" (`/proof`) → "Next step" (`/contact`).

## Findings

**Hook chain, step by step**: every screen ends with exactly one dominant next action and no dead ends — Show me → See how I'd solve this for Comena → Experience it yourself → Review this order → (resolve/defer) → Continue to order summary → Send to ERP → Handle what else needs you / Set this up for your own catalog → See why me → Next step. Nothing required guessing what to click next.

**Concepts a reviewer would pick up** (test plan asks for at least five): live extraction/matching (processing screen fields and lines populate and resolve visibly), human-in-the-loop resolution (candidate picker plus "Decide later" defer), traceability (the "Why this matched" panel expands into a field-by-field diff — thread and length, material synonym, fastener standard, part number, unit price), multi-order background processing (the waiting queue's "While you were reviewing, a few more came in" framing plus the "Also processing right now" side panel during processing itself), and hybrid matching / confidence thresholds / evals-as-grouping (thesis slides 3 to 5, each a live toggle or slider, not prose). That is at least six of the eight listed concepts, comfortably over the bar.

**Why "Send to ERP" was or wasn't available**: clearly explained both times — a persistent count ("1 item still needs a decision before this can go to the ERP") that disappears the instant the last line resolves, headline itself changes from "A few things need a decision" to "is ready for the ERP."

**Uncertainty routed to a person, not hidden**: confirmed. Flagged lines show an amber "Needs a decision" badge with real candidates and a free-text override, never an auto-guess.

**Sample vs real disclosure**: present at the points that matter — the setup flow's "Sample walkthrough" pill, and the intake screen's note that a real customer's own catalog would need to be connected first.

**Nav rail as the skip mechanism**: worked as intended at every step. Jumped directly to the evals slide via the new "Keeping it honest" sub-link mid-walkthrough and landed exactly there (Step 5 of 7), then Back/Next still worked normally afterward.

## Pass Signals

- Reviewer would land on Comena/Harsh framing in the first viewport, one CTA, no nav fighting it.
- Each of the 10 method steps has a visible, single next action.
- At least five engineering concepts are demonstrated through interaction, not text.
- The readiness gate and traceability panel both work exactly as narrated in the thesis walkthrough — the demo and the thesis do not contradict each other.
- The nav subsections (Prototype/Setup, and all 7 thesis steps) let a reviewer skip to anything without breaking the guided path for anyone who doesn't skip.

## Gaps And Risks

- `/proof` still shows 4 generic placeholder bullets behind a "v0 preview" pill (known Phase 8 gap, not in this phase's scope).
- `/contact` is still fully placeholder — "Calendar link pending," "Preferred email pending," "Profile link pending." Against the plan's own Final Send-Readiness Checklist ("final CTA links work or have fallback"), this would fail today. This is Phase 9 scope, blocked on Harsh's decision (calendar link vs. email as the primary CTA), not something to fix under Phase 7.
- This is still an AI clicking through scripted events, not a cold human reaction. Copy tone, trust, and whether the pacing actually feels hooking rather than just functional still need a real person's read.
- Did not exercise the free-text "type the correct match" override path on a flagged line, and this particular sample order had no price-flagged line to retest live (that case is covered narratively on thesis slide 4, but not re-verified in the live processing flow this pass).
- Mobile behavior was checked via viewport resize and dispatched events, not an actual touch device.

## Follow-Up

Before treating T065 as fully closed, Harsh should do one real cold pass (or have someone else do it) focused on:

1. Does the pacing actually feel like it's pulling you forward, not just present a working demo?
2. Does skipping via the nav rail feel natural, or does it feel like leaving the story?
3. Confirm whether `/contact`'s "pending" placeholders are acceptable to send as-is or block sending externally (this is the Phase 9 decision already flagged in the last handover).
