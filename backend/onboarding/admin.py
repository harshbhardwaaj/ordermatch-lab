from django.contrib import admin

from .models import CustomerRule, OnboardingSetup, OnboardingStep, SetupConfiguration


class OnboardingStepInline(admin.TabularInline):
    model = OnboardingStep
    extra = 0


class CustomerRuleInline(admin.TabularInline):
    model = CustomerRule
    extra = 0


class SetupConfigurationInline(admin.StackedInline):
    model = SetupConfiguration
    extra = 0


@admin.register(OnboardingSetup)
class OnboardingSetupAdmin(admin.ModelAdmin):
    list_display = ("id", "customer_name", "catalog_item_count", "is_simulated")
    inlines = [OnboardingStepInline, CustomerRuleInline, SetupConfigurationInline]
