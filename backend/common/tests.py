"""Security regressions for the demo-session middleware.

These are the tests for security-review.md finding 4: the session header was
trusted verbatim, so an oversized value 500'd every endpoint and a novel value
cloned sample data. Both are reachable by anyone once the site is public.
"""

from django.test import RequestFactory, TestCase, override_settings

from common.middleware import (
    DEMO_SESSION_RESPONSE_HEADER,
    DemoSessionMiddleware,
)


@override_settings(SHARED_DEMO_SESSION_ID="")
class DemoSessionHeaderValidationTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.mw = DemoSessionMiddleware(lambda request: _EchoResponse(request))

    def _session_for(self, header_value):
        headers = {"HTTP_X_DEMO_SESSION_ID": header_value} if header_value is not None else {}
        request = self.factory.get("/api/orders/", **headers)
        response = self.mw(request)
        return request.demo_session_id, response[DEMO_SESSION_RESPONSE_HEADER]

    def test_a_valid_server_minted_id_is_trusted(self):
        good = "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6"  # 32 hex chars
        request_id, response_id = self._session_for(good)
        self.assertEqual(request_id, good)
        self.assertEqual(response_id, good)

    def test_an_oversized_header_is_replaced_not_passed_through(self):
        """The DoS: a value past the column's max_length used to 500 every
        endpoint. It must never reach the database."""
        request_id, _ = self._session_for("A" * 200)
        self.assertNotEqual(request_id, "A" * 200)
        self.assertRegex(request_id, r"^[a-f0-9]{32}$")

    def test_a_novel_freeform_value_is_replaced(self):
        """The DB-growth vector: a never-seen value triggers a sample clone, so
        an attacker-chosen value per request is unbounded growth. Only the
        minted shape is honoured, so an attacker cannot pick the key."""
        request_id, _ = self._session_for("attacker-controlled-value-1")
        self.assertRegex(request_id, r"^[a-f0-9]{32}$")

    def test_uppercase_hex_is_rejected(self):
        """token_hex is lowercase; anything else is not ours."""
        request_id, _ = self._session_for("A1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6")
        self.assertRegex(request_id, r"^[a-f0-9]{32}$")

    def test_a_missing_header_mints_a_fresh_id(self):
        request_id, response_id = self._session_for(None)
        self.assertRegex(request_id, r"^[a-f0-9]{32}$")
        self.assertEqual(request_id, response_id)

    @override_settings(SHARED_DEMO_SESSION_ID="building-radar")
    def test_shared_mode_ignores_the_header_entirely(self):
        """The addressed build pins everyone to one workspace; a supplied header,
        valid or not, must not change that."""
        request_id, _ = self._session_for("a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6")
        self.assertEqual(request_id, "building-radar")


class _EchoResponse(dict):
    """Minimal stand-in for an HttpResponse: the middleware only sets a header
    on it, which a dict supports."""

    def __init__(self, request):
        super().__init__()
        self.request = request
