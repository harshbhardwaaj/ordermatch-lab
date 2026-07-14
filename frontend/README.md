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

## Version Intent

v0.x is the frontend-first product and story surface. It can use grounded synthetic data and prototype interactions, but it must stay honest about what is sample, simulated, or future API-backed behavior.

v1.0 is the send-ready version. It should be polished, deployed, backend-backed where credibility depends on it, and safe to share without implying private access to anyone's systems or data.
