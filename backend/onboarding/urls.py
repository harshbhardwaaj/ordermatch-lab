from rest_framework.routers import DefaultRouter

from .views import SetupConfigurationViewSet

router = DefaultRouter()
router.register("setup-configuration", SetupConfigurationViewSet, basename="setup-configuration")

urlpatterns = router.urls
