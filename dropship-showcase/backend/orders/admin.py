from django.contrib import admin
from django.utils.html import format_html
from .models import Order, OrderItem, AdminLog


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
        from .models import AdminLog
        count = 0
        for order in queryset:
            old_status = order.status
            if old_status != new_status:
                order.status = new_status
                order.save()
                count += 1
                # Log the status change
                AdminLog.objects.create(
                    user=request.user,
                    action="order_status_change",
                    target_model="Order",
                    target_id=order.id,
                    description=f"Changed order {order.order_number} status from {old_status} to {new_status}",
                    ip_address=self._get_client_ip(request),
                )
        self.message_user(request, f"{count} order(s) marked as {label}.")

    def _get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0]
        return request.META.get('REMOTE_ADDR')

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


@admin.register(AdminLog)
class AdminLogAdmin(admin.ModelAdmin):
    list_display = ["timestamp", "user_email", "action_display", "target_model", "target_id", "short_description"]
    list_filter = ["action", "target_model", "timestamp"]
    search_fields = ["user__email", "description", "target_id"]
    readonly_fields = ["user", "action", "target_model", "target_id", "description", "timestamp", "ip_address"]
    ordering = ["-timestamp"]
    date_hierarchy = "timestamp"

    def has_add_permission(self, request):
        # Prevent manual addition of logs
        return False

    def has_delete_permission(self, request, obj=None):
        # Only superusers can delete logs
        return request.user.is_superuser

    def user_email(self, obj):
        return obj.user.email if obj.user else "System"
    user_email.short_description = "User"
    user_email.admin_order_field = "user__email"

    def action_display(self, obj):
        return obj.get_action_display()
    action_display.short_description = "Action"
    action_display.admin_order_field = "action"

    def short_description(self, obj):
        return obj.description[:100] + "..." if len(obj.description) > 100 else obj.description
    short_description.short_description = "Description"
