from rest_framework import serializers

from .models import EvalFailureCase, EvalMetric, EvalRun


class EvalMetricSerializer(serializers.ModelSerializer):
    class Meta:
        model = EvalMetric
        fields = "__all__"


class EvalFailureCaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = EvalFailureCase
        fields = "__all__"


class EvalRunSerializer(serializers.ModelSerializer):
    metrics = EvalMetricSerializer(many=True, read_only=True)
    failure_cases = EvalFailureCaseSerializer(many=True, read_only=True)

    class Meta:
        model = EvalRun
        fields = "__all__"
