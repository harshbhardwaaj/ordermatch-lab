# Visual Direction

**Date**: July 2, 2026  
**Updated**: July 3, 2026  
**Purpose**: Define the approved visual bar for the Comena-facing build.

## Approved Direction

OrderMatch Lab now uses a blue-first SaaS visual system with both light and dark theme variants. The approved direction has pivoted back toward the brighter product direction, while keeping the cleaner storytelling structure and motion polish from the recent landing work.

The current theme should feel:

- direct
- polished
- restrained
- clear rather than heavy
- product-minded
- friendly enough for a non-technical reviewer
- serious enough for an operational workflow
- distinctive enough to make the link memorable

The app should still communicate operational trust. The blue theme is not a license for generic SaaS decoration. It should frame a clear product prototype, not hide it.

## Product Feel

OrderMatch Lab is a candidate pitch wrapped around a product prototype. The visual system should support both sides:

- The opening should feel like a confident entry point after an email.
- The supporting pages should stay simple enough for a non-technical reviewer.
- The product workbench should stay data-dense, inspectable, and explicit about uncertainty.
- The full app should use the same blue token system across light and dark themes.
- Light mode is the default entry experience for now, with dark mode available from the landing page.

## First-Viewport Impression

The first screen must make three facts obvious:

- this was built for Comena
- there is a working prototype to inspect
- the next action is to click `Show me`

Avoid a generic hero, resume intro, or vague AI tagline. The first viewport can use motion, glow, and a small animated product hint, but the message should stay short.

Current approved headline:

> The email made you curious?
> Here's what I built for Comena.

`Comena` receives the blue accent treatment. The rest of both lines stays in the active theme's base text color.

## Color Direction

Use the blue SaaS palette currently implemented in the app.

Light theme:

- app background: `#f3f8ff`
- soft background: `#eaf4ff`
- primary surface: `#ffffff`
- secondary surface: `#f7fbff`
- selected surface: `#eaf2ff`
- subtle border: `#d9e8f7`
- strong border: `#b8d4f2`
- primary text: `#0f172a`
- secondary text: `#64748b`
- muted text: `#94a3b8`
- primary accent: `#2563eb`
- accent hover: `#1d4ed8`
- soft accent: `#dbeafe`
- softer accent: `#eff6ff`
- accent text: `#ffffff`
- success/ready: `#16a34a`

Dark theme:

- app background: `#07111f`
- soft background: `#0b1830`
- primary surface: `#101b2d`
- secondary surface: `#14233a`
- selected surface: `#18345d`
- subtle border: `#203654`
- strong border: `#315077`
- primary text: `#f8fbff`
- secondary text: `#b8c7dc`
- muted text: `#8295b0`
- primary accent: `#60a5fa`
- accent hover: `#93c5fd`
- soft accent: `#1d4e89`
- softer accent: `#102947`
- accent text: `#06101f`
- success/ready: `#22c55e`

Rules:

- Keep the whole app on this blue system for now.
- Support both light and dark themes using the same semantic tokens.
- Keep status colors semantically stable.
- Use color plus text/icon, never color alone.
- Reserve strong blue for action, focus, active state, and key emphasis.
- Avoid introducing a second decorative accent unless it has a semantic job.
- Do not let the app become a purple gradient SaaS page.
- Do not use one dominant hue family without contrast. The palette needs blue, neutral surfaces, clear text, and semantic state colors.

## Typography

Use Plus Jakarta Sans as the implementation font.

- 800 or 700 for the opening and major section headers only
- 600 for panel titles, buttons, tabs, and table headers
- 400 or 500 for body text and dense operational labels
- large type only for the opening and major section headers
- compact headings inside dashboards, review panels, and cards
- concise labels for statuses and fields
- tabular numbers for quantities, confidence, prices, and metrics if available
- no negative letter spacing
- no viewport-scaled font sizes

The narrative pages may use larger type than the future workbench. The product UI should feel efficient.

