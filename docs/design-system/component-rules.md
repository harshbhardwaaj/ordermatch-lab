# Component Rules

**Date**: July 2, 2026
**Purpose**: Define component behavior before the frontend scaffold.

## Global Rules

- Every major section must define loading, success, error, empty, and partial states.
- Components should make uncertainty visible.
- Controls should use familiar patterns.
- Icons should come from lucide-react once implementation begins.
- Cards are for repeated items, modals, and framed tools only.
- Page sections should not be styled as floating cards.
- Do not nest cards inside cards.
- Do not expose raw backend, model, provider, or database errors.

## Current Implementation Priorities

Adopt these current design-system priorities during implementation:

- Blue-first light/dark theme tokens from `visual-direction.md`.
- Light mode default with a persistent theme toggle available on every page.
- Subtle ChatGPT/Claude-style sidebar toggle for expanding rail labels.
- Native opacity-only route transitions where supported, with reduced-motion support.
- Minimal inline SVG logo mark in the rail's top slot.
- Guided, one-order-at-a-time sequence for the order-review flow (intake, processing, summary, sent confirmation, waiting queue), not a dense dashboard.
- Ambient, non-interactive side rail (processing screen) to show background activity without competing for attention; collapses below the `lg` breakpoint.
- Helpful empty states with a message and clear action.
- Inline spinners only for small contained actions (for example, the "Sending to the ERP" button state).
- Accessible errors with `role="alert"` or `aria-live` where relevant.
- Error placement near the failed row, field, chart, or action.
- Error recovery with a retry, fallback, or next step.
- Card grids that reflow responsively instead of dense tables.

## Tables

The order-review flow does not use dense tables. Intake and the waiting queue use cards; processing uses a timeline/log; the summary screen uses a resolved list. Reserve dense tables for the future eval-details drill-down (Phase 6), where a real need for row-by-row comparison exists.

If a table is ever added there, required behavior:

- toolbar with search, filters, and view controls when there is enough data
- stable row height where possible
- sortable columns only when sorting is useful
- row hover state for scan confidence
- row-level status indicators
- horizontal scroll wrapper on smaller screens where comparison matters
- stacked card layout on smaller screens where row comparison is less important
- empty state with next step
- partial state when some rows fail

Avoid:

- decorative table styling that reduces scan speed
- hiding original customer text
- turning table actions into ambiguous text links
- reaching for a table where a card list or sequential screen already tells the story better

## Badges And Status Indicators

Status badges must be short and semantically stable.

Suggested status set:

- New
- Extracted
- Review needed
- Blocked
- Ready
- ERP-ready
- Simulated
- Stale
- Failed

Confidence bands (superseded, decision made in Phase 6): the plan below was a 4-badge system (High confidence / Review needed / Blocked / No match) shown persistently on every matched line. This was deliberately not built. Reasoning: the live prototype already has a human in the loop on every uncertain line, so a separate confidence badge next to a decision the reviewer is about to make anyway is redundant, not added trust. The live product screens instead use the simpler binary status already documented below ("Matched" / "Confirmed" / "Needs a decision"). The 4-band concept survives only as an interactive teaching moment: the "How it works" walkthrough's confidence slide lets a reviewer drag a review threshold and watch lines move between auto-approved and sent-to-review, including a case where a risk flag overrides a decent score. That is a one-time illustration, not a persistent UI element.

Original (not built) badge text for reference:

- High confidence: safe to inspect and accept
- Review needed: plausible match, human should check
- Blocked: low confidence or required field issue
- No match: catalog item not found or insufficient evidence

Badges should include text and color. Critical states should also use icons.

## Buttons

Use clear command buttons:

- primary: Show me, Review this order, Continue to order summary, Send to ERP, Run sample eval
- secondary: Start a new order, Use this answer, Why this matched
- destructive or risky: none in the current flow; "Decide later" is a neutral deferral, not a risky action

Rules:

- icon plus text for important commands
- icon-only only for familiar actions with tooltip and accessible label
- hover and focus transitions should be smooth, roughly 150-300ms
- disabled buttons must explain what is missing nearby
- long-running actions need inline spinner or progress
- success or failure must be visible after click

## Tabs And Segmented Controls

The core flow is sequential (intake, processing, summary, sent confirmation, waiting queue), not tab-switched between independent views. Tabs are used locally within a screen, not as the top-level navigation model:

- own-order panel: Paste text, Upload a file, Connect email

Rules:

- active state must be visible without relying only on color
- keyboard focus must move predictably
- switching a local tab should not lose in-progress input in another tab unless the user navigates away

## Sidebars And Navigation

Use the current left rail navigation after the opening screen:

- subtle sidebar toggle
- Start
- What I built
  - Prototype
  - Setup
- How it works
  - Overview, Reading the order, Matching, Knowing when to trust it, Keeping it honest, Making it real, References (one per thesis slide)
- Why me
- Next step
- theme toggle at the bottom

The reviewer must reach the product prototype from the first screen in one action via `Show me`.

Navigation should support both guided reading and operational jumping. Keep section labels short and stable.

