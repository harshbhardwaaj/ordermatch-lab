from rest_framework import viewsets

from .models import OnboardingSetup
from .serializers import OnboardingSetupSerializer


class OnboardingSetupViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only for this scaffold phase (T100). Updating setup config
    (auto-approve threshold, price-flag threshold, rule toggles) so it
    actually gates routing is Phase 12/13 work (T110, T119).
    """

    queryset = OnboardingSetup.objects.all()
    serializer_class = OnboardingSetupSerializer
    lookup_field = "id"
