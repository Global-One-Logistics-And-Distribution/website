from django.db import models
from django.conf import settings


class CartItem(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="cart_items",
    )
    product_id = models.PositiveIntegerField()
    quantity = models.PositiveIntegerField(default=1)
    selected_size = models.CharField(max_length=10, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "cart_items"
        unique_together = [("user", "product_id")]
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["product_id"]),
        ]

    def __str__(self):
        size_suffix = f", size={self.selected_size}" if self.selected_size else ""
        return f"CartItem(user={self.user_id}, product={self.product_id}, qty={self.quantity}{size_suffix})"
