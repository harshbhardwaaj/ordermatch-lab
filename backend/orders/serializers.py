from rest_framework import serializers

from matching.serializers import MatchCandidateSerializer

from .models import OrderException, OrderLineItem, OrderRecord, ReadinessCheck


class OrderExceptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderException
        fields = "__all__"


class ReadinessCheckSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReadinessCheck
        fields = "__all__"


class OrderLineItemSerializer(serializers.ModelSerializer):
    match_candidates = MatchCandidateSerializer(many=True, read_only=True)
    resolved_by_decision = serializers.SerializerMethodField()

    class Meta:
        model = OrderLineItem
        fields = [
            "id",
            "order",
            "line_number",
            "original_text",
            "normalized_name",
            "normalized_attributes",
            "quantity",
            "unit",
            "requested_sku",
            "customer_part_number",
            "unit_price",
            "currency",
            "status",
            "selected_match_candidate",
            "match_candidates",
            "resolved_by_decision",
        ]

    def get_resolved_by_decision(self, obj: OrderLineItem) -> bool:
        """True once a real accepted MatchDecision exists for this line,
        distinct from a line that was already "matched" in the seeded
        sample data. Lets the frontend show "Confirmed" vs. "Matched"
        correctly no matter which screen or page load it's viewed from,
        rather than a client-side per-page-mount snapshot that forgets
        the distinction the moment a reviewer navigates to the next screen.
        """
        return obj.decisions.filter(decision="accepted").exists()


class OrderRecordSerializer(serializers.ModelSerializer):
    """Nested representation mirroring frontend/types/order.ts OrderRecord
    (plus header fields flattened onto the order, per the model). Ground
    truth / customer profile / covered edge cases are included since
    they're needed for real eval runs in Phase 13, not for display.

    erp_ready / unresolved_line_count (T109) are computed from persisted
    line item status rather than stored: a line counts as resolved once
    its status is "matched", whether that came from the seeded sample
    data or a real decide/accept action (OrderLineItemViewSet.decide).
    """

    line_items = OrderLineItemSerializer(many=True, read_only=True)
    exceptions = OrderExceptionSerializer(many=True, read_only=True)
    readiness_checks = ReadinessCheckSerializer(many=True, read_only=True)
    unresolved_line_count = serializers.SerializerMethodField()
    erp_ready = serializers.SerializerMethodField()

    class Meta:
        model = OrderRecord
        fields = [
            "id",
            "order_number",
            "customer_name",
            "customer_reference",
            "source",
            "received_at",
            "requested_delivery_date",
            "delivery_location",
            "currency",
            "field_status",
            "status",
            "customer_profile",
            "source_document_summary",
            "original_excerpt",
            "ground_truth",
            "covered_edge_cases",
            "is_simulated",
            "last_updated_at",
            "line_items",
            "exceptions",
            "readiness_checks",
            "unresolved_line_count",
            "erp_ready",
        ]

    def get_unresolved_line_count(self, obj: OrderRecord) -> int:
        return obj.line_items.exclude(status="matched").count()

    def get_erp_ready(self, obj: OrderRecord) -> bool:
        return self.get_unresolved_line_count(obj) == 0


class OrderRecordListSerializer(serializers.ModelSerializer):
    """Lighter shape for list views: no nested line items/exceptions/
    readiness checks. source_document_summary is included despite that,
    the order-intake screen displays it directly as the card's one-line
    description, real content a reviewer uses to pick an order, not
    decoration to trim for a "lighter" payload.
    """

    class Meta:
        model = OrderRecord
        fields = [
            "id",
            "order_number",
            "customer_name",
            "customer_reference",
            "source",
            "received_at",
            "requested_delivery_date",
            "delivery_location",
            "currency",
            "status",
            "source_document_summary",
            "is_simulated",
            "last_updated_at",
        ]
