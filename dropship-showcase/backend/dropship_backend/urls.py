from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.utils import timezone
from datetime import timedelta
import logging


logger = logging.getLogger(__name__)


def _inject_dashboard_stats(ctx, request):
    """Inject store stats into admin template context."""
    if not (request.user.is_authenticated and request.user.is_staff):
        return
    try:
        from orders.models import Order
        from accounts.models import User
        from products.models import Product
        from django.db.models import Sum

        now = timezone.now()
        today = now.date()
        last_7_days = now - timedelta(days=7)

        revenue = Order.objects.filter(
            status__in=["delivered", "processing", "shipped", "out_for_delivery"]
        ).aggregate(total=Sum("total_amount"))["total"] or 0
        today_revenue = Order.objects.filter(
            status__in=["delivered", "processing", "shipped", "out_for_delivery"],
            created_at__date=today,
        ).aggregate(total=Sum("total_amount"))["total"] or 0
        revenue_last_7_days = Order.objects.filter(
            status__in=["delivered", "processing", "shipped", "out_for_delivery"],
            created_at__gte=last_7_days,
        ).aggregate(total=Sum("total_amount"))["total"] or 0

        delivered_orders = Order.objects.filter(status="delivered").count()
        cancelled_orders = Order.objects.filter(status="cancelled").count()
        today_orders = Order.objects.filter(created_at__date=today).count()
        recent_users = User.objects.filter(is_staff=False, created_at__gte=last_7_days).count()
        low_stock_products = Product.objects.filter(is_active=True, stock__lte=5).count()

        ctx["dashboard_stats"] = {
            "total_orders": Order.objects.count(),
            "pending_orders": Order.objects.filter(status="pending").count(),
            "processing_orders": Order.objects.filter(
                status__in=["processing", "shipped", "out_for_delivery"]
            ).count(),
            "delivered_orders": delivered_orders,
            "cancelled_orders": cancelled_orders,
            "today_orders": today_orders,
            "total_revenue_display": f"{float(revenue):,.0f}",
            "today_revenue_display": f"{float(today_revenue):,.0f}",
            "revenue_last_7_days_display": f"{float(revenue_last_7_days):,.0f}",
            "total_users": User.objects.filter(is_staff=False).count(),
            "recent_users": recent_users,
            "active_products": Product.objects.filter(is_active=True).count(),
            "low_stock_products": low_stock_products,
        }
        ctx["recent_orders"] = (
            Order.objects.order_by("-created_at")
            .select_related("user")
            .prefetch_related("items")[:8]
        )
    except Exception:
        logger.exception("Failed to inject admin dashboard stats")


_original_each_context = admin.AdminSite.each_context


def _patched_each_context(self, request):
    ctx = _original_each_context(self, request)
    _inject_dashboard_stats(ctx, request)
    return ctx


admin.AdminSite.each_context = _patched_each_context


def health_check(request):
    return JsonResponse({"status": "ok"})

urlpatterns = [
    path("dropship/login/admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/cart/", include("cart.urls")),
    path("api/wishlist/", include("wishlist.urls")),
    path("api/products/", include("products.urls")),
    path("api/orders/", include("orders.urls")),
    path("api/health/", health_check),
]
