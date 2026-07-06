from django.contrib import admin

from .models import EvalFailureCase, EvalMetric, EvalRun


class EvalMetricInline(admin.TabularInline):
    model = EvalMetric
    extra = 0


class EvalFailureCaseInline(admin.TabularInline):
    model = EvalFailureCase
    extra = 0


@admin.register(EvalRun)
class EvalRunAdmin(admin.ModelAdmin):
    list_display = ("id", "status", "started_at", "completed_at", "is_simulated")
    list_filter = ("status", "is_simulated")
    inlines = [EvalMetricInline, EvalFailureCaseInline]
