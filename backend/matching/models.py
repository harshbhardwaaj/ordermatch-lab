from django.db import models

from common.choices import ConfidenceBand, MatchDecisionKind


class MatchCandidate(models.Model):
    """Mirrors frontend/types/match.ts MatchCandidate.

    confidence_band and score are backend-internal (see
    common.choices.ConfidenceBand docstring and clarifications.md §7):
    real matching/confidence work in Phase 13 computes these for real and
    compares score against the active SetupConfiguration thresholds to
    decide routing, but neither is new frontend UI. The frontend keeps
    using the existing two-signal model (clean match / risk flag).
    """

    id = models.CharField(primary_key=True, max_length=64)
    line_item = models.ForeignKey(
        "orders.OrderLineItem", related_name="match_candidates", on_delete=models.CASCADE
    )
    catalog_item = models.ForeignKey(
        "catalogs.CatalogItem",
        related_name="match_candidates",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    sku = models.CharField(max_length=128, blank=True)
    confidence_band = models.CharField(max_length=32, choices=ConfidenceBand.choices)
    score = models.FloatField(null=True, blank=True)
    rank = models.PositiveIntegerField()
    proof_items = models.JSONField(default=list, blank=True)
    missing_evidence = models.JSONField(default=list, blank=True)
    conflicting_evidence = models.JSONField(default=list, blank=True)
    requires_human_review = models.BooleanField(default=False)

    class Meta:
        ordering = ["line_item", "rank"]

    def __str__(self) -> str:
        return f"{self.line_item_id} candidate #{self.rank} ({self.sku})"


class MatchDecision(models.Model):
    """Mirrors frontend/types/match.ts MatchDecision, extended with
    custom_label (T107): the real resolve-or-defer picker
    (frontend/components/product/match-pick-list.tsx) also supports a
    free-text "type the correct match" override with no real candidate at
    all (resolveWithCustomAnswer in order-processing.tsx / order-summary.tsx),
    so candidate must be nullable to record that path.
    """

    candidate = models.ForeignKey(
        MatchCandidate,
        related_name="decisions",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
    )
    custom_label = models.CharField(max_length=255, blank=True)
    line_item = models.ForeignKey(
        "orders.OrderLineItem", related_name="decisions", on_delete=models.CASCADE
    )
    decision = models.CharField(max_length=16, choices=MatchDecisionKind.choices)
    decided_at = models.DateTimeField()
    note = models.TextField(blank=True)
    is_simulated = models.BooleanField(default=True)

    def __str__(self) -> str:
        return f"{self.line_item_id} -> {self.decision}"
