# Visual Direction

**Date**: July 2, 2026
**Purpose**: Define the visual bar before any frontend implementation begins.

## UI/UX Pro Max Inputs

This document uses `ui-ux-pro-max` recommendations from July 2, 2026.

Primary design-system query:

```bash
python3 /Users/harsh/.codex/skills/ui-ux-pro-max/scripts/search.py "B2B industrial AI order automation SaaS operational workbench ERP review dashboard trust dense" --design-system -f markdown -p "OrderMatch Lab"
```

Adopted recommendations:

- style: Data-Dense Dashboard
- product pattern inputs: B2B Service, SaaS General, E-signature / Document Workflow, Analytics Dashboard
- color direction: B2B Service professional navy and neutral gray, with SaaS trust-blue action color and functional status colors
- typography: Plus Jakarta Sans as the first implementation candidate
- effects: hover tooltips, row highlighting, smooth filter transitions, focused drill-down for charts and rows
- UX validation: skeleton loading, helpful empty states, accessible error announcements, recovery paths, responsive table handling

Rejected recommendation:

- Product Review/Ratings Focused. The search returned this as the top pattern, but it does not fit OrderMatch Lab. The product is a workflow review workbench, not a consumer product review or ratings page.

## Product Feel

OrderMatch Lab should feel like a serious AI operations workbench built by someone who understands the workflow. The interface should read as modern, precise, and production-minded, with enough polish to send to a founder without explanation.

Target qualities:

- trustworthy
- sharp
- direct
- data-aware
- calm under uncertainty
- operational rather than decorative
- premium but not theatrical

## First-Viewport Impression

The first screen must make three facts obvious:

- this was built specifically for Comena
- the product thesis is order automation from inbox to ERP
- the primary action is to enter the prototype

Avoid a generic hero, resume intro, or vague AI tagline. The first viewport should use product evidence, workflow language, and a clear CTA.

## Color Direction

Use a restrained operational palette based on the B2B Service and SaaS General `ui-ux-pro-max` results:

- background: `#F8FAFC` or near-white
- primary text: `#020617`
- secondary text: `#64748B`
- surface: `#FFFFFF`
- border: `#E2E8F0`
- primary action: `#0369A1` or `#2563EB`
- success/ready: `#16A34A`
- review/attention: `#D97706`
- blocked/error: `#DC2626`
- simulated/sample: blue-gray or slate
- traceability/eval: muted blue or cyan only as a light accent

Rules:

- Do not let the app become a purple gradient SaaS page.
- Do not use one dominant hue family across the whole experience.
- Keep status colors semantically stable.
- Use color plus text/icon, never color alone.
- Reserve strong color for workflow states, not decoration.
- Do not default to the dark RPA/financial dashboard palette from the search results. Dark mode can come later, but the first Comena-facing version should default to a bright, inspectable workbench.

## Typography

Use Plus Jakarta Sans as the first implementation candidate, matching the `ui-ux-pro-max` SaaS dashboard typography recommendation.

- 800 or 700 for opening and major section headers only
- 600 for panel titles, buttons, tabs, and table headers
- 400 or 500 for body text and dense operational labels
- large type only for opening and major section headers
- dense but readable table text in workflow areas
- concise labels for statuses and fields
- tabular numbers for quantities, confidence, prices, and metrics if available
- no negative letter spacing
- no viewport-scaled font sizes

The product UI should feel efficient. Headings inside dashboards, review panels, and cards should stay compact.

## Layout Principles

Desktop-first:

- likely reviewer is on a laptop or desktop
- use two-column review layouts where they aid comparison
- use data-dense dashboard structure for the product workbench
- keep original text and normalized fields visible near each other
- make tables scannable
- put ERP readiness and exceptions near decision controls
- keep toolbar, filters, and bulk actions predictable

Responsive enough:

- mobile should never feel broken
- product tables can become stacked review rows
- wide tables can use horizontal scroll when card conversion would reduce comparison quality
- primary CTA must remain visible
- avoid hiding critical status behind menus

## Density

The workflow should be information-rich but calm, following the Data-Dense Dashboard recommendation:

- compact cards for repeated items only
- no cards inside cards
- no decorative page-section cards
- use full-width bands or unframed layouts for narrative sections
- use tables for comparison-heavy review work
- use side panels for traceability and exception detail
- keep KPI cards compact and connected to the visible workflow
- avoid oversized metric tiles that look like a generic analytics template

## Motion

Use motion as feedback, not spectacle:

- short transitions for section changes, selected rows, and state updates
- hover and focus states should transition within roughly 150-300ms
- subtle progress for simulated import/eval flows
- row highlighting on hover is useful for dense tables
- chart or row drill-down can use a small focused transition
- no parallax, glow loops, or animated hero effects
- no fake endless loading
- respect reduced-motion preferences when implementation begins

## Visual Proof Points

The interface should visibly support the engineering thesis:

- original text shown beside normalized interpretation
- confidence badges with clear bands
- alternate SKU candidates
- match reason chips
- exception categories
- ERP readiness blockers
- eval metrics and failure modes
- onboarding/setup steps
- partial and degraded states

## Anti-Patterns

Do not use:

- generic AI chatbot framing
- oversized marketing sections after the opening
- vague "agent magic" visuals
- purple/blue gradient overload
- decorative blobs, bokeh, or abstract orbs
- fake complexity that does not clarify workflow
- resume-first content hierarchy
- hidden uncertainty
- blank empty states
- raw technical error text
- tooltips as the only way to understand a critical state
