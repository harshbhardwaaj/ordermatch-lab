"""Cross-cutting request middleware not specific to any single Django app."""

import secrets

DEMO_SESSION_REQUEST_HEADER = "HTTP_X_DEMO_SESSION_ID"  # WSGI META key for X-Demo-Session-Id
DEMO_SESSION_RESPONSE_HEADER = "X-Demo-Session-Id"


class DemoSessionMiddleware:
    """Tags every request with a per-visitor demo-session id, carried as a
    plain header (X-Demo-Session-Id) rather than a cookie, so each visitor
    gets an isolated copy of the demo data instead of one database shared
    by everyone (see orders.services.ensure_session_samples).

    A cookie was the first approach here, but real testing found it
    unreliable cross-site: the frontend (Vercel) and backend (Render) are
    different registrable domains, and WebKit (Safari, and every browser
    on iOS/iPadOS, which are all required to use WebKit under the hood)
    silently failed to persist a SameSite=None cookie across requests,
    while Chrome on desktop worked fine. A header the frontend stores in
    localStorage and resends itself isn't subject to any browser's
    third-party-cookie policy at all, so this sidesteps the problem
    entirely instead of working around one browser's specific behavior.

    The frontend always sends whatever id it already has; a request with
    none gets a freshly minted one, always echoed back in the response so
    the frontend can persist it for next time.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        session_id = request.META.get(DEMO_SESSION_REQUEST_HEADER) or secrets.token_hex(16)
        request.demo_session_id = session_id

        response = self.get_response(request)
        response[DEMO_SESSION_RESPONSE_HEADER] = session_id
        return response
