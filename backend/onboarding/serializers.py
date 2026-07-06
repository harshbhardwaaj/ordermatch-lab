from rest_framework import serializers

from .models import SetupConfiguration


class SetupConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = SetupConfiguration
        fields = [
            "id",
            "auto_approve_threshold",
            "price_flag_threshold",
            "stop_discontinued_items",
            "review_noncatalog_items",
            "flag_duplicate_lines",
            "updated_at",
        ]
