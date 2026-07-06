# OrderMatch Lab

A candidate pitch wrapped around a working product prototype, built for [Comena](https://comena.com), a YC company doing AI-assisted B2B order automation.

The prototype demonstrates the workflow Comena's product likely needs: reading a messy purchase order, matching line items to a catalog, showing confidence, routing uncertain lines to a person, and sending clean orders to an ERP. Around it is a guided narrative explaining the problem, the engineering decisions behind it, and why I built it this way.

## Try it

- Live demo: not yet deployed, add a Vercel link here before sending this out
- Local: see Local Development below

## Walkthrough map

- `/`: opening, Comena-specific framing
- `/prototype/workflow`: the workflow diagram (order in, AI-assisted review, then ready for ERP or a human reviews)
- `/prototype/start` to `/prototype/processing/[orderId]` to `/prototype/summary/[orderId]`: pick a sample order, or paste/upload your own, watch it get read and matched live, resolve flagged lines, send to the ERP
- `/prototype/waiting`: background orders that finished processing while you were reviewing one
- `/prototype/setup`: the repeatable customer onboarding flow: connect catalog, map fields, teach it customer language, set thresholds, run a baseline check, go live
- `/thesis`: "How it works," a 7-slide interactive walkthrough of the engineering behind matching, confidence, and evals, each grounded in real published research (see `docs/research/engineering-thesis-sources.md`)
- `/proof`: relevant background: AI classification work at ALEVOR, an AI Investment Analyst tool, a CV-JD Fit Scorer, and TUM coursework
- `/contact`: book a call, email, or call directly

## What's real vs. simulated

This stays honest about what's actually wired up versus still simulated:

- Real: the order review workflow (`/prototype/start`, `/processing`, `/summary`, `/waiting`) and the setup flow's rules/thresholds now run against a real Django + Postgres backend (`backend/`), not local mock data. Picking an order, resolving a flagged line (by candidate or free text), deferring/reopening it, sending an order to the ERP, and changing an auto-approve threshold all genuinely persist, verified by clicking through the app end to end against a real running server. The candidate proof links are real too: AI Investment Analyst and CV-JD Fit Scorer are live deployed tools, not mockups.
- Simulated: the match candidates and their "why this matched" reasoning are still grounded synthetic data seeded into Postgres, not computed by a real matching pipeline. Order extraction from pasted/uploaded text is still a fixed client-side timer that always resolves to the same sample order regardless of input. Real extraction and matching via the Claude API, backend-computed confidence, and real eval computation are still ahead (see `docs/spec-kit/tasks.md`, Phase 13).
- Not yet deployed: the backend runs and is tested locally (real Postgres, an automated test suite) but isn't on Render yet, so running the frontend locally now requires the backend running locally too (see Local Development below).

## Tech stack

- Frontend: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- Backend: Django + Django REST Framework, Postgres (see `backend/README.md`), targeting Render for deployment. Scaffolded, tested, and called by the frontend locally; not yet deployed.

## Local Development

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

### Backend (required for the order review and setup flows)

`/prototype/start`, `/processing`, `/summary`, `/waiting`, and `/prototype/setup`'s
rules step now call a real backend. See `backend/README.md` to set up
Postgres and run the Django API locally, then point the frontend at it
with `frontend/.env.local`:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

The rest of the app (`/`, `/thesis`, `/proof`, `/contact`, the workflow
diagram) doesn't need the backend at all.

## Project docs

`docs/` has the full process behind this project: `docs/spec-kit/` for the specification, plan, and task breakdown, `docs/design-system/` for visual direction, component rules, and copy principles, `docs/research/` for the research grounding the claims made in `/thesis`, and `docs/story-bank-harsh.md` for the source material behind the candidate proof section.

## Screenshots

Not yet added. Before sending this externally, capture the opening screen, the processing screen mid-match, the summary screen's "why this matched" panel, and one `/thesis` slide (the confidence threshold slider).
