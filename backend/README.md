# OrderMatch Lab — Backend

Django + Django REST Framework + Postgres. Deployed on Render at
`ordermatch-backend.onrender.com`. Handles real order extraction, hybrid
SKU matching, confidence-gated routing, and eval generation, all via the
OpenAI API, called only from backend endpoints, never from the browser.

## Render configuration

Both commands live in the repo, not the dashboard, because both are
load-bearing and neither is discoverable from a web form when a deploy breaks.

| Render setting | Value |
| --- | --- |
| Root Directory | `backend` |
| Build Command | `./build.sh` |
| Start Command | `./start.sh` |

The commands are relative to the root directory, not the repo root.

`start.sh` runs one gunicorn worker on threads, caps the glibc malloc arenas,
and recycles the worker periodically. The instance is 512 MB and a single
pasted order used to peak near that; see the comments in the file, and
`matching/embeddings.py`, for what the memory is actually spent on.

## Local development

Requires Python 3.11+ and a local Postgres server.

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create the local database (once):

```bash
sudo -u postgres psql -c "CREATE ROLE ordermatch LOGIN PASSWORD 'ordermatch_dev_pw';"
sudo -u postgres psql -c "CREATE DATABASE ordermatch_dev OWNER ordermatch;"
```

Copy `.env.example` to `.env`, add a real `OPENAI_API_KEY`, and adjust
`DATABASE_URL` if your local Postgres setup differs from the default
(`postgres://ordermatch:ordermatch_dev_pw@localhost:5432/ordermatch_dev`).

Run migrations and load the grounded sample data:

```bash
python manage.py migrate
python manage.py seed_sample_data
```

Start the server:

```bash
python manage.py runserver
```

Run the test suite:

```bash
python manage.py test
```

## API endpoints

All under `/api/`:

- `GET /api/orders/` — order list (light shape)
- `GET /api/orders/<id>/` — order detail, with nested line items, exceptions, readiness checks, and match candidates
- `POST /api/orders/extract/` — real extraction + hybrid matching from pasted order text
- `POST /api/orders/<id>/send-to-erp/`
- `POST /api/orders/reset-demo/` — resets the caller's own demo session back to the 4 sample orders (see "Per-visitor demo data" below)
- `GET /api/catalog-items/`, `GET /api/catalog-items/<id>/`
- `GET /api/setup-configuration/`, `PATCH /api/setup-configuration/<id>/` — auto-approve threshold, price-flag threshold, rule toggles
- `GET /api/eval-runs/`, `GET /api/eval-runs/<id>/`
- `POST /api/line-items/<id>/decide/`, `/defer/`, `/reopen/`
- `POST /api/exceptions/<id>/resolve/`

Match candidates deliberately omit `confidence_band` and `score` from
API responses — those stay backend-internal. Don't add them to
`matching/serializers.py`'s `MatchCandidateSerializer` without checking
that decision first.

Django admin is at `/admin/` — create a superuser with
`python manage.py createsuperuser` to browse seeded data directly.

## Running a real eval

```bash
python manage.py run_eval
```

Runs the actual extraction and matching pipeline against the 4 labeled
sample orders and scores the result. Makes real OpenAI API calls and
spends real credit, not something to run casually.

## Per-visitor demo data

There's no login, but each visitor's browser is tagged with an id (an
`X-Demo-Session-Id` header the frontend stores in `localStorage` and
resends itself, see `common/middleware.py`'s `DemoSessionMiddleware`)
the first time it hits the API. A cookie was tried first, but WebKit
(Safari, and every browser on iOS, which all use WebKit under the hood)
unreliably dropped a cross-site cookie between requests, so this uses a
plain header instead, which isn't subject to any browser's cookie
policy. Every order, decision, and setup-configuration row is scoped to
that id, so no visitor ever sees another visitor's orders or threshold
changes — a new device or cleared storage just starts a fresh session
with its own copy of the 4 sample orders (cloned from a global
template, see `orders/services.py`'s `ensure_session_samples`).
"Reset demo data" only ever resets the caller's own session.

## Regenerating seed data

`seed_data/*.json` is generated from `frontend/data/*.ts`. If that
frontend data changes, regenerate with:

```bash
node --experimental-strip-types scripts/export_frontend_data.mjs
python manage.py seed_sample_data
```

## Environment variables

See `.env.example`. `OPENAI_API_KEY` is read by backend code only,
never exposed to frontend code or the browser.
