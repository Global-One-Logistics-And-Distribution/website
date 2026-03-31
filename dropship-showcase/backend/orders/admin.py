from django.contrib import admin
from django.utils.html import format_html
from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ["product_id", "product_name", "product_image_preview", "price", "quantity", "shoe_size", "get_subtotal"]
    fields = ["product_id", "product_name", "product_image_preview", "shoe_size", "price", "quantity", "get_subtotal"]
    can_delete = False

    def product_image_preview(self, obj):
        if obj.product_image:
            return format_html(
                '<img src="{}" style="width:40px;height:40px;object-fit:cover;border-radius:4px;" />',
                obj.product_image,
            )
        return "—"
    product_image_preview.short_description = "Image"

    def get_subtotal(self, obj):
        price = obj.price or 0
        qty = obj.quantity or 0
        return f"₹{price * qty:,.2f}"
    get_subtotal.short_description = "Subtotal"


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = [
        "order_number",
        "user_email",
        "shipping_name",
        "status_badge",
        "total_amount",
        "created_at",
        "updated_at",
    ]
    list_filter = ["status", "created_at", "shipping_state"]
    search_fields = ["order_number", "user__email", "shipping_name", "shipping_email", "shipping_phone"]
    readonly_fields = ["order_number", "user", "created_at", "updated_at", "total_amount"]
    ordering = ["-created_at"]
    inlines = [OrderItemInline]
    actions = [
        "mark_processing",
        "mark_shipped",
        "mark_out_for_delivery",
        "mark_delivered",
        "mark_cancelled",
    ]
    fieldsets = (
        ("Order Info", {
            "fields": ("order_number", "user", "status", "total_amount", "notes"),
        }),
        ("Shipping Address", {
            "fields": (
                "shipping_name",
                "shipping_email",
                "shipping_phone",
                "shipping_address",
                "shipping_city",
                "shipping_pincode",
                "shipping_state",
            ),
        }),
        ("Timestamps", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )

    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = "Customer Email"
    user_email.admin_order_field = "user__email"

    def status_badge(self, obj):
        colors = {
            "pending": "#f59e0b",
            "processing": "#3b82f6",
            "shipped": "#8b5cf6",
            "out_for_delivery": "#06b6d4",
            "delivered": "#10b981",
            "cancelled": "#ef4444",
        }
        color = colors.get(obj.status, "#6b7280")
        return format_html(
            '<span style="background:{};color:white;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;">{}</span>',
            color,
            obj.get_status_display(),
        )
    status_badge.short_description = "Status"

    def _change_status(self, request, queryset, new_status, label):
        count = queryset.update(status=new_status)
        self.message_user(request, f"{count} order(s) marked as {label}.")

    def mark_processing(self, request, queryset):
        self._change_status(request, queryset, "processing", "Processing")
    mark_processing.short_description = "Mark selected orders as Processing"

    def mark_shipped(self, request, queryset):
        self._change_status(request, queryset, "shipped", "Shipped")
    mark_shipped.short_description = "Mark selected orders as Shipped"

    def mark_out_for_delivery(self, request, queryset):
        self._change_status(request, queryset, "out_for_delivery", "Out for Delivery")
    mark_out_for_delivery.short_description = "Mark selected orders as Out for Delivery"

    def mark_delivered(self, request, queryset):
        self._change_status(request, queryset, "delivered", "Delivered")
    mark_delivered.short_description = "Mark selected orders as Delivered"

    def mark_cancelled(self, request, queryset):
        self._change_status(request, queryset, "cancelled", "Cancelled")
    mark_cancelled.short_description = "Mark selected orders as Cancelled"
