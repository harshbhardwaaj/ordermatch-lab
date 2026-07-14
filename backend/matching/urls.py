from rest_framework.routers import DefaultRouter

from .views import CustomerMemoryViewSet

router = DefaultRouter()
router.register("customers", CustomerMemoryViewSet, basename="customer")

urlpatterns = router.urls
