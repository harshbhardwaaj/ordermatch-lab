# Product Story Brief

OrderMatch Lab is not just a demo. It is a polished candidate pitch wrapped around an interactive product prototype.

The web app should persuade Comena that Harsh has studied their product, understood their operational bottleneck, and can build relevant, production-minded software for them.

## Primary Goal

Create a deployed web experience that Comena can open as a link and quickly understand:

- Harsh spent real time researching Comena's business and product direction.
- Harsh understands the hard parts of AI order automation.
- Harsh can think like a product engineer, not just an AI demo builder.
- Harsh has relevant past work and technical judgment worth interviewing.
- The prototype points toward useful work Comena could actually benefit from.

## Positioning

The message is:

> I studied what Comena is building, identified a real workflow bottleneck, and built a focused product prototype around order extraction, SKU matching, exception review, ERP readiness, and evaluation.

Avoid generic claims like "I am passionate about AI" or "I built a RAG app." The experience should show domain understanding through the product itself.

## Audience

Primary audience:

- Comena founders
- Comena engineers
- Comena hiring decision-makers

Secondary audience:

- Similar industrial distributors, manufacturers, ERP consultants, procurement automation teams, and vertical AI startups.

The app should feel Comena-specific enough to be impressive, but not so narrow that it cannot later be adapted for other companies.

## Narrative Shape

Recommended flow:

1. **Opening**
   - State the reason for the project.
   - Make it clear this was built specifically after studying Comena's order automation problem.
   - Establish Harsh as a candidate who builds before asking for a chance.

2. **What I Learned**
   - Briefly summarize the workflow Comena appears to automate:
     inbox / email / PDF / RFQ -> extraction -> line-item understanding -> SKU matching -> exception review -> ERP-ready order.
   - Show that the hard part is reliability, not simply calling an LLM.

3. **Interactive Product Prototype**
   - Present OrderMatch Lab as an AI order operations workbench.
   - Let the viewer inspect a realistic order, extracted fields, SKU matches, confidence, exceptions, and ERP readiness.

4. **The Hard Part**
   - Highlight messy line items, missing SKUs, German/English descriptions, unit ambiguity, low-confidence matches, and evaluation metrics.
   - Show that the system is designed around trust, uncertainty, and human review.

5. **Relevant Past Work**
   - Include a polished, selective version of Harsh's CV.
   - Only show the projects and experience that support the Comena story.
   - Connect each item to a capability Comena likely cares about: full-stack building, data/AI systems, workflow thinking, product judgment, deployment, and reliability.

6. **Call To Action**
   - End with a direct hiring-oriented CTA:
     "If this direction is useful, I would love to intern with Comena and build the real version with your team."

## Product Concept

OrderMatch Lab is an AI order operations workbench for B2B distributors and manufacturers.

Core workflow:

1. Incoming purchase order or RFQ appears in a queue.
2. User opens the order review screen.
3. Original document or email is shown beside extracted structured fields.
4. Each line item receives suggested SKU matches.
5. Confidence and reasoning are visible.
6. Exceptions are highlighted for review.
7. Approved items become ERP-ready.
8. Eval metrics show extraction accuracy, SKU match quality, human review rate, and automation readiness.

## Frontend-First Strategy

Build the polished frontend and story experience first, then add functionality step by step.

Phase 1:

- Narrative landing/product story.
- Clickable, high-quality UI prototype.
- Realistic mocked order, catalog, exception, and eval data.
- Strong design system and interaction polish.

Phase 2:

- Interactive state changes.
- Accept/reject SKU matches.
- Simulated upload/import flow.
- Simulated eval run and status transitions.

Phase 3:

- Real parser or extraction logic.
- Hybrid search / SKU matching prototype.
- Evaluation scripts and generated benchmark data.
- Backend/API layer for persistence, extraction, matching, eval outputs, and secrets once the product surface is ready.

## Mock Data Plan

Truly public B2B purchase-order line-item datasets are difficult to find. Use public sources for grounding, then create realistic synthetic industrial data.

Useful public grounding sources:

- Open Contracting Data Standard: procurement structure, contracting objects, public purchasing context.
- MAVE: product attribute extraction patterns from product pages.
- Products-10K: SKU-level product dataset ideas, although image-oriented.
- Public purchase order templates and industrial catalog examples.

Synthetic data should include:

- Purchase orders and RFQs.
- Industrial products: fasteners, bearings, seals, valves, sensors, cables, motors, fittings.
- Messy descriptions, abbreviations, typos, and multilingual German/English variants.
- Customer part numbers and internal SKUs.
- Quantities, units, prices, delivery dates, and ERP fields.
- High-confidence matches, ambiguous matches, wrong matches, missing catalog items, and blocked ERP-ready cases.

The data should feel real enough to make the UI believable while avoiding private or copyrighted customer information.

## Tech Direction

Preferred stack:

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- lucide-react
- Vercel

Reason:

- Strong for a polished web app.
- Supports both narrative storytelling and dashboard/product UI.
- Easy deployment for a shareable link.
- Good component ecosystem for modern, trustworthy SaaS interfaces.

## Design Direction

Modern, minimal, premium operational SaaS.

The app should feel:

- trustworthy
- sharp
- intentional
- data-aware
- product-grade
- restrained
- modern without looking trendy for its own sake

Avoid:

- generic AI landing-page slop
- purple gradient overload
- vague chatbot framing
- oversized marketing fluff
- decorative UI that gets in the way of the workflow
- fake complexity that does not help the story

Use the product itself as the proof of taste and judgment.

## Success Criteria

The first polished version succeeds if a Comena reviewer can understand within a few minutes:

- what Harsh built
- why it is relevant to Comena
- what workflow pain it targets
- why the UI feels trustworthy
- how the prototype reflects production AI thinking
- why Harsh is worth interviewing

The experience should make the viewer want to click through, inspect the prototype, and ask how it was built.
