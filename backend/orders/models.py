from django.db import models

from common.choices import (
    ExceptionCategory,
    ExceptionSeverity,
    ExceptionStatus,
    LineItemStatus,
    OrderSource,
    OrderStatus,
    ReadinessCheckStatus,
    UnitCode,
)


class OrderRecord(models.Model):
    """Mirrors frontend/types/order.ts OrderRecord + header, plus the
    extra grounded-sample fields frontend/data/orders.ts attaches
    (customerProfile, sourceDocumentSummary, originalExcerpt, groundTruth,
    coveredEdgeCases) so ground truth stays attached to the order it was
    seeded from for later real eval runs (Phase 13).
    """

    id = models.CharField(primary_key=True, max_length=64)

    # OrderHeader, flattened onto the order itself. order_number is the
    # customer-facing PO/RFQ number (e.g. "PO-2026-0142"), distinct from
    # this record's internal id (e.g. "ord-vh-2026-0142") and from
    # frontend/types/order.ts's OrderHeader.orderId, which it mirrors.
    order_number = models.CharField(max_length=64, blank=True)
    customer_name = models.CharField(max_length=255)
    customer_reference = models.CharField(max_length=128, blank=True)
    source = models.CharField(max_length=32, choices=OrderSource.choices)
    received_at = models.DateTimeField()
    requested_delivery_date = models.CharField(max_length=32, blank=True)
    delivery_location = models.CharField(max_length=255, blank=True)
    currency = models.CharField(max_length=8)
    field_status = models.JSONField(default=dict, blank=True)

    status = models.CharField(max_length=32, choices=OrderStatus.choices)

    # Grounded sample metadata, kept for traceability and real eval runs.
    customer_profile = models.JSONField(default=dict, blank=True)
    source_document_summary = models.TextField(blank=True)
    original_excerpt = models.TextField(blank=True)
    ground_truth = models.JSONField(default=dict, blank=True)
    covered_edge_cases = models.JSONField(default=list, blank=True)

    is_simulated = models.BooleanField(default=True)
    last_updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-received_at"]

    def __str__(self) -> str:
        return f"{self.id} — {self.customer_name}"


class OrderLineItem(models.Model):
    """Mirrors frontend/types/order.ts OrderLineItem."""

    id = models.CharField(primary_key=True, max_length=64)
    order = models.ForeignKey(
        OrderRecord, related_name="line_items", on_delete=models.CASCADE
    )
    line_number = models.PositiveIntegerField()
    original_text = models.TextField()
    normalized_name = models.CharField(max_length=255, blank=True)
    normalized_attributes = models.JSONField(default=dict, blank=True)
    quantity = models.FloatField(null=True, blank=True)
    unit = models.CharField(max_length=16, choices=UnitCode.choices, blank=True)
    requested_sku = models.CharField(max_length=128, blank=True)
    customer_part_number = models.CharField(max_length=128, blank=True)
    unit_price = models.FloatField(null=True, blank=True)
    currency = models.CharField(max_length=8, blank=True)
    status = models.CharField(max_length=32, choices=LineItemStatus.choices)
    selected_match_candidate = models.ForeignKey(
        "matching.MatchCandidate",
        related_name="+",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )

    class Meta:
        ordering = ["order", "line_number"]

    def __str__(self) -> str:
        return f"{self.order_id} line {self.line_number}"


class OrderException(models.Model):
    """Mirrors frontend/types/order.ts OrderException."""

    id = models.CharField(primary_key=True, max_length=64)
    order = models.ForeignKey(
        OrderRecord, related_name="exceptions", on_delete=models.CASCADE
    )
    category = models.CharField(max_length=32, choices=ExceptionCategory.choices)
    severity = models.CharField(max_length=16, choices=ExceptionSeverity.choices)
    status = models.CharField(
        max_length=16, choices=ExceptionStatus.choices, default=ExceptionStatus.OPEN
    )
    line_item = models.ForeignKey(
        OrderLineItem,
        related_name="exceptions",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    title = models.CharField(max_length=255)
    description = models.TextField()
    blocks_erp_readiness = models.BooleanField(default=False)
    recovery_action = models.TextField(blank=True)

    def __str__(self) -> str:
        return self.title


class ReadinessCheck(models.Model):
    """Mirrors frontend/types/order.ts ReadinessCheck."""

    id = models.CharField(primary_key=True, max_length=64)
    order = models.ForeignKey(
        OrderRecord,
        related_name="readiness_checks",
        on_delete=models.CASCADE,
    )
    label = models.CharField(max_length=255)
    status = models.CharField(max_length=16, choices=ReadinessCheckStatus.choices)
    reason = models.TextField(blank=True)
    related_line_item_ids = models.JSONField(default=list, blank=True)
    related_exception_ids = models.JSONField(default=list, blank=True)

    def __str__(self) -> str:
        return self.label
