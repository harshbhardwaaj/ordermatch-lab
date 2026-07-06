from rest_framework.routers import DefaultRouter

from .views import OrderExceptionViewSet, OrderLineItemViewSet, OrderRecordViewSet

router = DefaultRouter()
router.register("orders", OrderRecordViewSet, basename="order")
router.register("line-items", OrderLineItemViewSet, basename="line-item")
router.register("exceptions", OrderExceptionViewSet, basename="exception")

urlpatterns = router.urls
