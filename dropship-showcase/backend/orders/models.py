import uuid
import time
from django.db import models
from django.conf import settings


class Order(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("processing", "Processing"),
        ("shipped", "Shipped"),
        ("out_for_delivery", "Out for Delivery"),
        ("delivered", "Delivered"),
        ("cancelled", "Cancelled"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="orders",
    )
    order_number = models.CharField(max_length=20, unique=True, editable=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)

    # Shipping address
    shipping_name = models.CharField(max_length=200)
    shipping_email = models.EmailField()
    shipping_phone = models.CharField(max_length=20, blank=True, default="")
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
        # Better order ID: timestamp + random UUID
        timestamp = int(time.time() * 1000)  # milliseconds
        random_part = uuid.uuid4().hex[:6].upper()
        return f"ORD-{timestamp}-{random_part}"

    def __str__(self):
        return f"{self.order_number} ({self.user.email})"


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
