from rest_framework import mixins, viewsets

from .models import DEFAULT_SETUP_CONFIGURATION, SetupConfiguration
from .serializers import SetupConfigurationSerializer


class SetupConfigurationViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """List/retrieve/update only (T110), no create/delete: this is a
    per-demo-session singleton (see SetupConfiguration's docstring), not
    a per-customer resource. Read at match time (Phase 13, T119) to gate
    real order routing.
    """

    serializer_class = SetupConfigurationSerializer

    def get_queryset(self):
        """Every visitor gets their own row, created on first touch with
        the same defaults every session starts from (see
        common.middleware.DemoSessionMiddleware).
        """
        SetupConfiguration.objects.get_or_create(
            demo_session_id=self.request.demo_session_id,
            defaults=DEFAULT_SETUP_CONFIGURATION,
        )
        return SetupConfiguration.objects.filter(
            demo_session_id=self.request.demo_session_id
        )
