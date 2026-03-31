from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import CartItem
from .serializers import (
    CART_MAX_QUANTITY,
    CartItemSerializer,
    AddToCartSerializer,
    SyncCartSerializer,
    UpdateQuantitySerializer,
)
from products.models import Product


def _products_map_for_cart_items(items):
    product_ids = [item.product_id for item in items]
    if not product_ids:
        return {}

    products = Product.objects.filter(id__in=product_ids, is_active=True).only(
        "id",
        "name",
        "short_description",
        "price",
        "category",
        "brand",
        "image_url",
        "gallery_urls",
        "stock",
        "rating",
    )
    return {product.id: product for product in products}


def _serialize_cart_items(items):
    products_map = _products_map_for_cart_items(items)
    return CartItemSerializer(items, many=True, context={"products_map": products_map}).data


@api_view(["GET", "POST", "DELETE"])
@permission_classes([IsAuthenticated])
def cart_list(request):
    user = request.user

    if request.method == "GET":
        items = CartItem.objects.filter(user=user)
        return Response({"items": _serialize_cart_items(items)})

    if request.method == "POST":
        serializer = AddToCartSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

        product_id = serializer.validated_data["productId"]
        quantity = serializer.validated_data["quantity"]
        selected_size = (serializer.validated_data.get("selectedSize") or "").strip()

        product = Product.objects.filter(id=product_id, is_active=True).first()
        if not product:
            return Response({"error": "Product not found."}, status=status.HTTP_404_NOT_FOUND)

        max_allowed = min(CART_MAX_QUANTITY, int(product.stock or 0))
        if max_allowed < 1:
            return Response(
                {"errors": {"quantity": ["This product is out of stock."]}},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        item, created = CartItem.objects.get_or_create(
            user=user,
            product_id=product_id,
            defaults={"quantity": quantity, "selected_size": selected_size},
        )

        new_quantity = quantity if created else (item.quantity + quantity)
        if new_quantity > max_allowed:
            return Response(
                {
                    "errors": {
                        "quantity": [
                            f"Maximum allowed quantity is {max_allowed} for this product."
                        ]
                    }
                },
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        if not created:
            item.quantity = new_quantity
            if selected_size:
                item.selected_size = selected_size
                item.save(update_fields=["quantity", "selected_size"])
            else:
                item.save(update_fields=["quantity"])

        return Response(
            {"item": CartItemSerializer(item, context={"products_map": {product.id: product}}).data},
            status=status.HTTP_200_OK,
        )

    if request.method == "DELETE":
        CartItem.objects.filter(user=user).delete()
        return Response({"success": True})


@api_view(["PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def cart_item(request, product_id):
    user = request.user

    if request.method == "PUT":
        serializer = UpdateQuantitySerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

        try:
            item = CartItem.objects.get(user=user, product_id=product_id)
        except CartItem.DoesNotExist:
            return Response({"error": "Item not found in cart."}, status=status.HTTP_404_NOT_FOUND)

        product = Product.objects.filter(id=product_id, is_active=True).first()
        if not product:
            return Response({"error": "Product not found."}, status=status.HTTP_404_NOT_FOUND)

        max_allowed = min(CART_MAX_QUANTITY, int(product.stock or 0))
        quantity = serializer.validated_data["quantity"]
        if max_allowed < 1:
            return Response(
                {"errors": {"quantity": ["This product is out of stock."]}},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        if quantity > max_allowed:
            return Response(
                {
                    "errors": {
                        "quantity": [
                            f"Maximum allowed quantity is {max_allowed} for this product."
                        ]
                    }
                },
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        item.quantity = quantity
        item.save(update_fields=["quantity"])
        return Response(
            {"item": CartItemSerializer(item, context={"products_map": {product.id: product}}).data}
        )

    if request.method == "DELETE":
        CartItem.objects.filter(user=user, product_id=product_id).delete()
        return Response({"success": True})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def cart_sync(request):
    serializer = SyncCartSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({"errors": serializer.errors}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

    user = request.user
    incoming_items = serializer.validated_data.get("items") or []

    if incoming_items:
        requested_ids = {item["productId"] for item in incoming_items}
        products = Product.objects.filter(id__in=requested_ids, is_active=True).only("id", "stock")
        products_map = {product.id: product for product in products}

        existing_items = CartItem.objects.filter(user=user, product_id__in=requested_ids)
        existing_map = {item.product_id: item for item in existing_items}

        to_create = []
        to_update = []

        for incoming in incoming_items:
            product_id = incoming["productId"]
            requested_quantity = incoming["quantity"]
            selected_size = (incoming.get("selectedSize") or "").strip()

            product = products_map.get(product_id)
            if not product:
                continue

            max_allowed = min(CART_MAX_QUANTITY, int(product.stock or 0))
            if max_allowed < 1:
                continue

            bounded_quantity = min(requested_quantity, max_allowed)
            existing = existing_map.get(product_id)

            if existing:
                new_quantity = min(max_allowed, existing.quantity + bounded_quantity)
                fields_to_update = []
                if new_quantity != existing.quantity:
                    existing.quantity = new_quantity
                    fields_to_update.append("quantity")
                if selected_size and selected_size != existing.selected_size:
                    existing.selected_size = selected_size
                    fields_to_update.append("selected_size")
                if fields_to_update:
                    to_update.append(existing)
            else:
                to_create.append(
                    CartItem(
                        user=user,
                        product_id=product_id,
                        quantity=bounded_quantity,
                        selected_size=selected_size,
                    )
                )

        if to_create:
            CartItem.objects.bulk_create(to_create, ignore_conflicts=True)

        if to_update:
            CartItem.objects.bulk_update(to_update, ["quantity", "selected_size"])

    final_items = list(CartItem.objects.filter(user=user))
    return Response({"items": _serialize_cart_items(final_items)})
