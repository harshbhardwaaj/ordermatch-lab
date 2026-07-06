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
        ]


class OrderRecordSerializer(serializers.ModelSerializer):
    """Nested representation mirroring frontend/types/order.ts OrderRecord
    (plus header fields flattened onto the order, per the model). Ground
    truth / customer profile / covered edge cases are included since
    they're needed for real eval runs in Phase 13, not for display.
    """

    line_items = OrderLineItemSerializer(many=True, read_only=True)
    exceptions = OrderExceptionSerializer(many=True, read_only=True)
    readiness_checks = ReadinessCheckSerializer(many=True, read_only=True)

    class Meta:
        model = OrderRecord
        fields = "__all__"


class OrderRecordListSerializer(serializers.ModelSerializer):
    """Lighter shape for list views: no nested line items."""

    class Meta:
        model = OrderRecord
        fields = [
            "id",
            "customer_name",
            "customer_reference",
            "source",
            "received_at",
            "requested_delivery_date",
            "delivery_location",
            "currency",
            "status",
            "is_simulated",
            "last_updated_at",
        ]
