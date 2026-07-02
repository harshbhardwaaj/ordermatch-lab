# UX Product Playbook

This playbook distills the UX rules that should guide OrderMatch Lab. Use it before designing or implementing any screen, flow, or interaction.

## Core Principle

Good UI attracts attention. Good UX earns trust.

Do not design only the happy path. Every important screen, section, and action should define what the user sees when things are loading, successful, broken, empty, partial, or uncertain.

## Required Screen States

Every meaningful screen or independent section must handle:

- **Loading**: Data or action is in progress.
- **Success**: The user action completed and the user can tell.
- **Error**: Something failed, with a clear recovery path.
- **Empty**: No data exists yet, with a clear next step.
- **Partial**: Some parts loaded or failed independently while the rest remains usable.

For OrderMatch Lab, this applies to the order queue, document viewer, extracted fields, SKU matches, ERP readiness, eval charts, catalog import, and customer setup screens.

## Loading States

Use the loader that matches the situation.

- **No loader**: Use when the result appears in under 1 second. Avoid flashing spinners.
- **Skeleton screen**: Use for full pages or large content sections where layout is known but data is still coming.
- **Inline spinner**: Use for small contained actions, such as a button click or one row refreshing.
- **Progress bar**: Use when progress is measurable, such as catalog upload, import, parsing, or batch evaluation.
- **Step indicator**: Use for multi-stage work longer than about 10 seconds, such as "Uploading catalog", "Indexing SKUs", "Running match evals", "Preparing report".
- **Optimistic UI**: Use when a reversible action can safely feel instant, then roll back if it fails.

Timing rules:

- Under 1 second: show the result directly.
- 2-5 seconds: a plain spinner can work for small actions.
- Past 5 seconds: add clear text explaining what is happening.
- Past 10 seconds: use progress, steps, or background processing instead of an endless loop.
- If failure is known, show the error immediately. Do not make the user wait through fake progress.

## Error Messages

Never expose raw database, backend, stack trace, or provider errors to users.

Avoid vague messages like "Something went wrong" when the user needs to know the consequence.

A good error message tells the user:

1. What happened.
2. Why it likely happened.
3. What they can do next.

Examples:

- Weak: "Something went wrong."
- Better: "The catalog could not be imported. The file is missing required SKU and description columns. Add those columns or upload a different file."
- Better: "This order cannot be marked ERP-ready yet. Two line items have low-confidence SKU matches. Review the highlighted rows first."

No silent failures. If the user clicks an action and nothing changes, the product feels broken.

## Error Placement

Place errors as close as possible to the issue.

- **Inline errors**: Use for form fields, row-level SKU match issues, missing required data, failed save buttons, and validation problems.
- **Toast notifications**: Use for low-stakes temporary issues, background retries, or non-blocking updates. Do not use toasts for important errors the user may miss.
- **Modals**: Use sparingly, only when the user cannot continue without addressing the issue. If a modal blocks the user, it must give them a clear way forward.

## Forms And Inputs

Forms should prevent frustration before submission.

- Mark required fields clearly.
- Disable submit buttons until required fields are valid, but explain what is missing.
- Validate inline when the user leaves a field or completes a meaningful entry.
- Show character counts when limits exist.
- Pre-fill known information.
- Show requirements as the user types, especially for passwords or structured fields.
- Be forgiving with formatting when possible, such as phone numbers, dates, currency, units, and part-number punctuation.

For OrderMatch Lab, be forgiving with industrial data:

- Treat "pcs", "pieces", "ea", and "unit" as comparable where safe.
- Normalize common separators in part numbers.
- Preserve original user/order text while showing normalized values separately.
- Flag ambiguity instead of silently rewriting business-critical data.

## Empty States

An empty state should not feel broken.

It should explain:

1. Why this area is empty.
2. What it will show once used.
3. What the user can do next.

Examples:

- Order queue: "No orders are waiting for review. Upload a purchase order or import sample orders."
- Eval dashboard: "No eval runs yet. Run the sample SKU matching benchmark to establish a baseline."
- Search: "No results for 'inox bolt'. Try 'stainless bolt' or clear filters."

When emptiness is the goal, such as zero unresolved exceptions, make it feel like an achievement.

## Partial States And Graceful Degradation

Do not let one failed section break the whole page.

Each major section should own its own:

- data loading
- loading state
- error state
- retry action
- empty state

If eval charts fail to load, the order queue should still work. If the document preview fails, extracted fields and SKU matches should still be visible. If fresh data fails, cached or last-known data can remain visible with a clear stale-data indicator.

## Success States

Every important user action needs feedback that it worked.

The confirmation can be large or subtle depending on risk:

- Big confirmation: import complete, eval run finished, order approved, demo workflow completed.
- Small confirmation: row saved, status changed, match accepted, filter applied.
- Natural confirmation: card moves to "Reviewed", row status changes to "Approved", confidence badge updates.

Do not overuse celebration. Reserve delight for meaningful milestones.

## Predictable Patterns

Use familiar layouts where users expect them. Creativity belongs in clarity, polish, motion, and domain-specific insight, not in hiding controls.

- Keep navigation predictable.
- Put primary actions where users expect them.
- Use standard patterns for search, filtering, tables, tabs, forms, upload flows, and review queues.
- Adapt layout by device. Desktop and mobile expectations are not the same.
- Consider internationalization when relevant, including mirrored layouts for right-to-left languages.

For this project, prioritize desktop UX first because the likely user is reviewing orders, catalogs, and ERP fields on a work machine.

## AI Product Safety Rules

AI-assisted products need extra care.

- Do not put secrets or API keys in frontend code.
- Do not expose raw backend, model, database, or provider errors.
- Do not rely on the happy path.
- Add clear error handling for unexpected user behavior.
- Plan for deployment differences: environment variables, auth, database access, external provider downtime, slow networks, and concurrency.
- Make uncertainty visible. Low confidence is not failure; hidden uncertainty is failure.

## OrderMatch Lab UX Checklist

Before calling a screen done, check:

- Does every section have loading, success, error, empty, and partial states?
- Is the user never left staring at a blank screen?
- Does every long-running action explain progress?
- Are errors specific, useful, and placed near the problem?
- Can users recover without guessing?
- Are low-confidence AI outputs visibly marked?
- Can the user inspect original data beside normalized/extracted data?
- Does the interface preserve trust when automation is uncertain?
- Does the screen still work when one section fails?
- Is the primary next action obvious without tutorial text?

