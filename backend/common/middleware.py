"""Cross-cutting request middleware not specific to any single Django app."""

import secrets

from django.conf import settings

DEMO_SESSION_COOKIE_NAME = "demo_session_id"
DEMO_SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 365  # 1 year


class DemoSessionMiddleware:
    """Tags every request with a per-browser demo-session id, backed by a
    long-lived cookie, so each visitor gets an isolated copy of the demo
    data instead of one database shared by everyone (see
    orders.services.ensure_session_samples). A new device/browser, or a
    cleared cookie, gets a new session id and a fresh set of sample
    orders; nothing is shared across sessions.

    Deliberately not django.contrib.sessions: there's no session data to
    store server-side beyond this id itself, and a bespoke cookie avoids
    entangling this with the admin login session's cookie settings, which
    need to differ (this cookie is read cross-site, from the Vercel
    frontend calling the Render backend; the admin login session isn't).
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        session_id = request.COOKIES.get(DEMO_SESSION_COOKIE_NAME)
        is_new = not session_id
        if is_new:
            session_id = secrets.token_hex(16)
        request.demo_session_id = session_id

        response = self.get_response(request)

        if is_new:
            response.set_cookie(
                DEMO_SESSION_COOKIE_NAME,
                session_id,
                max_age=DEMO_SESSION_COOKIE_MAX_AGE,
                samesite="Lax" if settings.DEBUG else "None",
                secure=not settings.DEBUG,
                httponly=True,
            )
        return response
