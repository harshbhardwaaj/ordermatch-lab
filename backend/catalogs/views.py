from rest_framework import viewsets

from .models import CatalogItem
from .serializers import CatalogItemSerializer


class CatalogItemViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only for now: catalog ingestion (writes) belongs to the
    onboarding/setup flow work in a later phase, not this scaffold.
    """

    queryset = CatalogItem.objects.all()
    serializer_class = CatalogItemSerializer
    lookup_field = "id"
