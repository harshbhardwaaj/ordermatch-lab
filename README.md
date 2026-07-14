# OrderMatch Lab

A working product prototype, built by Harsh Bhardwaj in response to [Building Radar](https://buildingradar.com)'s case challenge.

The prototype reads a messy purchase order, matches line items to a catalog, shows confidence, routes uncertain lines to a person, and sends clean orders to an ERP. Around it is a guided narrative explaining the problem, the engineering decisions behind it, and why I built it this way.

## The case

> Product matching is hard because the catalog makes it hard: **10,000+ items**, the **same solution sold at several quality tiers** (the same screw in different materials, rising durability, rising price), and **superseded products still listed beside their replacements**. The user is willing to teach the system. Find a way for them to correct the AI's suggested match, so future matches take those corrections into account and get steadily better.

The answer here is not a cleverer one-shot matcher. It is a matcher that gets corrected once and stops repeating the mistake **for that customer**.

Every reviewer decision is logged against the customer whose order it was, aggregated into what the matcher reads back, and used twice: as retrieved few-shot examples in the semantic-match prompt (so the model *proposes* better) and as a re-rank of the finished candidate list (so the reviewer *sees* better, even when the LLM ignored them or was never called). Memory is per customer on purpose — "M8 bolt, standard" means a different grade to different buyers. See `backend/matching/memory.py` and `/prototype/customers`.

## Try it

Live: [ordermatch-lab.vercel.app](https://ordermatch-lab.vercel.app)

The backend is a free-tier Render service and sleeps after periods of inactivity. The first request after a while can take 30-60 seconds to wake up; the app shows a loading state explaining this rather than looking stuck.

## Walkthrough map

- `/`: opening, Comena-specific framing
- `/prototype/workflow`: the workflow diagram (order in, AI-assisted review, then ready for ERP or a human reviews)
- `/prototype/start` to `/prototype/processing/[orderId]` to `/prototype/summary/[orderId]`: pick a sample order, or paste your own, watch it get read and matched by a real pipeline, resolve flagged lines, send to the ERP
- `/prototype/waiting`: background orders that finished processing while you were reviewing one
- `/prototype/orders`: full order log across every order, sample or your own, with a self-serve reset. There's no login, but each visitor's browser gets its own isolated copy of the demo data (a locally stored id, not an account) — nobody sees another visitor's orders
- `/prototype/setup`: the repeatable customer onboarding flow: connect catalog, map fields, teach it customer language, set thresholds, run a baseline check, go live
- `/thesis`: "How it works," a 7-slide interactive walkthrough of the engineering behind matching, confidence, and evals, each grounded in real published research (see `docs/research/engineering-thesis-sources.md`)
- `/proof`: relevant background: AI classification work at ALEVOR, an AI Investment Analyst tool, a CV-JD Fit Scorer, and TUM coursework
- `/contact`: book a call, email, or call directly

## What's real vs. simulated

This stays honest about what's actually wired up versus still simulated:

- **Real**: pasting an order runs actual extraction and hybrid SKU matching against the catalog via the OpenAI API, not a client-side timer. Deterministic attribute/part-number rules run first; a single batched OpenAI call handles whatever's left ambiguous for the whole order. Confidence gating decides auto-approve versus human review against real, persisted setup thresholds. Resolving a flagged line, deferring it, sending an order to the ERP, and changing a threshold all genuinely persist against a real Django + Postgres backend. A real eval suite runs the pipeline against a labeled sample dataset and scores it, exposed backend-only, not as a numeric dashboard. The candidate proof links are real too: AI Investment Analyst and CV-JD Fit Scorer are live deployed tools, not mockups.
- **Simulated / not yet real**: file upload and email intake are previews only, both say so directly in the UI rather than pretending. The onboarding setup screen's price-flag, duplicate-line, and non-catalog rule toggles are persisted but not yet enforced in real routing logic.
- **Backend-internal, by design**: the raw confidence score and any band classification are never sent to the frontend. The UI only ever shows two signals: clean match, or needs a person.

## Tech stack

- Frontend: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS. Deployed on Vercel.
- Backend: Django + Django REST Framework, Postgres, OpenAI API (`gpt-5.4-mini`, Structured Outputs). Deployed on Render (see `backend/README.md`).

## Local development

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

If macOS reports an `EMFILE: too many open files` watcher error:

```bash
npm run dev:polling
```

### Checks

```bash
npm run typecheck
npm run lint
npm run build
npm test
```

### Backend

The order review and setup flows call a real backend. See
`backend/README.md` for local Postgres setup and running the Django API,
then point the frontend at it with `frontend/.env.local`:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8010
```

The rest of the app (`/`, `/thesis`, `/proof`, `/contact`, the workflow
diagram) doesn't need the backend at all.

## Project docs

`docs/` has more detail behind this project: `docs/spec-kit/` for the
specification and architecture decisions, `docs/design-system/` for
visual direction, component rules, and copy principles, and
`docs/research/` for the research grounding the claims made in
`/thesis`.
