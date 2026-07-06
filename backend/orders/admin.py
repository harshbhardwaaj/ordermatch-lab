from django.contrib import admin

from .models import OrderException, OrderLineItem, OrderRecord, ReadinessCheck


class OrderLineItemInline(admin.TabularInline):
    model = OrderLineItem
    extra = 0


class OrderExceptionInline(admin.TabularInline):
    model = OrderException
    extra = 0


class ReadinessCheckInline(admin.TabularInline):
    model = ReadinessCheck
    extra = 0


@admin.register(OrderRecord)
class OrderRecordAdmin(admin.ModelAdmin):
    list_display = ("id", "order_number", "customer_name", "status", "source", "is_simulated")
    list_filter = ("status", "source", "is_simulated")
    search_fields = ("id", "order_number", "customer_name", "customer_reference")
    inlines = [OrderLineItemInline, OrderExceptionInline, ReadinessCheckInline]