## Layout Principles

Entry and narrative pages:

- center the first-view message
- keep navigation hidden on the opening screen
- use the left rail after the entry screen, with a subtle sidebar toggle for labels
- keep route labels simple: Start, What I built, How it works, Why me, Next step
- keep supporting pages short, plain, and easy for non-technical reviewers

Product workbench:

- desktop-first
- use data-dense layouts where comparison matters
- keep original text and normalized fields visible near each other
- make tables scannable
- put ERP readiness and exceptions near decision controls
- keep toolbar, filters, and bulk actions predictable
- use the approved blue light/dark tokens, with enough contrast for dense inspection

Responsive enough:

- mobile should never feel broken
- product tables can become stacked review rows
- wide tables can use horizontal scroll when card conversion would reduce comparison quality
- the primary next action must remain visible
- avoid hiding critical status behind menus

## Density

The workflow should be information-rich but calm:

- compact cards for repeated items only
- no cards inside cards
- no decorative page-section cards
- use full-width bands or unframed layouts for narrative sections
- use tables for comparison-heavy review work
- use side panels for traceability and exception detail
- keep KPI cards compact and connected to the visible workflow
- avoid oversized metric tiles that look like a generic analytics template

## Motion

Motion is part of the approved product theme.

Allowed on the opening and narrative shell:

- pulsing button halo
- subtle hero glow or ambient motion
- floating sample order card
- small text or status swaps
- subtle sidebar-toggle navigation rail expansion
- opacity-only route crossfade using native View Transitions

Rules for product screens:

- use motion as feedback, not spectacle
- short transitions for selected rows and state updates
- hover and focus states should transition within roughly 150-300ms
- subtle progress for simulated import/eval flows
- row highlighting on hover is useful for dense tables
- no fake endless loading
- respect reduced-motion preferences

## Visual Proof Points

The interface should visibly support the engineering thesis:

- original text shown beside normalized interpretation
- confidence demonstrated as an interactive threshold, not a persistent badge (decision in Phase 6: a human already reviews every uncertain line, so a separate badge is redundant, not added trust)
- alternate SKU candidates
- match reason chips
- exception categories
- ERP readiness blockers
- evals shown as a grouping method over many runs, not invented accuracy metrics
- onboarding/setup steps
- partial and degraded states

## Navigation

The navigation rail should stay quiet:

- slim product sidebar by default
- wider label sidebar after an intentional sidebar-toggle click
- one 1px border
- no glow, shadow, or backdrop blur
- no numbered badges
- circular or softly rounded icon targets inspired by modern SaaS sidebars
- active route shown with a subtle selected surface and a thin blue edge marker
- minimal blue logo mark in the top slot
- quiet ChatGPT/Claude-style sidebar toggle inside the icon stack
- collapse on outside click or Escape
- expanded labels push the main content over instead of covering it

## Step Lists

Plain-English process lists should use a single-column timeline:

- thin vertical line on the left
- small node per item
- step label plus short plain-language explanation
- no alternating layout
- no boxed card per list item

## Logo Direction

The current mark is an inline SVG built around the core mechanic: loose inputs resolve into a matched, reviewed decision. It should remain simple enough to read at the collapsed rail size and relaxed enough to feel like a creative prototype, not a generic enterprise monogram.

Logo rules:

- use blue as the primary color
- work on both light and dark backgrounds
- avoid generic two-letter monograms
- prefer a circle/seal silhouette with a simple internal matching motif
- keep it SVG-native so it scales cleanly
- preserve clarity at 32-40px

## Anti-Patterns

Do not use:

- generic AI chatbot framing
- oversized marketing sections after the opening
- vague agent magic visuals
- purple gradient overload
- decorative blobs, bokeh, or abstract orbs
- fake complexity that does not clarify workflow
- resume-first content hierarchy
- hidden uncertainty
- blank empty states
- raw technical error text
- tooltips as the only way to understand a critical state
