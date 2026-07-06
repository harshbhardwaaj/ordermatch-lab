from rest_framework import serializers

from .models import CustomerRule, OnboardingSetup, OnboardingStep, SetupConfiguration


class OnboardingStepSerializer(serializers.ModelSerializer):
    class Meta:
        model = OnboardingStep
        fields = "__all__"


class CustomerRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerRule
        fields = "__all__"


class SetupConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = SetupConfiguration
        fields = ["auto_approve_threshold", "price_flag_threshold", "updated_at"]


class OnboardingSetupSerializer(serializers.ModelSerializer):
    steps = OnboardingStepSerializer(many=True, read_only=True)
    customer_rules = CustomerRuleSerializer(many=True, read_only=True)
    configuration = SetupConfigurationSerializer(read_only=True)

    class Meta:
        model = OnboardingSetup
        fields = "__all__"
