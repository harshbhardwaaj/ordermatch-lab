from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from matching.context_file import build_context_file, get_context_file
from matching.memory import record_correction
from matching.models import MatchCandidate, MatchDecision

from .extraction import ExtractionError
from .models import OrderException, OrderLineItem, OrderRecord
from .serializers import (
    OrderExceptionSerializer,
    OrderLineItemSerializer,
    OrderRecordListSerializer,
    OrderRecordSerializer,
)
from .services import create_order_from_pasted_text, ensure_session_samples, reset_demo_data


class OrderRecordViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only (T100) plus send-to-erp (T111: the summary screen's real
    action once it stops being sessionStorage-only). Other write actions
    live on OrderLineItemViewSet and OrderExceptionViewSet below
    (T107/T108); ERP-readiness itself is a computed field on
    OrderRecordSerializer (T109) rather than a separate endpoint, since it
    is derived from the same persisted line item state.
    """

    lookup_field = "id"

    def get_queryset(self):
        """Scoped to the calling visitor's own demo session (see
        common.middleware.DemoSessionMiddleware) so every visitor sees
        only their own copy of the sample orders and their own "bring
        your own" orders, never anyone else's. Ensures this session's
        sample-order copies exist before every list/retrieve, since this
        is the one place every visitor's first request always passes
        through.
        """
        ensure_session_samples(self.request.demo_session_id)
        return OrderRecord.objects.filter(demo_session_id=self.request.demo_session_id)

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
            order = create_order_from_pasted_text(pasted_text, request.demo_session_id)
        except ExtractionError as exc:
            # Safe to surface directly: every ExtractionError is raised with
            # a hardcoded, curated literal in extraction.py, never a wrapped
            # exception's raw message or traceback. Keep it that way — never
            # add a raise ExtractionError(f"...{some_exc}...") call site, or
            # this stops being true.
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(OrderRecordSerializer(order).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path="reset-demo")
    def reset_demo(self, request):
        """Self-serve reset, scoped to the caller's own isolated demo
        session (see common.middleware.DemoSessionMiddleware): deletes
        this visitor's own "bring your own" orders and sample-order
        copies and restores their own sample orders and setup thresholds
        to the original defaults. Destructive but session-local, not
        global — it no longer touches any other visitor's data, still
        gated behind an explicit confirm step in the frontend since it's
        still a real "start over" action.
        """
        reset_demo_data(request.demo_session_id)
        return Response(status=status.HTTP_204_NO_CONTENT)


class OrderLineItemViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only list/retrieve, plus the real resolve-or-defer actions
    (T107) that the picker in match-pick-list.tsx actually performs:
    accept a candidate, accept a free-text correction, defer, or reopen a
    deferred line. There is no standalone "reject a candidate" action in
    the real UI, only "pick a different one," "type your own," or
    "decide later", so none is built here.
    """

    serializer_class = OrderLineItemSerializer
    lookup_field = "id"

    def get_queryset(self):
        return OrderLineItem.objects.filter(
            order__demo_session_id=self.request.demo_session_id
        )

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

        # The learning loop's only write path (matching.memory). Logged for
        # every decision, not just the ones that overruled the AI: a confirmed
        # top pick is the evidence that it was right, and a memory fed only on
        # its own failures learns a badly skewed picture.
        correction = record_correction(
            session_id=request.demo_session_id,
            line_item=line_item,
            chosen_candidate=candidate,
            custom_label=custom_label,
        )

        # Rewrite the customer's context.md whenever they actually taught us
        # something (matching.context_file). Only on a real correction: a
        # confirmation changes the counters but adds nothing a brief could say,
        # and rebuilding on every click would burn a model call per keystroke.
        #
        # A human-edited file is left alone. They can rebuild it deliberately
        # from the memory screen if they want the agent's version back.
        if correction.was_correction:
            existing = get_context_file(request.demo_session_id, correction.customer_key)
            if not (existing and existing.edited_by_human):
                try:
                    build_context_file(
                        request.demo_session_id,
                        correction.customer_key,
                        correction.customer_name,
                    )
                except Exception:
                    # Never fail the reviewer's decision because the brief could
                    # not be rewritten. The decision is the thing that matters;
                    # the file can be rebuilt from the log at any time.
                    pass

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

    serializer_class = OrderExceptionSerializer
    lookup_field = "id"

    def get_queryset(self):
        return OrderException.objects.filter(
            order__demo_session_id=self.request.demo_session_id
        )

    @action(detail=True, methods=["post"])
    def resolve(self, request, id=None):
        exception = self.get_object()
        exception.status = "resolved"
        exception.save()
        return Response(OrderExceptionSerializer(exception).data)
