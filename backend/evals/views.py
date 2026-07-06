from rest_framework import viewsets

from .models import EvalRun
from .serializers import EvalRunSerializer


class EvalRunViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only for this scaffold phase (T100). Real eval run generation
    against the grounded sample dataset is Phase 13 work (T122).
    """

    queryset = EvalRun.objects.all()
    serializer_class = EvalRunSerializer
    lookup_field = "id"
