from django.db import models

from common.choices import CatalogItemStatus, UnitCode


class CatalogItem(models.Model):
    """Mirrors frontend/types/catalog.ts CatalogItem."""

    id = models.CharField(primary_key=True, max_length=64)
    sku = models.CharField(max_length=128, unique=True)
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=128)
    description = models.TextField()
    manufacturer = models.CharField(max_length=255, blank=True)
    manufacturer_part_number = models.CharField(max_length=128, blank=True)
    customer_part_numbers = models.JSONField(default=list, blank=True)
    attributes = models.JSONField(default=list, blank=True)
    default_unit = models.CharField(max_length=16, choices=UnitCode.choices)
    price_amount = models.FloatField(null=True, blank=True)
    price_currency = models.CharField(max_length=8, blank=True)
    status = models.CharField(
        max_length=32,
        choices=CatalogItemStatus.choices,
        default=CatalogItemStatus.ACTIVE,
    )
    replacement_sku = models.CharField(max_length=128, blank=True)
    updated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["category", "name"]

    def __str__(self) -> str:
        return f"{self.sku} — {self.name}"
