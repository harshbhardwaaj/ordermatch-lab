from django.db import models

from common.choices import OnboardingStepKey, OnboardingStepStatus


class OnboardingSetup(models.Model):
    """Mirrors frontend/types/onboarding.ts OnboardingSetup."""

    id = models.CharField(primary_key=True, max_length=64)
    customer_name = models.CharField(max_length=255)
    catalog_item_count = models.PositiveIntegerField(null=True, blank=True)
    is_simulated = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"Setup for {self.customer_name}"


class OnboardingStep(models.Model):
    """Mirrors frontend/types/onboarding.ts OnboardingStep."""

    setup = models.ForeignKey(
        OnboardingSetup, related_name="steps", on_delete=models.CASCADE
    )
    key = models.CharField(max_length=32, choices=OnboardingStepKey.choices)
    label = models.CharField(max_length=255)
    status = models.CharField(max_length=32, choices=OnboardingStepStatus.choices)
    blockers = models.JSONField(default=list, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["setup", "id"]

    def __str__(self) -> str:
        return f"{self.setup_id} — {self.key}"


class CustomerRule(models.Model):
    """Mirrors frontend/types/onboarding.ts CustomerRule."""

    setup = models.ForeignKey(
        OnboardingSetup, related_name="customer_rules", on_delete=models.CASCADE
    )
    label = models.CharField(max_length=255)
    description = models.TextField()
    enabled = models.BooleanField(default=True)

    def __str__(self) -> str:
        return self.label


class SetupConfiguration(models.Model):
    """Real, persisted routing configuration (FR-043 / T110), replacing
    the client-only useState thresholds in
    frontend/components/onboarding/setup-flow.tsx (autoApproveThreshold,
    priceFlagThreshold). Read at match time (Phase 13, T119) to gate real
    order routing so /prototype/setup stops being disconnected from the
    live workflow. See clarifications.md §7.
    """

    setup = models.OneToOneField(
        OnboardingSetup, related_name="configuration", on_delete=models.CASCADE
    )
    auto_approve_threshold = models.FloatField(default=85)
    price_flag_threshold = models.FloatField(default=15)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return (
            f"{self.setup_id}: auto-approve>={self.auto_approve_threshold}, "
            f"price-flag>={self.price_flag_threshold}"
        )
