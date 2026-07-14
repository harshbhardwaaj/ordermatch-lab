"""Read-only views over the per-customer match memory (matching.memory),
plus one destructive action: forgetting a single correction.

A memory the reviewer cannot see is a memory they cannot trust, and one they
cannot correct is one they will eventually route around. So the history is
inspectable per customer, and any single lesson can be deleted — which is
exactly the affordance a fine-tune could not have given us.
"""

from django.db.models import Count, Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import CustomerCorrection, CustomerPreference
from .serializers import CustomerCorrectionSerializer, CustomerPreferenceSerializer


class CustomerMemoryViewSet(viewsets.ViewSet):
    """GET  /api/customers/                        — every customer with a memory
    GET  /api/customers/<customer_key>/           — one customer's full history
    POST /api/customers/<customer_key>/forget/    {"correction_id": "..."}

    Scoped to the caller's own demo session throughout (see
    common.middleware.DemoSessionMiddleware), same as orders.
    """

    lookup_field = "customer_key"

    def _corrections(self, request):
        return CustomerCorrection.objects.filter(demo_session_id=request.demo_session_id)

    def list(self, request):
        rows = (
            self._corrections(request)
            .values("customer_key", "customer_name")
            .annotate(
                total_decisions=Count("id"),
                corrections=Count("id", filter=Q(was_correction=True)),
            )
            .order_by("customer_name")
        )
        return Response(list(rows))

    def retrieve(self, request, customer_key=None):
        corrections = self._corrections(request).filter(customer_key=customer_key)
        if not corrections.exists():
            return Response(
                {
                    "customer_key": customer_key,
                    "customer_name": "",
                    "total_decisions": 0,
                    "corrections": 0,
                    "history": [],
                    "learned_rules": [],
                }
            )

        preferences = CustomerPreference.objects.filter(
            demo_session_id=request.demo_session_id, customer_key=customer_key
        ).filter(Q(times_chosen__gt=0) | Q(times_rejected__gt=0))

        return Response(
            {
                "customer_key": customer_key,
                "customer_name": corrections.first().customer_name,
                "total_decisions": corrections.count(),
                "corrections": corrections.filter(was_correction=True).count(),
                "history": CustomerCorrectionSerializer(corrections, many=True).data,
                "learned_rules": CustomerPreferenceSerializer(preferences, many=True).data,
            }
        )

    @action(detail=True, methods=["post"])
    def forget(self, request, customer_key=None):
        """Deletes one logged correction and unwinds its effect on the
        aggregate. The reviewer taught it; the reviewer can unteach it.
        """
        correction_id = request.data.get("correction_id")
        correction = self._corrections(request).filter(id=correction_id, customer_key=customer_key).first()
        if not correction:
            return Response({"detail": "Correction not found."}, status=status.HTTP_404_NOT_FOUND)

        if correction.chosen_sku and correction.normalized_request:
            pref = CustomerPreference.objects.filter(
                demo_session_id=request.demo_session_id,
                customer_key=customer_key,
                normalized_request=correction.normalized_request,
                sku=correction.chosen_sku,
            ).first()
            if pref:
                pref.times_chosen = max(0, pref.times_chosen - 1)
                pref.save()
                if pref.times_chosen == 0 and pref.times_rejected == 0:
                    pref.delete()

        correction.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
