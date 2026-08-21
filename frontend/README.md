# OrderMatch Lab Frontend

Next.js frontend for the OrderMatch Lab v0.x product surface.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000` after the dev server starts.

If macOS reports an `EMFILE: too many open files` watcher error, use:

```bash
npm run dev:polling
```

## Checks

```bash
npm run typecheck
npm run lint
npm run build
```

## Branding

This app is built to ship to more than one audience from one codebase: a public
link addressed to nobody, and — when there is one — a private link addressed to
a specific company. Today there is exactly one audience.

| Value | Who it is for | What renders |
| --- | --- | --- |
| `neutral` (default, and currently the only one) | the public link, LinkedIn, anyone not written to directly | own mark, blue palette, no client named anywhere |

Everything brand-specific lives in [`lib/brand.ts`](lib/brand.ts) (copy, marks,
salutation) and the `data-brand` blocks of [`app/globals.css`](app/globals.css)
(palette). Adding an addressed build is an entry in those two files plus an env
var on that deployment. It is never a new branch: a fork drifts, and the bug you
fix on one copy is the bug you still have on the other.

The header comment in [`lib/brand.ts`](lib/brand.ts) explains how to add one and
why the default is the neutral build.

## Version Intent

v0.x is the frontend-first product and story surface. It can use grounded synthetic data and prototype interactions, but it must stay honest about what is sample, simulated, or future API-backed behavior.

v1.0 is the send-ready version. It should be polished, deployed, backend-backed where credibility depends on it, and safe to share without implying private access to anyone's systems or data.
