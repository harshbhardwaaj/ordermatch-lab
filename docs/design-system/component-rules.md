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

## UI/UX Pro Max Priorities

Adopt these `ui-ux-pro-max` recommendations during implementation:

- Data-Dense Dashboard for the workbench surface.
- Document Pipeline Dashboard patterns for order/RFQ processing.
- Helpful empty states with a message and clear action.
- Skeleton screens for page or section loading.
- Inline spinners only for small contained actions.
- Accessible errors with `role="alert"` or `aria-live` where relevant.
- Error placement near the failed row, field, chart, or action.
- Error recovery with a retry, fallback, or next step.
- Responsive table handling through horizontal scroll or stacked cards.
- Row highlighting, hover tooltips, and smooth filter transitions.
- Bulk action affordances where repeated review actions would otherwise become tedious.

## Tables

Use tables for order queues, line-item normalization, SKU candidates, exception lists, and eval details.

Required behavior:

- toolbar with search, filters, and view controls when there is enough data
- stable row height where possible
- sticky or repeated key columns on wide dense tables if needed
- sortable columns only when sorting is useful
- visible selected row state
- row hover state for scan confidence
- row-level status, confidence, and exception indicators
- row-level error state for failed refresh or failed action
- optional multi-select and action bar for repeated review tasks
- horizontal scroll wrapper on smaller screens where comparison matters
- stacked card layout on smaller screens where row comparison is less important
- empty state with next step
- partial state when some rows or sections fail

Avoid:

- decorative table styling that reduces scan speed
- hiding original customer text
- turning table actions into ambiguous text links

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

Confidence bands:

- High confidence: safe to inspect and accept
- Review needed: plausible match, human should check
- Blocked: low confidence or required field issue
- No match: catalog item not found or insufficient evidence

Badges should include text and color. Critical states should also use icons.

## Buttons

Use clear command buttons:

- primary: Enter prototype, Accept match, Mark ERP-ready, Run sample eval
- secondary: Review exceptions, View match reasons, Import sample order
- destructive or risky: Reject match, Block order, Reset demo state

Rules:

- icon plus text for important commands
- icon-only only for familiar actions with tooltip and accessible label
- hover and focus transitions should be smooth, roughly 150-300ms
- disabled buttons must explain what is missing nearby
- long-running actions need inline spinner or progress
- success or failure must be visible after click

## Tabs And Segmented Controls

Use tabs for independent product views:

- Queue
- Order review
- Exceptions
- ERP readiness
- Evals
- Setup

Use segmented controls for mode switches:

- Original vs normalized
- Top match vs alternatives
- All exceptions vs blockers
- Demo data vs future API boundary where relevant

Rules:

- active state must be visible without relying only on color
- keyboard focus must move predictably
- switching views should not erase selected order context unless the user resets it

## Sidebars And Navigation

Use a predictable top nav or side anchor navigation:

- Why this exists
- Prototype
- Evals
- Setup
- Candidate proof
- CTA

The reviewer must reach the product prototype from the first screen in one action.

Navigation should support both guided reading and operational jumping. Keep section labels short and stable.

## Review Panels

Order review should use panels for:

- original order context
- extracted structured fields
- line-item table
- match details
- exceptions
- ERP readiness

Rules:

- keep original text inspectable
- keep normalized interpretation adjacent
- make blockers obvious
- allow partial failure of one panel without collapsing the rest
- use skeletons at panel level while loading
- use panel-local errors with retry or fallback when a panel fails
- keep stale data visible with a stale indicator when fresh data fails

## Match Details

Each suggested SKU match should show:

- suggested internal SKU
- confidence band
- match score if used, but do not pretend false precision
- why it matched
- alternate candidates
- missing or conflicting evidence
- required human decision where needed

Interaction rules:

- hovering or focusing a reason chip can explain the matched evidence
- opening match details should not shift the surrounding table layout
- accepting or rejecting a match must give immediate success or failure feedback
- a failed action should leave the previous decision intact

Match reason chips:

- size
- material
- standard
- unit
- customer part number
- synonym
- catalog attribute
- price
- availability

## Exception UI

Exception categories:

- Missing unit
- Ambiguous SKU
- Low confidence
- No catalog match
- Discontinued item
- Price mismatch
- Duplicate line
- Delivery ambiguity
- Required ERP field missing

Each exception should include:

- what happened
- why it matters
- what the reviewer can do next
- whether it blocks ERP readiness

Exception controls:

- group by blocker vs review vs resolved
- expose bulk actions only for safe repeated work
- place row-level save errors directly on the affected exception

## ERP Readiness Panel

Show readiness as a checklist, not a vague score.

Required checks:

- customer identified
- PO/RFQ id present
- delivery location present
- delivery date usable or intentionally unresolved
- every line has SKU or approved exception path
- quantity and unit valid
- price accepted or flagged
- blocking exceptions resolved
- review decisions saved or simulated

States:

- Ready
- Review needed
- Blocked
- Partial data
- Validation unavailable

The final action must stay disabled while blockers remain, with a visible explanation of what is missing.

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

## CTA Components

CTA should support:

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
