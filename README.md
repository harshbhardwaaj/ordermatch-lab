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

This is a v0.x frontend-only prototype, and it stays honest about what that means:

- Real: the interaction design, the reasoning behind confidence, matching, and evals (grounded in cited research under `docs/research/`), and the candidate proof links. The AI Investment Analyst and CV-JD Fit Scorer are live deployed tools, not mockups.
- Simulated: order extraction and SKU matching run against a small synthetic, grounded dataset (`frontend/data/`), with client-side timers standing in for a real pipeline. There is no backend yet, nothing here is actually parsed, matched by a model, or sent to a real ERP.
- Planned: a real Django and Postgres backend (see `docs/spec-kit/tasks.md`, Phase 11 onward) to replace the simulated matching with the real thing.

## Tech stack

- Next.js 15 (App Router), React 19, TypeScript
- Tailwind CSS
- No backend yet, frontend-only v0.x as described above

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
```

## Project docs

`docs/` has the full process behind this project: `docs/spec-kit/` for the specification, plan, and task breakdown, `docs/design-system/` for visual direction, component rules, and copy principles, `docs/research/` for the research grounding the claims made in `/thesis`, and `docs/story-bank-harsh.md` for the source material behind the candidate proof section.

## Screenshots

Not yet added. Before sending this externally, capture the opening screen, the processing screen mid-match, the summary screen's "why this matched" panel, and one `/thesis` slide (the confidence threshold slider).
