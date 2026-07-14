from rest_framework import serializers

from .models import CustomerCorrection, CustomerPreference, MatchCandidate, MatchDecision


class MatchCandidateSerializer(serializers.ModelSerializer):
    """Excludes confidence_band and score from the default representation:
    those stay backend-internal per clarifications.md §7. Use
    MatchCandidateInternalSerializer for backend-only consumers (e.g. the
    matching pipeline itself, admin), never for frontend-facing endpoints.
    """

    class Meta:
        model = MatchCandidate
        fields = [
            "id",
            "line_item",
            "catalog_item",
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
