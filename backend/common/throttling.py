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

The identity has to be ONE address, not the forwarded-for chain, and that is the
whole reason `_ClientIpThrottle` exists. DRF's default `get_ident` joins the
entire `X-Forwarded-For` value into the cache key when `NUM_PROXIES` is unset.
Behind Render — which itself sits behind Cloudflare — that chain carries edge
hops that rotate between requests from the same visitor, so every request hashes
to a different key, every counter starts at one, and the limit never fires. This
was not theoretical: the first deploy of this file throttled nothing at all, on
any number of requests, while the identical code throttled correctly in a local
test where the chain happened to be constant.

`NUM_PROXIES` does not fix it either. That picks a hop counted from the end of
the chain, so it is only stable if the chain is always the same length, which is
the assumption that just failed. Taking the client address directly is stable
whatever the intermediate hops do.

Order below is deliberate. `CF-Connecting-IP` first because Cloudflare sets it to
the real client and overwrites whatever the caller sent, so it is both stable and
not forgeable from outside. The leftmost `X-Forwarded-For` entry is the fallback
and *is* spoofable by a caller who sends their own header, which is worth being
plain about: this raises the cost of draining the balance, it does not make it
impossible. Against a fixed prepaid balance that is the right amount of effort.
Anything stronger means real authentication, which the demo deliberately does not
have.
"""

from rest_framework.throttling import AnonRateThrottle


class _ClientIpThrottle(AnonRateThrottle):
    """Keys on a single client address rather than the whole proxy chain."""

    def get_ident(self, request):
        meta = request.META
        for header in ("HTTP_CF_CONNECTING_IP", "HTTP_TRUE_CLIENT_IP"):
            value = (meta.get(header) or "").strip()
            if value:
                return value

        forwarded = (meta.get("HTTP_X_FORWARDED_FOR") or "").strip()
        if forwarded:
            # Leftmost entry is the original client; everything after it is the
            # proxy chain, which is exactly the part that moves.
            client = forwarded.split(",")[0].strip()
            if client:
                return client

        return meta.get("REMOTE_ADDR")


class ExtractBurstThrottle(_ClientIpThrottle):
    """Short window: stops someone scripting the endpoint in a tight loop."""

    scope = "extract_burst"


class ExtractDailyThrottle(_ClientIpThrottle):
    """Long window: stops the patient version of the same attack."""

    scope = "extract_daily"
