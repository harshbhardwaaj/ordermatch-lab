from rest_framework.routers import DefaultRouter

from .views import OnboardingSetupViewSet

router = DefaultRouter()
router.register("onboarding-setups", OnboardingSetupViewSet, basename="onboarding-setup")

urlpatterns = router.urls
