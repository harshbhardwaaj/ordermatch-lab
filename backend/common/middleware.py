"""Cross-cutting request middleware not specific to any single Django app."""

import secrets

from django.conf import settings

DEMO_SESSION_REQUEST_HEADER = "HTTP_X_DEMO_SESSION_ID"  # WSGI META key for X-Demo-Session-Id
DEMO_SESSION_RESPONSE_HEADER = "X-Demo-Session-Id"


class DemoSessionMiddleware:
    """Tags every request with the demo-session id that scopes its data.

    There are two modes, and which one is right depends entirely on who the
    link goes to.

    **Shared workspace** (SHARED_DEMO_SESSION_ID set, which it is for Building
    Radar). Every visitor lands in the same workspace. Corrections one person
    makes are there for the next person, and for the same person tomorrow: the
    memory is the whole point of this build, and a memory that evaporates when
    you close the tab is not a memory. This is a deliberate choice made because
    the link goes to one company, not to the public. Do not turn it on for a
    link sent to strangers, who would then be able to see and delete each
    other's work.

    **Per-visitor isolation** (the setting empty). Each browser gets its own
    freshly minted id and its own cloned copy of the demo data (see
    orders.services.ensure_session_samples), so nobody can see or reset anyone
    else's. This is what a public demo link needs, and it is what the original
    build shipped.

    The id travels as a plain header rather than a cookie in both modes. A
    cookie was the first approach and real testing found it unreliable
    cross-site: the frontend (Vercel) and backend (Render) are different
    registrable domains, and WebKit (Safari, and every browser on iOS, which
    are all required to use WebKit under the hood) silently failed to persist a
    SameSite=None cookie across requests, while Chrome on desktop worked fine.
    A header the frontend stores in localStorage and resends itself is not
    subject to any browser's third-party-cookie policy at all.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        shared_id = getattr(settings, "SHARED_DEMO_SESSION_ID", "")

        if shared_id:
            # Ignore whatever the browser sends. A stale id in someone's
            # localStorage from a previous visit would otherwise strand them in
            # an old, empty workspace and they would wonder where the data went.
            session_id = shared_id
        else:
            session_id = request.META.get(DEMO_SESSION_REQUEST_HEADER) or secrets.token_hex(16)

        request.demo_session_id = session_id

        response = self.get_response(request)
        response[DEMO_SESSION_RESPONSE_HEADER] = session_id
        return response
