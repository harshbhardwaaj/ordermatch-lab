from django.contrib import admin

from .models import CatalogItem


@admin.register(CatalogItem)
class CatalogItemAdmin(admin.ModelAdmin):
    list_display = ("id", "sku", "name", "category", "status", "default_unit")
    search_fields = ("id", "sku", "name")
    list_filter = ("category", "status")
