from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse


def _inject_dashboard_stats(ctx, request):
    """Inject store stats into admin template context."""
    if not (request.user.is_authenticated and request.user.is_staff):
        return
    try:
        from orders.models import Order
        from accounts.models import User
        from products.models import Product
        from django.db.models import Sum

        revenue = Order.objects.filter(
            status__in=["delivered", "processing", "shipped", "out_for_delivery"]
        ).aggregate(total=Sum("total_amount"))["total"] or 0

        ctx["dashboard_stats"] = {
            "total_orders": Order.objects.count(),
            "pending_orders": Order.objects.filter(status="pending").count(),
            "processing_orders": Order.objects.filter(
                status__in=["processing", "shipped", "out_for_delivery"]
            ).count(),
            "total_revenue_display": f"{float(revenue):,.0f}",
            "total_users": User.objects.count(),
            "active_products": Product.objects.filter(is_active=True).count(),
        }
        ctx["recent_orders"] = (
            Order.objects.order_by("-created_at")
            .select_related("user")
            .prefetch_related("items")[:8]
        )
    except Exception:
        pass


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