Rail behavior:

- collapsed state shows icons only
- expanded state shows icon plus label
- expansion uses the sidebar toggle, not hover
- sub-items (Phase 7) render only under whichever top-level item is currently active, and only while the rail is expanded; every other section stays flat, so the rail never shows more than one open group at a time
- the "How it works" sub-items deep-link into a specific thesis slide via `/thesis?step=N`, since all 7 slides live on one route rather than separate pages
- "Prototype" and "Setup" sub-items highlight individually based on the exact path; the 7 thesis sub-items do not get individual highlighting, since the URL alone cannot distinguish which slide is open
- outside click and `Esc` collapse the rail
- expanded rail pushes content over instead of covering it
- initial open/closed preference is applied before paint to avoid layout flash

## Review Screens

Order review is a sequence of screens, not a single page of panels:

- intake: pick a sample order or bring your own
- processing: header and line items reveal live, each line resolved or deferred inline
- summary: the fully resolved order, with traceability, before it is sent
- sent confirmation: a dedicated moment, not folded into the summary screen
- waiting queue: other orders still needing a decision

Rules:

- keep original customer text visible beside the normalized interpretation on every line, at every stage
- make anything still needing a decision obvious before allowing send
- a flagged line's resolve-or-defer picker should not block the rest of the order from continuing to reveal, or from being reviewed later
- traceability ("why this matched") opens per line without disturbing the rest of the list
- session state (resolutions, sent orders) is client-side only in this prototype; treat any cross-screen persistence as scoped to one browser session, not a real backend

## Match Details

Each flagged line's resolve picker shows:

- up to three ranked catalog candidates (name and SKU)
- one combined "not one of these" slot: type the correct match, or decide later
- for lines already matched or confirmed, an expandable "why this matched" panel built from real proof items (size, material, standard, unit, customer part number, and so on)

Interaction rules:

- picking a candidate resolves the line immediately, with visible before/after feedback (the tag flips to Confirmed)
- deferring a line collapses it back into the list with a "review now" link, not a dead end
- opening the "why this matched" panel should not shift the surrounding list layout
- a candidate list should never grow its own scroll region; three ranked options plus the combined slot is the ceiling

Match reason kinds (used in proof items):

- size
- material
- standard
- unit
- customer part number
- synonym
- catalog attribute
- price
- availability

## Flagged-Line States

The underlying sample data still models specific exception categories (missing unit, ambiguous SKU, low confidence, no catalog match, discontinued item, price mismatch, duplicate line, delivery ambiguity, required ERP field missing), but the UI does not expose a separate browsable exception list. A flagged line has exactly one visible state until resolved: "Needs a decision," with the resolve-or-defer picker attached directly to that line.

Rules:

- do not add a separate exception-category filter or browse UI unless a real need for it shows up; the inline per-line picker is deliberately simpler than the original panel-based plan
- whatever caused the flag should be inferable from the candidates and proof items shown, not hidden behind a category label the reviewer never sees
- a deferred line is not a dead end; it must be reachable again from the same screen or the next one (summary)

## Send-to-ERP Gate

The summary screen's send action is a single gate, not a multi-row checklist panel.

Rules:

- "Send to ERP" only appears once every line is auto-matched, human-confirmed, or resolved with a custom answer
- while anything is unresolved, show a plain count ("N items still need a decision") instead of the send button
- sending is a simulated action with a brief loading state, then a dedicated sent-confirmation screen, not an inline success message
- do not build a separate multi-check readiness panel unless a real need for one shows up beyond the single unresolved-count gate

## Eval Components

Eval cards should show metrics tied to visible examples:

- extraction accuracy
- SKU top-1 accuracy
- SKU top-3 recall
- human correction rate
- auto-approval rate
- false confident matches
- exception categories
- estimated time saved

States:

- no eval runs
- eval queued
- eval running
- eval complete
- eval failed
- stale metrics
- partial metrics

Eval behavior:

- no eval state should offer "Run sample benchmark"
- running state should use progress or steps if it lasts more than a few seconds
- failed chart state should preserve metric cards if those loaded
- chart drill-down can reveal sample rows behind a metric
- stale metrics should remain visible with timestamp and retry

## Candidate Proof Cards

Candidate content is secondary. Each proof card needs:

- capability label tied to Comena relevance
- concise proof
- metric where honest
- link if available
- no broad biography
- no course grades
- no unsupported claims

## Contact / Next-Step Components

The final contact page should support:

- calendar link once chosen
- direct email fallback
- GitHub
- LinkedIn
- resume
- relevant project links

States:

- link available
- copied email success
- missing calendar fallback
- unavailable resume link
- external link failed or blocked

## Accessibility And Keyboard

- every interactive element needs an accessible label
- focus states must be visible
- status should not depend on color alone
- tables should have semantic headers
- buttons should be reachable by keyboard
- dialog focus should be trapped when dialogs are used
- error messages should be announced, not visual-only
- skeleton loaders should not trap focus
- reduced-motion preference should disable unnecessary motion
- tooltips should supplement labels, not replace critical visible text
