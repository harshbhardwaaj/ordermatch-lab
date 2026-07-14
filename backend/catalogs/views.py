from rest_framework import viewsets

from .models import CatalogItem
from .serializers import CatalogItemSerializer


class CatalogItemViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only for now: catalog ingestion (writes) belongs to the
    onboarding/setup flow work in a later phase, not this scaffold.
    """

    serializer_class = CatalogItemSerializer
    lookup_field = "id"

    def get_queryset(self):
        queryset = CatalogItem.objects.defer("embedding")
        if self.action == "list":
            # The browser never needs the generated 10k catalog as one JSON
            # payload. Match candidates carry their own display fields inline,
            # and returning every generated row is enough to kill Render's free
            # worker once embeddings exist in the table.
            queryset = queryset.exclude(id__startswith="gen-")
        return queryset
