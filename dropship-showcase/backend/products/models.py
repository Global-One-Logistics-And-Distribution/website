from django.db import models
from django.db import transaction
from django.db.utils import OperationalError, ProgrammingError


class Product(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    short_description = models.CharField(max_length=500, blank=True, default="")
    price = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.CharField(max_length=100, blank=True, default="", db_index=True)
    brand = models.CharField(max_length=100, blank=True, default="", db_index=True)
    product_code = models.CharField(max_length=100, blank=True, default="", db_index=True)
    image_url = models.URLField(max_length=1000, blank=True, default="")
    gallery_urls = models.JSONField(default=list, blank=True)
    features = models.JSONField(default=list, blank=True)
    size_stock = models.JSONField(default=dict, blank=True)
    stock = models.PositiveIntegerField(default=0)
    rating = models.DecimalField(max_digits=3, decimal_places=1, default=0)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "products"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["is_active", "created_at"]),
            models.Index(fields=["is_active", "category"]),
            models.Index(fields=["is_active", "brand"]),
        ]

    def save(self, *args, **kwargs):
        # Keep size-wise shoe inventory normalized and aligned with aggregate stock.
        category_name = (self.category or "").strip().lower()
        is_shoe = "shoe" in category_name
        normalized = {}
        raw_size_stock = self.size_stock if isinstance(self.size_stock, dict) else {}
        for size, qty in raw_size_stock.items():
            size_key = str(size).strip()
            if not size_key:
                continue
            try:
                normalized_qty = max(0, int(qty))
            except (TypeError, ValueError):
                continue
            normalized[size_key] = normalized_qty

        if is_shoe:
            self.size_stock = normalized
            self.stock = sum(normalized.values())
        else:
            self.size_stock = {}

        # Reuse the smallest missing positive ID when creating a new product.
        if self.pk is None:
            with transaction.atomic():
                existing_ids = self.__class__.objects.order_by("id").values_list("id", flat=True)
                next_id = 1
                for existing_id in existing_ids:
                    if existing_id != next_id:
                        break
                    next_id += 1
                self.pk = next_id
                super().save(*args, **kwargs)
            return

        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class SiteMaintenanceSettings(models.Model):
    singleton_key = models.PositiveSmallIntegerField(default=1, unique=True, editable=False)
    whole_site_maintenance = models.BooleanField(default=False)
    products_maintenance = models.BooleanField(default=False)
    sign_maintenance = models.BooleanField(default=False)
    checkout_maintenance = models.BooleanField(default=False)
    maintenance_message = models.CharField(
        max_length=255,
        blank=True,
        default="We are doing scheduled maintenance. Please try again shortly.",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "site_maintenance_settings"
        verbose_name = "Site Maintenance Settings"
        verbose_name_plural = "Site Maintenance Settings"

    def save(self, *args, **kwargs):
        self.singleton_key = 1
        super().save(*args, **kwargs)

    def __str__(self):
        return "Site Maintenance Settings"

    @classmethod
    def get_solo(cls):
        try:
            obj, _ = cls.objects.get_or_create(singleton_key=1)
            return obj
        except (OperationalError, ProgrammingError):
            # Fail open so public pages don't crash when migration/db is temporarily unavailable.
            return cls(singleton_key=1)

    def as_public_payload(self):
        message = (self.maintenance_message or "").strip() or "This section is under maintenance."
        return {
            "whole_site": bool(self.whole_site_maintenance),
            "products": bool(self.products_maintenance),
            "sign": bool(self.sign_maintenance),
            "checkout": bool(self.checkout_maintenance),
            "message": message,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
