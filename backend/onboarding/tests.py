from django.test import TestCase
from django.test import override_settings
from rest_framework.test import APIClient

from .models import SetupConfiguration


@override_settings(SHARED_DEMO_SESSION_ID="")
class SetupConfigurationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.client.credentials(HTTP_X_DEMO_SESSION_ID="test-session-fixed")
        self.config = SetupConfiguration.objects.create(
            demo_session_id="test-session-fixed",
            auto_approve_threshold=85,
            price_flag_threshold=15,
        )

    def test_list_and_retrieve(self):
        list_response = self.client.get("/api/setup-configuration/")
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.json()), 1)

        detail_response = self.client.get(f"/api/setup-configuration/{self.config.id}/")
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(detail_response.json()["auto_approve_threshold"], 85)

    def test_partial_update(self):
        response = self.client.patch(
            f"/api/setup-configuration/{self.config.id}/",
            {"auto_approve_threshold": 90, "flag_duplicate_lines": False},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.config.refresh_from_db()
        self.assertEqual(self.config.auto_approve_threshold, 90)
        self.assertFalse(self.config.flag_duplicate_lines)
        # Untouched fields survive a partial update.
        self.assertEqual(self.config.price_flag_threshold, 15)
