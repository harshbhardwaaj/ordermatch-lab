from rest_framework import serializers

from .models import (
    CustomerContextFile,
    CustomerCorrection,
    CustomerPreference,
    MatchCandidate,
    MatchDecision,
)


class MatchCandidateSerializer(serializers.ModelSerializer):
    """Excludes confidence_band and score from the default representation:
    those stay backend-internal per clarifications.md §7. Use
    MatchCandidateInternalSerializer for backend-only consumers (e.g. the
    matching pipeline itself, admin), never for frontend-facing endpoints.

    Carries the catalog item's name and price inline. The picker needs both to
    render a candidate, and it used to get them by downloading the entire
    catalog into the browser and looking the id up client-side. At 46 items
    that was invisible; at 10,389 it is a 6 MB JSON download on every order
    page. A candidate is never rendered without its own row, so the row travels
    with it.
    """

    catalog_item_name = serializers.CharField(source="catalog_item.name", default="", read_only=True)
    catalog_item_price = serializers.FloatField(
        source="catalog_item.price_amount", default=None, read_only=True
    )
    catalog_item_status = serializers.CharField(
        source="catalog_item.status", default="", read_only=True
    )

    class Meta:
        model = MatchCandidate
        fields = [
            "id",
            "line_item",
            "catalog_item",
            "catalog_item_name",
            "catalog_item_price",
            "catalog_item_status",
            "sku",
            "rank",
            "proof_items",
            "missing_evidence",
            "conflicting_evidence",
            "requires_human_review",
            # Unlike score/confidence_band this one IS sent to the frontend
            # on purpose — see the field's docstring on MatchCandidate.
            "learned_signal",
        ]


class MatchCandidateInternalSerializer(serializers.ModelSerializer):
    class Meta:
        model = MatchCandidate
        fields = "__all__"


class MatchDecisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MatchDecision
        fields = "__all__"


class CustomerCorrectionSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source="order.order_number", default="", read_only=True)

    class Meta:
        model = CustomerCorrection
        fields = [
            "id",
            "customer_key",
            "customer_name",
            "request_text",
            "normalized_request",
            "suggested_sku",
            "chosen_sku",
            "custom_label",
            "chosen_rank",
            "was_correction",
            "order_number",
            "created_at",
        ]


class CustomerContextFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerContextFile
        fields = [
            "customer_key",
            "customer_name",
            "content",
            "built_from_corrections",
            "edited_by_human",
            "generated_by",
            "updated_at",
        ]


class CustomerPreferenceSerializer(serializers.ModelSerializer):
    pinned = serializers.BooleanField(read_only=True)

    class Meta:
        model = CustomerPreference
        fields = [
            "customer_key",
            "normalized_request",
            "sku",
            "times_chosen",
            "times_rejected",
            "pinned",
            "last_seen_at",
        ]
