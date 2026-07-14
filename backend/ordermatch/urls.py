"""
URL configuration for ordermatch project.

All API endpoints mirror the frontend mock data shape (T100) under
/api/. See docs/spec-kit/plan.md's Backend Architecture section.
"""

from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("catalogs.urls")),
    path("api/", include("matching.urls")),
    path("api/", include("orders.urls")),
    path("api/", include("onboarding.urls")),
    path("api/", include("evals.urls")),
]
