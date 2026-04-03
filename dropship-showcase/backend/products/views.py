from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.core.cache import cache

from .models import Product
from .serializers import ProductSerializer, ProductListSerializer
from .services import (
    TOP_CATEGORIES_CACHE_KEY,
    TOP_CATEGORIES_CACHE_TTL,
    TOP_PRODUCTS_CACHE_KEY,
    TOP_PRODUCTS_CACHE_TTL,
    build_top_categories_payload,
    build_top_products_payload,
)


PRODUCT_LIST_CACHE_TTL = 120
PRODUCT_DETAIL_CACHE_TTL = 180


def _cached_response(payload, max_age):
    response = Response(payload)
    response["Cache-Control"] = f"public, max-age={max_age}, stale-while-revalidate=60"
    return response


@api_view(["GET"])
@permission_classes([AllowAny])
def product_list(request):
    category = (request.query_params.get("category") or "").strip().lower()
    brand = (request.query_params.get("brand") or "").strip().lower()
    search = (request.query_params.get("q") or "").strip().lower()

    cache_key = f"products:list:{category}:{brand}:{search}"
    cached_payload = cache.get(cache_key)
    if cached_payload is not None:
        return _cached_response(cached_payload, PRODUCT_LIST_CACHE_TTL)

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
    )

    if category:
        products = products.filter(category__icontains=category)

    if brand:
        products = products.filter(brand__icontains=brand)

    if search:
        products = products.filter(name__icontains=search)

    payload = {"products": ProductListSerializer(products, many=True).data}
    cache.set(cache_key, payload, PRODUCT_LIST_CACHE_TTL)
    return _cached_response(payload, PRODUCT_LIST_CACHE_TTL)


@api_view(["GET"])
@permission_classes([AllowAny])
def product_detail(request, pk):
    cache_key = f"products:detail:{pk}"
    cached_payload = cache.get(cache_key)
    if cached_payload is not None:
        return _cached_response(cached_payload, PRODUCT_DETAIL_CACHE_TTL)

    try:
        product = Product.objects.get(pk=pk, is_active=True)
    except Product.DoesNotExist:
        return Response({"error": "Product not found."}, status=status.HTTP_404_NOT_FOUND)

    payload = {"product": ProductSerializer(product).data}
    cache.set(cache_key, payload, PRODUCT_DETAIL_CACHE_TTL)
    return _cached_response(payload, PRODUCT_DETAIL_CACHE_TTL)


@api_view(["GET"])
@permission_classes([AllowAny])
def top_products(request):
    cached_payload = cache.get(TOP_PRODUCTS_CACHE_KEY)
    if cached_payload is not None:
        return _cached_response(cached_payload, TOP_PRODUCTS_CACHE_TTL)

    payload = build_top_products_payload()
    cache.set(TOP_PRODUCTS_CACHE_KEY, payload, TOP_PRODUCTS_CACHE_TTL)
    return _cached_response(payload, TOP_PRODUCTS_CACHE_TTL)


@api_view(["GET"])
@permission_classes([AllowAny])
def top_categories(request):
    cached_payload = cache.get(TOP_CATEGORIES_CACHE_KEY)
    if cached_payload is not None:
        return _cached_response(cached_payload, TOP_CATEGORIES_CACHE_TTL)

    payload = build_top_categories_payload()
    cache.set(TOP_CATEGORIES_CACHE_KEY, payload, TOP_CATEGORIES_CACHE_TTL)
    return _cached_response(payload, TOP_CATEGORIES_CACHE_TTL)
