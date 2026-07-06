from django.db import models

from common.choices import (
    EvalFailureSeverity,
    EvalMetricKey,
    EvalMetricUnit,
    EvalRunStatus,
)


class EvalRun(models.Model):
    """Mirrors frontend/types/eval.ts EvalRun."""

    id = models.CharField(primary_key=True, max_length=64)
    status = models.CharField(max_length=16, choices=EvalRunStatus.choices)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    is_simulated = models.BooleanField(default=True)

    class Meta:
        ordering = ["-started_at"]

    def __str__(self) -> str:
        return f"{self.id} ({self.status})"


class EvalMetric(models.Model):
    """Mirrors frontend/types/eval.ts EvalMetric."""

    run = models.ForeignKey(EvalRun, related_name="metrics", on_delete=models.CASCADE)
    key = models.CharField(max_length=32, choices=EvalMetricKey.choices)
    label = models.CharField(max_length=255)
    value = models.FloatField()
    unit = models.CharField(max_length=16, choices=EvalMetricUnit.choices)
    sample_size = models.PositiveIntegerField(null=True, blank=True)
    last_updated_at = models.DateTimeField(null=True, blank=True)

    def __str__(self) -> str:
        return f"{self.run_id}: {self.key}={self.value}"


class EvalFailureCase(models.Model):
    """Mirrors frontend/types/eval.ts EvalFailureCase."""

    run = models.ForeignKey(
        EvalRun, related_name="failure_cases", on_delete=models.CASCADE
    )
    line_item = models.ForeignKey(
        "orders.OrderLineItem",
        related_name="eval_failure_cases",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    metric_key = models.CharField(max_length=32, choices=EvalMetricKey.choices)
    title = models.CharField(max_length=255)
    expected = models.TextField()
    actual = models.TextField()
    severity = models.CharField(max_length=16, choices=EvalFailureSeverity.choices)

    def __str__(self) -> str:
        return self.title
