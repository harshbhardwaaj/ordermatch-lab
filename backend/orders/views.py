from rest_framework import viewsets

from .models import OrderRecord
from .serializers import OrderRecordListSerializer, OrderRecordSerializer


class OrderRecordViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only for this scaffold phase (T100). Write actions (accept/
    reject a match, resolve an exception, update setup config) are Phase
    12 work (T107-T110), added once persistence round-trips are needed.
    """

    queryset = OrderRecord.objects.all()
    lookup_field = "id"

    def get_serializer_class(self):
        if self.action == "list":
            return OrderRecordListSerializer
        return OrderRecordSerializer
