from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.core.cache import cache
from django.conf import settings
from django.http import HttpResponse
from django.utils.text import slugify
from xml.etree import ElementTree as ET

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
MERCHANT_FEED_CACHE_TTL = 900


def _cached_response(payload, max_age):
    response = Response(payload)
    response["Cache-Control"] = f"public, max-age={max_age}, stale-while-revalidate=60"
    return response


def _build_storefront_product_url(base_url, product):
    product_slug = slugify(product.name or "product") or "product"
    return f"{base_url}/products/{product_slug}"


def _pick_primary_image(product):
    if product.image_url:
        return product.image_url
    if isinstance(product.gallery_urls, list):
        for image_url in product.gallery_urls:
            if image_url:
                return image_url
    return ""


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


def google_merchant_feed(request):
    cached_xml = cache.get("feeds:google-merchant-xml")
    if cached_xml is not None:
        response = HttpResponse(cached_xml, content_type="application/xml; charset=utf-8")
        response["Cache-Control"] = f"public, max-age={MERCHANT_FEED_CACHE_TTL}, stale-while-revalidate=60"
        return response

    storefront_url = (getattr(settings, "STOREFRONT_URL", "") or "").strip().rstrip("/")
    if not storefront_url:
        storefront_url = request.build_absolute_uri("/").rstrip("/")

    products = Product.objects.filter(is_active=True).only(
        "id",
        "name",
        "description",
        "short_description",
        "price",
        "brand",
        "category",
        "product_code",
        "image_url",
        "gallery_urls",
        "stock",
    )

    root = ET.Element("rss", attrib={"version": "2.0", "xmlns:g": "http://base.google.com/ns/1.0"})
    channel = ET.SubElement(root, "channel")
    ET.SubElement(channel, "title").text = "EliteDrop Product Feed"
    ET.SubElement(channel, "link").text = storefront_url
    ET.SubElement(channel, "description").text = "Google Merchant Center product feed for EliteDrop."

    for product in products:
        item = ET.SubElement(channel, "item")
        ET.SubElement(item, "g:id").text = str(product.id)
        ET.SubElement(item, "g:title").text = (product.name or "").strip()[:150]

        description = (product.short_description or product.description or "").strip()
        if not description:
            description = product.name or ""
        ET.SubElement(item, "g:description").text = description[:5000]

        ET.SubElement(item, "g:link").text = _build_storefront_product_url(storefront_url, product)

        image_url = _pick_primary_image(product)
        if image_url:
            ET.SubElement(item, "g:image_link").text = image_url

        ET.SubElement(item, "g:availability").text = "in_stock" if product.stock > 0 else "out_of_stock"
        ET.SubElement(item, "g:price").text = f"{product.price:.2f} INR"
        ET.SubElement(item, "g:condition").text = "new"

        if product.brand:
            ET.SubElement(item, "g:brand").text = product.brand.strip()
        if product.product_code:
            ET.SubElement(item, "g:mpn").text = product.product_code.strip()
        if product.category:
            ET.SubElement(item, "g:product_type").text = product.category.strip()

    xml_payload = ET.tostring(root, encoding="utf-8", xml_declaration=True)
    cache.set("feeds:google-merchant-xml", xml_payload, MERCHANT_FEED_CACHE_TTL)

    response = HttpResponse(xml_payload, content_type="application/xml; charset=utf-8")
    response["Cache-Control"] = f"public, max-age={MERCHANT_FEED_CACHE_TTL}, stale-while-revalidate=60"
    return response
