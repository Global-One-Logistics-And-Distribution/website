from django.contrib import admin
from django import forms
from django.utils.html import format_html
from decimal import Decimal
from .models import Order, OrderItem, AdminLog
from products.models import Product


class OrderItemInlineForm(forms.ModelForm):
    product = forms.ModelChoiceField(
        queryset=Product.objects.none(),
        required=False,
        help_text="Select a product to auto-fill item details.",
    )

    class Meta:
        model = OrderItem
        fields = [
            "product",
            "product_id",
            "product_name",
            "product_image",
            "shoe_size",
            "price",
            "quantity",
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["product"].queryset = Product.objects.filter(is_active=True).order_by("name")

        if self.instance and self.instance.product_id:
            selected = Product.objects.filter(id=self.instance.product_id, is_active=True).first()
            if selected:
                self.fields["product"].initial = selected

    def clean(self):
        cleaned = super().clean()
        product = cleaned.get("product")

        has_manual_row_data = any(
            cleaned.get(field)
            for field in ["product_id", "product_name", "quantity", "price", "shoe_size"]
        )

        if product:
            cleaned["product_id"] = product.id
            cleaned["product_name"] = product.name
            cleaned["product_image"] = product.image_url or ""
            cleaned["price"] = product.price
        elif not self.instance.pk and has_manual_row_data:
            self.add_error("product", "Select a product from the list.")

        return cleaned

    def save(self, commit=True):
        instance = super().save(commit=False)
        product = self.cleaned_data.get("product")
        if product:
            instance.product_id = product.id
            instance.product_name = product.name
            instance.product_image = product.image_url or ""
            instance.price = product.price
        if commit:
            instance.save()
        return instance


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    form = OrderItemInlineForm
    extra = 1
    readonly_fields = ["product_id", "product_name", "product_image_preview", "price", "get_subtotal"]
    fields = ["product", "product_id", "product_name", "product_image_preview", "shoe_size", "price", "quantity", "get_subtotal"]
    can_delete = True

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
    readonly_fields = ["order_number", "total_amount", "created_at", "updated_at"]
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

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("user").prefetch_related("items")

    def save_model(self, request, obj, form, change):
        if not obj.user and obj.shipping_email:
            from accounts.models import User

            obj.user = User.objects.filter(email__iexact=obj.shipping_email).first()
        super().save_model(request, obj, form, change)

    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)
        order = form.instance
        computed_total = sum((item.subtotal for item in order.items.all()), Decimal("0"))
        order.total_amount = computed_total
        order.save(update_fields=["total_amount", "updated_at"])

    def user_email(self, obj):
        if obj.user:
            return obj.user.email
        return obj.shipping_email
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
