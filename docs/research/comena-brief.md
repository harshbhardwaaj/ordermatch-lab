# Comena Research Brief

**Date**: July 2, 2026
**Purpose**: Ground OrderMatch Lab in current public Comena signals before app implementation.

## Sources Checked

- Comena homepage: https://comena.ai/
- Comena YC company and jobs page: https://www.ycombinator.com/companies/comena/jobs
- Software Engineering Intern role: https://www.ycombinator.com/companies/comena/jobs/QRK75jr-software-engineering-intern
- Fullstack Engineer role: https://www.ycombinator.com/companies/comena/jobs/awYQAOJ-fullstack-engineer
- Forward Deployed Engineer role: https://www.ycombinator.com/companies/comena/jobs/y1pnAQ6-forward-deployed-engineer

## Public Product Understanding

Comena presents itself as an AI platform for B2B order entry automation for wholesalers, distributors, and manufacturers. The public product line is clearly aligned with:

- order and request capture from inbox, email, PDFs, Excel, CSV, attachments, and handwritten notes
- extraction of relevant order information into structured order views
- reliable article or SKU matching against customer product catalogs and item master data
- ERP integration from order intake through downstream processing
- tender or Excel-list remapping across many positions
- order confirmation processing and comparison against supplier orders
- exception detection when confirmations, orders, or item matches differ

This confirms that OrderMatch Lab should stay centered on order extraction, SKU/article matching, exception review, ERP readiness, and evals. It should not drift into a generic procurement intake app, chatbot, or portfolio page.

## Public Workflow Pain

Comena's own site frames the problem around four operational pains:

- qualified sales operations people spend too much time typing data between inbox and ERP
- manual article search is slow and error-prone
- quote/order handling takes days when minutes matter
- experienced workers retire, knowledge leaves, hiring is hard, and onboarding can take years

The strongest OrderMatch Lab angle is therefore not "AI reads a PDF." The stronger angle is:

> Reliable order automation has to preserve human expertise, expose uncertainty, and make item matching repeatable enough that onboarding does not become a bespoke services project every time.

## Public Customer And Proof Signals

Comena lists industrial customers and references such as PIEL, Alexander Paal, ETTINGER, Rubix, Baecker, Elsinghorst, Krumm & Andre, and Hapare. The public testimonials reference:

- 75 percent time savings in order entry
- 95 percent of orders processed through Comena in one customer context
- strong article search performance
- usage by multiple sales users for 99 percent of incoming orders in one customer context
- fast, pragmatic implementation with close customer communication

OrderMatch Lab can use these signals to understand what matters, but it should not repeat customer metrics as if Harsh measured them. The app should say it is research-informed and synthetic, not imply access to Comena systems or customers.

## Public Hiring And Stack Signals

YC job pages confirm that Comena is hiring in Munich for software engineering intern, fullstack engineer, and forward deployed engineer roles. The public role descriptions are especially relevant:

- build full-stack features end-to-end
- use TypeScript frontend and Python backend
- work with customer data, ERP integrations, ERP setup, and custom workflows
- translate customer needs into technical solutions
- prototype, iterate, deploy quickly, and write production-quality code
- stack: Python with Django, TypeScript, Postgres, and latest LLMs

This validates the current plan:

- Next.js/TypeScript frontend first
- future Python/Django/Postgres backend for v1.0
- backend-owned LLM, parsing, matching, eval, persistence, and file-processing work
- onboarding/setup workflow as a real product signal, not a side note

## Product Implications For OrderMatch Lab

OrderMatch Lab should make these things visible early:

- inbox-to-ERP workflow, not isolated document parsing
- original customer text beside normalized fields
- article matching as ranking and confidence, not exact search
- ERP readiness as validation after extraction
- onboarding setup around catalog import, field mapping, customer rules, eval baseline, and readiness checks
- customer-facing implementation thinking, since Comena values ERP setup and custom workflow understanding
- degraded states, because a production workflow cannot break when document preview, matching, or eval charts fail

## Copy And Positioning Rules

Use Comena directly in opening and CTA:

- "I studied Comena's order-entry problem and built OrderMatch Lab around the workflow from inbox to ERP."
- "I would like to intern with Comena and build the real version with your team."

Use reusable product language in the core prototype:

- B2B order automation
- industrial distributors and manufacturers
- RFQs and purchase orders
- SKU catalog and article master
- exception review
- ERP readiness
- evals and traceability

Avoid:

- claiming access to Comena private product, data, customers, code, metrics, or roadmap
- making the project sound like a competitor to Comena
- using customer testimonial metrics as Harsh's own benchmark
- presenting the mock prototype as live production automation
- broad claims about "revolutionizing procurement"
- generic "AI agent" language without workflow proof

## Claims To Avoid

- "Integrated with Comena's ERP."
- "Used Comena customer data."
- "Matched against Comena's catalog."
- "Automates Comena's real workflow."
- "Benchmarked Comena's system."
- "Built a better Comena."

Safer wording:

- "Research-informed prototype."
- "Grounded synthetic order and catalog data."
- "A product thesis around the workflow Comena publicly describes."
- "Designed to make extraction, matching, confidence, exceptions, ERP readiness, and evals visible."

## Open Inputs For Later

- Harsh still needs to choose final CTA links: calendar, email, GitHub, LinkedIn, resume, and project links.
- Candidate proof copy should stay secondary and use only approved story-bank material.
- Before final send, refresh Comena pages once more so the opening and CTA still feel current.
