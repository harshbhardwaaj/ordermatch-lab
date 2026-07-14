from rest_framework import serializers

from .models import CatalogItem


class CatalogItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CatalogItem
        fields = [
            "id",
            "sku",
            "name",
            "category",
            "description",
            "manufacturer",
            "manufacturer_part_number",
            "customer_part_numbers",
            "attributes",
            "default_unit",
            "price_amount",
            "price_currency",
            "status",
            "replacement_sku",
            "updated_at",
        ]
