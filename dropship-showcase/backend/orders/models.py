import uuid
import time
from django.db import models
from django.conf import settings


class Order(models.Model):
    STATUS_CHOICES = [
        ("pending", "Order Placed"),
        ("processing", "Processing"),
        ("shipped", "Shipped"),
        ("out_for_delivery", "Out for Delivery"),
        ("delivered", "Delivered"),
        ("cancelled", "Cancelled"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders",
    )
    order_number = models.CharField(max_length=20, unique=True, editable=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    invoice_id = models.CharField(max_length=100, blank=True, default="", db_index=True)
    invoice_number = models.CharField(max_length=100, blank=True, default="")
    invoice_status = models.CharField(max_length=50, blank=True, default="")
    invoice_url = models.URLField(max_length=1000, blank=True, default="")
    invoice_created_at = models.DateTimeField(null=True, blank=True)

    # Shipping address
    shipping_name = models.CharField(max_length=200)
    shipping_email = models.EmailField(db_index=True)
    shipping_phone = models.CharField(max_length=20, blank=True, default="", db_index=True)
    shipping_address = models.TextField()
    shipping_city = models.CharField(max_length=100)
    shipping_pincode = models.CharField(max_length=10)
    shipping_state = models.CharField(max_length=100, blank=True, default="")

    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "orders"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["user", "status"]),
            models.Index(fields=["status", "created_at"]),
        ]

    def save(self, *args, **kwargs):
        if not self.order_number:
            self.order_number = self._generate_order_number()
        super().save(*args, **kwargs)

    def _generate_order_number(self):
        # Keep order number <= 20 chars to match field constraint.
        timestamp = int(time.time())
        random_part = uuid.uuid4().hex[:7].upper()
        return f"ORD{timestamp}{random_part}"

    def __str__(self):
        customer = self.user.email if self.user else self.shipping_email
        return f"{self.order_number} ({customer})"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product_id = models.PositiveIntegerField()
    product_name = models.CharField(max_length=255)
    product_image = models.URLField(max_length=1000, blank=True, default="")
    price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)
    shoe_size = models.CharField(max_length=10, blank=True, default="")  # For shoes only

    class Meta:
        db_table = "order_items"
        indexes = [
            models.Index(fields=["order"]),
            models.Index(fields=["product_id"]),
        ]

    def __str__(self):
        size_str = f" (Size: {self.shoe_size})" if self.shoe_size else ""
        return f"{self.product_name}{size_str} x{self.quantity}"

    @property
    def subtotal(self):
        return (self.price or 0) * (self.quantity or 0)


class AdminLog(models.Model):
    """Track admin actions for audit purposes"""
    ACTION_CHOICES = [
        ("product_create", "Product Created"),
        ("product_update", "Product Updated"),
        ("product_delete", "Product Deleted"),
        ("order_create", "Order Created"),
        ("order_update", "Order Updated"),
        ("order_status_change", "Order Status Changed"),
        ("user_create", "User Created"),
        ("user_update", "User Updated"),
        ("user_delete", "User Deleted"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="admin_logs",
    )
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    target_model = models.CharField(max_length=50, blank=True, default="")  # e.g., "Product", "Order"
    target_id = models.PositiveIntegerField(null=True, blank=True)
    description = models.TextField(blank=True, default="")
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        db_table = "admin_logs"
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["user", "timestamp"]),
            models.Index(fields=["action", "timestamp"]),
            models.Index(fields=["target_model", "target_id"]),
        ]

    def __str__(self):
        user_str = self.user.email if self.user else "Unknown"
        return f"{user_str} - {self.get_action_display()} at {self.timestamp}"
