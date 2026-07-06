from rest_framework import mixins, viewsets

from .models import SetupConfiguration
from .serializers import SetupConfigurationSerializer


class SetupConfigurationViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """List/retrieve/update only (T110), no create/delete: this is a
    singleton config for the whole demo (see SetupConfiguration's
    docstring), not a per-customer resource. Read at match time (Phase
    13, T119) to gate real order routing.
    """

    queryset = SetupConfiguration.objects.all()
    serializer_class = SetupConfigurationSerializer
