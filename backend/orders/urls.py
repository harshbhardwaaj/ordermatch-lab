from rest_framework.routers import DefaultRouter

from .views import OrderRecordViewSet

router = DefaultRouter()
router.register("orders", OrderRecordViewSet, basename="order")

urlpatterns = router.urls
