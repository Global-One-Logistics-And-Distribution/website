from datetime import timedelta

from django.contrib import admin
from django.utils import timezone

from .models import CartItem


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ["user", "product_id", "quantity", "selected_size", "created_at", "is_abandoned"]
    list_filter = ["created_at"]
    search_fields = ["user__email", "product_id", "selected_size"]
    readonly_fields = ["user", "product_id", "quantity", "selected_size", "created_at"]
    ordering = ["-created_at"]

    def has_add_permission(self, request):
        return False

    def is_abandoned(self, obj):
        return bool(obj.created_at and obj.created_at < timezone.now() - timedelta(days=1))
    is_abandoned.short_description = "Abandoned"
