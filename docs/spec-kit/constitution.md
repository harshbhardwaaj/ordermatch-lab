# OrderMatch Lab Constitution

## Core Principles

### I. Candidate Story Drives The Product

Every screen must strengthen the central message: Harsh studied Comena deeply, understood their order-automation problem, and built something relevant before asking for a chance. The product is not separate from the candidate pitch; the product is the evidence behind the pitch.

This principle exists because the goal is not simply to impress with visuals or technical breadth. The goal is to make a Comena reviewer feel that Harsh already thinks like someone on the team: curious enough to research, practical enough to build, and product-minded enough to connect engineering choices to business pain.

The app must avoid becoming a generic portfolio, resume page, or "AI dashboard" template. It should not lead with broad self-promotion, unrelated credentials, or vague enthusiasm. Any candidate-facing content must connect back to the specific work Comena appears to care about: automating order workflows, handling messy customer data, improving review operations, integrating with ERP-like systems, and building trustworthy AI interfaces.

This should show up in the app through a guided narrative: why the project exists, what was learned about Comena, what problem was chosen, what was built, what engineering tradeoffs matter, and why Harsh is a strong intern candidate for this exact environment.

### II. Product Proof Over Claims

The experience should show competence through the prototype itself. The strongest claims about Harsh should be proven by visible artifacts: a realistic order workflow, messy line items, SKU match suggestions, confidence states, exception handling, ERP readiness checks, evaluation thinking, and selective candidate background tied to the product.

This principle exists because hiring signals are stronger when they are demonstrated rather than asserted. "I understand production AI" is weak on its own. A screen that shows low-confidence SKU matches being routed to human review is stronger. "I care about evals" is weak on its own. A quality dashboard showing extraction accuracy, SKU top-3 recall, false confident matches, and human correction rate is stronger.

The app must avoid empty claims, inflated language, or decorative complexity that does not prove anything. It should not pretend a mocked prototype is a fully deployed production system. Instead, it should be honest about what is built now and intentional about what it demonstrates.

This should show up in the app by making each major section answer a proof question:

- Did Harsh understand the workflow?
- Did Harsh identify the hard technical problems?
- Did Harsh design for trust and review instead of blind automation?
- Did Harsh think about measurement?
- Did Harsh connect his relevant experience to the work?

### III. Trust Before Flash

The UI should feel modern, minimal, premium, and operational. It must earn trust before it tries to impress. Visual polish matters, but only when it makes the workflow feel clearer, more credible, and easier to inspect.

This principle exists because the audience is likely founders and engineers reviewing a serious B2B workflow. A flashy AI landing page can make the project feel shallow. A restrained, sharp, high-signal interface can make the project feel like something a real team might use internally.

The app must avoid generic AI slop: purple gradient overload, vague chat bubbles, excessive glow effects, oversized marketing fluff, fake "agent magic", illegible charts, ornamental cards, and visual drama that hides the workflow. It should also avoid looking bland or unfinished. Minimal does not mean empty; it means every element has a job.

This should show up in the app through strong hierarchy, readable tables, precise status badges, thoughtful spacing, useful microcopy, restrained color, clear navigation, and tasteful interaction states. The viewer should feel that the same person who designed the UI also understood the operational risk behind the product.

### IV. UX Must Cover Reality, Not Just Happy Paths

Every meaningful screen or section must consider loading, success, error, empty, and partial states. The product must show how it behaves when data is missing, confidence is low, a section fails, an action is simulated, or the user takes a non-ideal path.

This principle exists because production trust is built in edge cases. A beautiful happy path can be generated quickly, but real users notice when nothing happens after a click, when an error is vague, when an empty dashboard feels broken, or when a slow action gives no feedback. For an AI order-automation product, these UX details are not cosmetic; they are part of the safety model.

The app must avoid blank screens, silent failures, vague "something went wrong" errors, unclear disabled buttons, endless spinners, and UI states where the user cannot tell whether an order is safe to approve. It must not hide AI uncertainty or make risky automation feel falsely complete.

This should show up in the app through skeleton states for large loading sections, inline spinners for small actions, progress or step indicators for longer simulated operations, useful empty states, specific error messages, retry options, low-confidence flags, blocked ERP-readiness states, and section-level graceful degradation.

### V. Frontend First, Functionality Layered In

The first milestone should be a polished, clickable frontend using realistic mock data. This is a strategic choice, not a shortcut. The frontend is where the story, workflow, trust model, uncertainty model, and review loop become visible before deeper backend functionality exists.

This principle exists because the immediate deliverable is a link Comena can open. The first version must earn attention quickly. A partially functional backend with a weak story will not do that. A strong frontend prototype can communicate product judgment, engineering priorities, and user workflow clearly, then become the scaffold for real extraction, matching, and eval functionality later.

The app must avoid pretending mocked interactions are real production automation. It should also avoid overbuilding backend pieces before the product flow, data model, and interaction design are coherent. Functionality should be layered in once the visible workflow is strong enough to justify it.

This should show up in the build sequence:

1. Define story, specification, and design system.
2. Build polished static/clickable screens with realistic data.
3. Add interactive state changes such as accepting matches, resolving exceptions, and reaching ERP-ready state.
4. Add simulated upload/import/eval flows.
5. Add real extraction, matching, evaluation, or backend capabilities when the product surface is ready.

### VI. Comena-Specific, Later Adaptable

The first version should feel intentionally built for Comena, but the underlying story and product concept should be adaptable to similar distributors, manufacturers, ERP consultants, procurement automation teams, and vertical AI companies.

