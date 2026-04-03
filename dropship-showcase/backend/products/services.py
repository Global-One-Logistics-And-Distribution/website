from django.core.cache import cache
from django.db.models import Count, Sum

from orders.models import OrderItem

from .models import Product
from .serializers import ProductListSerializer

TOP_PRODUCTS_CACHE_KEY = "products:top"
TOP_CATEGORIES_CACHE_KEY = "products:top-categories"
TOP_PRODUCTS_CACHE_TTL = 300
TOP_CATEGORIES_CACHE_TTL = 600


def build_top_products_payload(limit=8):
    ranked = list(
        OrderItem.objects.values("product_id")
        .annotate(total_quantity=Sum("quantity"))
        .order_by("-total_quantity")[:limit]
    )

    if not ranked:
        products = Product.objects.filter(is_active=True).only(
            "id",
            "name",
            "short_description",
            "price",
            "category",
            "brand",
            "image_url",
            "gallery_urls",
            "size_stock",
            "stock",
            "rating",
        )[:limit]
        return {"products": ProductListSerializer(products, many=True).data}

    ids = [row["product_id"] for row in ranked]
    products = Product.objects.filter(id__in=ids, is_active=True).only(
        "id",
        "name",
        "short_description",
        "price",
        "category",
        "brand",
        "image_url",
        "gallery_urls",
        "size_stock",
        "stock",
        "rating",
    )
    product_map = {product.id: product for product in products}
    ordered = [product_map[pid] for pid in ids if pid in product_map]
    return {"products": ProductListSerializer(ordered, many=True).data}


def build_top_categories_payload(limit=12):
    categories = list(
        Product.objects.filter(is_active=True)
        .exclude(category="")
        .values("category")
        .annotate(product_count=Count("id"))
        .order_by("-product_count", "category")[:limit]
    )
    return {"categories": categories}


def warm_product_aggregate_caches():
    cache.set(
        TOP_PRODUCTS_CACHE_KEY,
        build_top_products_payload(),
        TOP_PRODUCTS_CACHE_TTL,
    )
    cache.set(
        TOP_CATEGORIES_CACHE_KEY,
        build_top_categories_payload(),
        TOP_CATEGORIES_CACHE_TTL,
    )
