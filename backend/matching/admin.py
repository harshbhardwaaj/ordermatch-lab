from django.contrib import admin

from .models import MatchCandidate, MatchDecision


@admin.register(MatchCandidate)
class MatchCandidateAdmin(admin.ModelAdmin):
    list_display = ("id", "line_item", "sku", "confidence_band", "score", "rank")
    list_filter = ("confidence_band",)
    search_fields = ("id", "sku", "line_item__id")


@admin.register(MatchDecision)
class MatchDecisionAdmin(admin.ModelAdmin):
    list_display = ("candidate", "line_item", "decision", "decided_at", "is_simulated")
    list_filter = ("decision", "is_simulated")
