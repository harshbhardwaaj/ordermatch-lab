from django.db import models

DEFAULT_SETUP_CONFIGURATION = {
    "auto_approve_threshold": 85,
    "price_flag_threshold": 15,
    "stop_discontinued_items": True,
    "review_noncatalog_items": True,
    "flag_duplicate_lines": True,
}


class SetupConfiguration(models.Model):
    """Real, persisted routing configuration (FR-043 / T110), replacing
    the client-only useState thresholds in
    frontend/components/onboarding/setup-flow.tsx (autoApproveThreshold,
    priceFlagThreshold, and the three fixed RULE_TOGGLES entries:
    discontinued, noncatalog, duplicate). Read at match time (Phase 13,
    T119) to gate real order routing so /prototype/setup stops being
    disconnected from the live workflow. See clarifications.md §7.

    One row per demo session (see common.middleware.DemoSessionMiddleware),
    not a per-customer onboarding wizard and not a single global row: each
    visitor gets their own isolated thresholds, created on first touch
    with DEFAULT_SETUP_CONFIGURATION, same as their own copy of the
    sample orders (see orders.services.ensure_session_samples).
    """

    demo_session_id = models.CharField(max_length=40, blank=True, default="", db_index=True)
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