This principle exists because specificity is what makes the project compelling. A broad "AI order automation app" would feel like a portfolio exercise. A product that speaks directly to Comena's likely workflow shows research and initiative. At the same time, the project should not trap itself in one company's wording so tightly that it cannot later be repitched or generalized.

The app must avoid two failure modes. It must not be so generic that Comena cannot tell it was built with them in mind. It must also not imply access to private Comena systems, customers, or internal data. The project should be clearly research-informed, not pretending to be an insider product.

This should show up in the app by using Comena-relevant framing in the opening story and workflow, while keeping the product language modular: B2B order automation, industrial distributors, manufacturers, purchase orders, RFQs, SKU catalogs, ERP readiness, exception review, and evals. The result should feel like "built for Comena first" and "adaptable to adjacent companies later."

### VII. Engineering Thesis Must Stay Visible

OrderMatch Lab exists to make the hard engineering problems behind B2B order automation visible, not just to present a beautiful interface. The polished frontend is the delivery surface; the deeper thesis is that reliable AI order automation depends on extraction, normalization, retrieval, confidence, validation, review loops, and evaluation working together.

The app must keep the following engineering problems central:

- **Order extraction**: Convert messy purchase orders, RFQs, emails, pasted text, PDFs, spreadsheets, and semi-structured documents into structured order data such as customer, PO number, delivery date, line items, quantities, units, prices, customer part numbers, and notes. The hard part is that every customer sends documents differently.
- **Line-item normalization**: Preserve the original customer text while interpreting abbreviations, typos, units, product attributes, and multilingual terms. For example, "hex bolt m8x40 inox qty 500" needs to become understandable without losing the original wording that a human may need to inspect.
- **SKU matching**: Match customer-described products to the seller's internal catalog. Exact string matching is too brittle, while pure semantic matching can be dangerously overconfident. The system must expose the matching problem as a serious retrieval and ranking challenge.
- **Confidence scoring**: Distinguish high-confidence matches from medium-confidence review cases, low-confidence blocked cases, and no-match cases. Confidence is a product and safety feature, not just a number.
- **Exception routing**: Treat uncertainty as something to route, not hide. Missing units, ambiguous SKUs, discontinued products, price mismatches, duplicate lines, unclear delivery dates, and multiple plausible matches should become actionable review items.
- **ERP readiness validation**: An extracted order is not ready simply because text was parsed. The system must validate that all ERP-required fields are present and coherent: customer identity, PO number, shipping data, SKU, quantity, unit, price, delivery terms, and blocking exceptions.
- **Evaluation harness**: The product must communicate that production AI needs measurement. Relevant metrics include extraction accuracy, SKU top-1 accuracy, SKU top-3 recall, human correction rate, auto-approval rate, false confident matches, exception categories, and estimated time saved.
- **Onboarding repeatability**: A likely real-world bottleneck is turning every new distributor or manufacturer onboarding from a bespoke integration project into a repeatable setup flow. Catalog ingestion, field mapping, customer-specific rules, eval baselines, and readiness checks should stay in view.
- **Traceability and explainability**: Users should be able to inspect why a match was suggested. A useful system says what matched: size, material, standard, unit, customer part number, synonym, or catalog attribute. Operational users will not trust black-box automation for business-critical orders.
- **Graceful degradation**: The app should model production resilience. If document preview fails, extracted fields should still be usable. If eval charts fail, order review should still work. If SKU matching is unavailable, the queue should remain visible with clear recovery.

These problems do not all need to be solved in the first version. They must, however, remain visible in the story, UI, data model, and planning so the project does not collapse into a polished but shallow demo.

## Constraints

- The app should be deployable as a clean public link, likely through Vercel.
- The first build should prioritize frontend polish, story, UX, and realistic mocked workflows.
- No private customer data should be used.
- Mock data should be grounded in public research but can be synthetic where real B2B order data is unavailable.
- The project should stay clean and understandable in GitHub.
- No commits should include Codex/OpenAI/AI co-author attribution.
- No implementation should begin before the spec, plan, and tasks are confirmed.

## Quality Standards

Done well means:

- A Comena reviewer understands the project's relevance within a few minutes.
- The app makes Harsh look like someone who can think like a product engineer, not just a prompt/demo builder.
- The interface feels polished enough to send to founders without apology.
- The prototype demonstrates production-minded AI thinking: confidence, exceptions, review loops, evals, and ERP readiness.
- The experience includes only relevant CV/project material, mapped to what Comena likely needs.
- The UX avoids blank screens, silent failures, vague errors, and confusing next steps.
- A reviewer can understand the engineering problems being explored, not only the screens being shown.
- The app makes clear that AI automation is only trustworthy when uncertainty, validation, and measurement are designed into the workflow.
- The project shows why a frontend-first prototype is still serious engineering work: it makes workflow state, failure modes, evals, and human review legible before deeper functionality is added.

## Governance

The following require explicit approval before changing:

- The central positioning: candidate pitch plus product prototype.
- The frontend-first strategy.
- The target audience: Comena first, later adaptable.
- The design direction: modern, minimal, premium operational SaaS.
- The core product workflow: order/RFQ intake -> extraction -> SKU matching -> exception review -> ERP-ready state -> eval visibility.
- The engineering thesis: extraction, normalization, SKU matching, confidence, exception routing, ERP readiness, evals, onboarding repeatability, traceability, and graceful degradation.
- Any move from planning/design into implementation.
- Any commit/push.

**Version**: 1.0 | **Date**: July 2, 2026
