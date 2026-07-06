from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from matching.models import MatchCandidate, MatchDecision

from .extraction import ExtractionError
from .models import OrderException, OrderLineItem, OrderRecord
from .serializers import (
    OrderExceptionSerializer,
    OrderLineItemSerializer,
    OrderRecordListSerializer,
    OrderRecordSerializer,
)
from .services import create_order_from_pasted_text, reset_demo_data


class OrderRecordViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only (T100) plus send-to-erp (T111: the summary screen's real
    action once it stops being sessionStorage-only). Other write actions
    live on OrderLineItemViewSet and OrderExceptionViewSet below
    (T107/T108); ERP-readiness itself is a computed field on
    OrderRecordSerializer (T109) rather than a separate endpoint, since it
    is derived from the same persisted line item state.
    """

    queryset = OrderRecord.objects.all()
    lookup_field = "id"

    def get_serializer_class(self):
        if self.action == "list":
            return OrderRecordListSerializer
        return OrderRecordSerializer

    @action(detail=True, methods=["post"], url_path="send-to-erp")
    def send_to_erp(self, request, id=None):
        order = self.get_object()
        unresolved_count = order.line_items.exclude(status="matched").count()
        if unresolved_count > 0:
            return Response(
                {
                    "detail": (
                        f"{unresolved_count} line item(s) still need a decision "
                        "before this order can be sent to the ERP."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        order.status = "erp-ready"
        order.save()
        return Response(OrderRecordSerializer(order).data)

    @action(detail=False, methods=["post"])
    def extract(self, request):
        """Real extraction + hybrid matching (T114-T121) for a pasted-text
        order, replacing the client-side timer simulation. Returns the
        full created order, same shape as GET /api/orders/<id>/, so the
        frontend can go straight to rendering it. If extraction itself
        fails (bad input, OpenAI timeout/rate-limit/malformed response),
        no order is created at all (T124) and this returns a 502 with a
        clear detail message the existing error+retry UI already handles.
        """
        pasted_text = request.data.get("pasted_text", "")
        try:
            order = create_order_from_pasted_text(pasted_text)
        except ExtractionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(OrderRecordSerializer(order).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path="reset-demo")
    def reset_demo(self, request):
        """Self-serve reset for a shared demo with no login: deletes every
        real "bring your own" order and restores the 4 sample orders and
        setup thresholds to their original state. Destructive and global
        (affects every visitor, not just the caller), so the frontend
        requires an explicit confirm step before calling this.
        """
        reset_demo_data()
        return Response(status=status.HTTP_204_NO_CONTENT)


class OrderLineItemViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only list/retrieve, plus the real resolve-or-defer actions
    (T107) that the picker in match-pick-list.tsx actually performs:
    accept a candidate, accept a free-text correction, defer, or reopen a
    deferred line. There is no standalone "reject a candidate" action in
    the real UI, only "pick a different one," "type your own," or
    "decide later", so none is built here.
    """

    queryset = OrderLineItem.objects.all()
    serializer_class = OrderLineItemSerializer
    lookup_field = "id"

    @action(detail=True, methods=["post"])
    def decide(self, request, id=None):
        line_item = self.get_object()
        candidate_id = request.data.get("candidate_id")
        custom_label = (request.data.get("custom_label") or "").strip()

        if bool(candidate_id) == bool(custom_label):
            return Response(
                {"detail": "Provide exactly one of candidate_id or custom_label."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if candidate_id:
            candidate = get_object_or_404(
                MatchCandidate, id=candidate_id, line_item=line_item
            )
            line_item.selected_match_candidate = candidate
            # Mirrors the original frontend-only behavior (order-processing.tsx's
            # resolveWithCandidate): show the catalog item's real name, not
            # whatever the line originally normalized to, since a different
            # candidate can point at a different catalog entry.
            line_item.normalized_name = (
                candidate.catalog_item.name if candidate.catalog_item else (candidate.sku or "Selected match")
            )
            MatchDecision.objects.create(
                candidate=candidate,
                line_item=line_item,
                decision="accepted",
                decided_at=timezone.now(),
            )
        else:
            candidate = None
            line_item.normalized_name = custom_label
            line_item.selected_match_candidate = None
            MatchDecision.objects.create(
                candidate=None,
                custom_label=custom_label,
                line_item=line_item,
                decision="accepted",
                decided_at=timezone.now(),
            )

        line_item.status = "matched"
        line_item.save()
        return Response(OrderLineItemSerializer(line_item).data)

    @action(detail=True, methods=["post"])
    def defer(self, request, id=None):
        line_item = self.get_object()
        MatchDecision.objects.create(
            candidate=None,
            line_item=line_item,
            decision="deferred",
            decided_at=timezone.now(),
        )
        return Response(OrderLineItemSerializer(line_item).data)

    @action(detail=True, methods=["post"])
    def reopen(self, request, id=None):
        """Undoes a defer. Only ever follows a defer in the real UI (a
        line that was already clear/matched is never reopened), so this
        resets status to review-needed rather than trying to reconstruct
        whichever original status (review-needed vs. blocked) it had
        before deferring.
        """
        line_item = self.get_object()
        line_item.status = "review-needed"
        line_item.selected_match_candidate = None
        line_item.save()
        return Response(OrderLineItemSerializer(line_item).data)


class OrderExceptionViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only list/retrieve, plus resolving a flagged exception (T108)."""

    queryset = OrderException.objects.all()
    serializer_class = OrderExceptionSerializer
    lookup_field = "id"

    @action(detail=True, methods=["post"])
    def resolve(self, request, id=None):
        exception = self.get_object()
        exception.status = "resolved"
        exception.save()
        return Response(OrderExceptionSerializer(exception).data)
