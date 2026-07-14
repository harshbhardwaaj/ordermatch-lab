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

from .context_file import build_context_file, get_context_file
from .models import CustomerCorrection, CustomerPreference
from .serializers import (
    CustomerContextFileSerializer,
    CustomerCorrectionSerializer,
    CustomerPreferenceSerializer,
)


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

        context_file = get_context_file(request.demo_session_id, customer_key)

        return Response(
            {
                "customer_key": customer_key,
                "customer_name": corrections.first().customer_name,
                "total_decisions": corrections.count(),
                "corrections": corrections.filter(was_correction=True).count(),
                "history": CustomerCorrectionSerializer(corrections, many=True).data,
                "learned_rules": CustomerPreferenceSerializer(preferences, many=True).data,
                "context_file": (
                    CustomerContextFileSerializer(context_file).data if context_file else None
                ),
            }
        )

    @action(detail=True, methods=["post"], url_path="rebuild-context")
    def rebuild_context(self, request, customer_key=None):
        """Re-runs the agent over this customer's correction log and rewrites
        their context.md.

        Refuses to clobber a file a human has edited unless explicitly told to.
        A person hand-correcting the memory is the strongest signal the system
        gets, and silently overwriting it on the next rebuild is the fastest way
        to teach them never to bother.
        """
        corrections = self._corrections(request).filter(customer_key=customer_key)
        if not corrections.exists():
            return Response(
                {"detail": "Nothing has been learned about this customer yet."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing = get_context_file(request.demo_session_id, customer_key)
        if existing and existing.edited_by_human and not request.data.get("force"):
            return Response(
                {
                    "detail": (
                        "This file was edited by a person. Rebuilding would discard "
                        "those edits. Send force=true to rebuild anyway."
                    )
                },
                status=status.HTTP_409_CONFLICT,
            )

        context_file = build_context_file(
            request.demo_session_id, customer_key, corrections.first().customer_name
        )
        return Response(CustomerContextFileSerializer(context_file).data)

    @action(detail=True, methods=["post"], url_path="edit-context")
    def edit_context(self, request, customer_key=None):
        """A reviewer rewriting the brief by hand. Marks it edited_by_human so
        the agent will not quietly overwrite it on the next rebuild.
        """
        context_file = get_context_file(request.demo_session_id, customer_key)
        if not context_file:
            return Response(
                {"detail": "No context file for this customer yet."},
                status=status.HTTP_404_NOT_FOUND,
            )

        context_file.content = request.data.get("content", "")
        context_file.edited_by_human = True
        context_file.generated_by = "human"
        context_file.save()
        return Response(CustomerContextFileSerializer(context_file).data)

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
