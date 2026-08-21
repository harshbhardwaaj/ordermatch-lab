"""Rate limits for the one endpoint that spends money.

`/api/orders/extract/` is unauthenticated by design — the demo has no login — and
every call spends OpenAI credit on whatever text it is handed. Nothing else in
this API does: the rest reads and writes Postgres rows. So the limit belongs on
that endpoint specifically rather than as a DRF-wide default, which would also
throttle the ordinary page loads a visitor makes while working through an order
and would make the demo feel broken for the person it is meant to impress.

Two windows on purpose. The hourly one stops a burst. The daily one stops a slow
drip that stays politely under the hourly limit and still empties the account
overnight. A visitor genuinely trying the demo pastes a handful of orders and
never touches either.

Keyed by IP (`AnonRateThrottle.get_ident`), not by demo session. The session id is
a client-supplied header (see `common.middleware.DemoSessionMiddleware`) and
rotating it is a one-line loop, so a session-keyed limit is not a limit at all.

Counters live in the default cache, which is LocMemCache, in-process. gunicorn
runs a single worker (see `start.sh`), so its threads share one set of counters.
That worker recycles every ~400 requests and takes the counters with it, so this
bounds abuse rather than forbidding it. Making it exact means Redis, which is a
paid add-on for a demo whose entire exposure is a fixed prepaid balance — the
wrong trade. If the balance ever stops being prepaid, revisit this line first.

Note on the IP behind Render's proxy: DRF reads the full `X-Forwarded-For` chain
as the key when `NUM_PROXIES` is unset, which is what we want here — the chain
includes the client address. Set `NUM_PROXIES` only if that ever needs pinning to
a specific hop.
"""

from rest_framework.throttling import AnonRateThrottle


class ExtractBurstThrottle(AnonRateThrottle):
    """Short window: stops someone scripting the endpoint in a tight loop."""

    scope = "extract_burst"


class ExtractDailyThrottle(AnonRateThrottle):
    """Long window: stops the patient version of the same attack."""

    scope = "extract_daily"
