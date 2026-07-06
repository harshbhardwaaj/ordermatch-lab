from django.contrib import admin

from .models import SetupConfiguration


@admin.register(SetupConfiguration)
class SetupConfigurationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "auto_approve_threshold",
        "price_flag_threshold",
        "stop_discontinued_items",
        "review_noncatalog_items",
        "flag_duplicate_lines",
        "updated_at",
    )
