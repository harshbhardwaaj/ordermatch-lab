from rest_framework import serializers

from .models import MatchCandidate, MatchDecision


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
        ]


class MatchCandidateInternalSerializer(serializers.ModelSerializer):
    class Meta:
        model = MatchCandidate
        fields = "__all__"


class MatchDecisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MatchDecision
        fields = "__all__"
