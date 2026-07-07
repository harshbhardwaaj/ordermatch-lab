# OrderMatch Lab — Backend

Django + Django REST Framework + Postgres. Deployed on Render at
`ordermatch-backend.onrender.com`. Handles real order extraction, hybrid
SKU matching, confidence-gated routing, and eval generation, all via the
OpenAI API, called only from backend endpoints, never from the browser.

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

There's no login, but each visitor's browser is tagged with a long-lived
cookie (`common/middleware.py`'s `DemoSessionMiddleware`) the first time
it hits the API. Every order, decision, and setup-configuration row is
scoped to that cookie, so no visitor ever sees another visitor's orders
or threshold changes — a new device or a cleared cookie just starts a
fresh session with its own copy of the 4 sample orders (cloned from a
global template, see `orders/services.py`'s `ensure_session_samples`).
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
