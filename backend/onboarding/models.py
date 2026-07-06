from django.db import models


class SetupConfiguration(models.Model):
    """Real, persisted routing configuration (FR-043 / T110), replacing
    the client-only useState thresholds in
    frontend/components/onboarding/setup-flow.tsx (autoApproveThreshold,
    priceFlagThreshold, and the three fixed RULE_TOGGLES entries:
    discontinued, noncatalog, duplicate). Read at match time (Phase 13,
    T119) to gate real order routing so /prototype/setup stops being
    disconnected from the live workflow. See clarifications.md §7.

    There is one setup configuration for this whole demo, not a
    per-customer onboarding wizard, since there is only one sample
    catalog and no multi-tenant customer onboarding in this product.
    Callers should read/create the single active row rather than
    filtering by customer.
    """

    auto_approve_threshold = models.FloatField(default=85)
    price_flag_threshold = models.FloatField(default=15)
    stop_discontinued_items = models.BooleanField(default=True)
    review_noncatalog_items = models.BooleanField(default=True)
    flag_duplicate_lines = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return (
            f"Setup config: auto-approve>={self.auto_approve_threshold}, "
            f"price-flag>={self.price_flag_threshold}"
        )
