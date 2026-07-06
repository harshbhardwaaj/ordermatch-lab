# OrderMatch Lab — Backend

Django + Django REST Framework + Postgres, hosted on Render. See
`docs/spec-kit/plan.md` (Backend Architecture) and
`docs/spec-kit/clarifications.md` §7 for why this exists and how it's
scoped.

Real order extraction and matching (OpenAI API), backend-computed
confidence, real eval computation, and setup-config-driven routing are
Phase 12/13 work (`docs/spec-kit/tasks.md`). This scaffold (Phase 11)
gives read-only API endpoints over the same grounded sample data already
used by the frontend.

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

Copy `.env.example` to `.env` and adjust if your local Postgres setup
differs from the default (`postgres://ordermatch:ordermatch_dev_pw@localhost:5432/ordermatch_dev`).

Run migrations and load the grounded sample data:

```bash
python manage.py migrate
python manage.py seed_sample_data
```

Start the server:

```bash
python manage.py runserver
```

## API endpoints

All under `/api/`:

- `GET /api/orders/` — order list (light shape)
- `GET /api/orders/<id>/` — order detail, with nested line items, exceptions, readiness checks, and match candidates
- `GET /api/catalog-items/`, `GET /api/catalog-items/<id>/`
- `GET /api/setup-configuration/`, `GET /api/setup-configuration/<id>/` — the single real setup configuration row (auto-approve threshold, price-flag threshold, rule toggles), not a per-customer onboarding wizard
- `GET /api/eval-runs/`, `GET /api/eval-runs/<id>/`

All read-only for now. Write endpoints (accept/reject a match, resolve an
exception, update setup config) are Phase 12 work.

Match candidates deliberately omit `confidence_band` and `score` from
this API response — those stay backend-internal per
`docs/spec-kit/clarifications.md` §7. Don't add them to
`matching/serializers.py`'s `MatchCandidateSerializer` without checking
that decision first.

Django admin is at `/admin/` — create a superuser with
`python manage.py createsuperuser` to browse seeded data directly.

## Regenerating seed data

`seed_data/*.json` is generated from `frontend/data/*.ts`. If that
frontend data changes, regenerate with:

```bash
node --experimental-strip-types scripts/export_frontend_data.mjs
python manage.py seed_sample_data
```

## Environment variables

See `.env.example`. `OPENAI_API_KEY` is read by backend code only
(Phase 13 extraction/matching) — never expose it to frontend code or the
browser.
