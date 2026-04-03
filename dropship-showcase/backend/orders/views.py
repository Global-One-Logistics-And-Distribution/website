from decimal import Decimal
import logging
from django.conf import settings
from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Order, OrderItem
from .serializers import OrderSerializer, CreateOrderSerializer
from products.models import Product


logger = logging.getLogger(__name__)
SHOE_SIZES = {"7", "8", "9", "10", "11"}


def _is_shoe_category(category):
    return "shoe" in (category or "").strip().lower()


def _size_stock_qty(product, size):
    size_map = product.size_stock if isinstance(product.size_stock, dict) else {}
    return int(size_map.get(str(size).strip(), 0) or 0)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def order_list(request):
    user = request.user

    if request.method == "GET":
        orders = (
            Order.objects.filter(user=user)
            .select_related("user")
            .prefetch_related("items")
        )
        return Response({"orders": OrderSerializer(orders, many=True).data})

    if request.method == "POST":
        if not getattr(user, "email_verified", False):
            return Response(
                {"error": "Please verify your email before placing an order."},
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            serializer = CreateOrderSerializer(data=request.data)
            if not serializer.is_valid():
                return Response({"errors": serializer.errors}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

            data = serializer.validated_data
            items_data = data.pop("items")
            data["shipping_email"] = user.email
            product_ids = [item["product_id"] for item in items_data]

            with transaction.atomic():
                products = (
                    Product.objects.select_for_update()
                    .filter(id__in=product_ids, is_active=True)
                    .only("id", "category", "name", "price", "image_url", "stock", "size_stock")
                )
                products_by_id = {product.id: product for product in products}

                missing_ids = sorted({product_id for product_id in product_ids if product_id not in products_by_id})
                if missing_ids:
                    return Response(
                        {"errors": {"items": [f"Product {pid} is unavailable." for pid in missing_ids]}},
                        status=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    )

                requested_quantities = {}
                requested_size_quantities = {}
                normalized_items = []
                for item in items_data:
                    product_id = item["product_id"]
                    quantity = item["quantity"]
                    requested_quantities[product_id] = requested_quantities.get(product_id, 0) + quantity

                    product = products_by_id[product_id]
                    shoe_size = str(item.get("shoe_size", "")).strip()
                    if _is_shoe_category(product.category):
                        if not shoe_size:
                            return Response(
                                {
                                    "errors": {
                                        "items": [
                                            f"Shoe size is required for product {product_id}."
                                        ]
                                    }
                                },
                                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            )
                        if shoe_size not in SHOE_SIZES:
                            return Response(
                                {
                                    "errors": {
                                        "items": [
                                            f"Invalid shoe size '{shoe_size}' for product {product_id}."
                                        ]
                                    }
                                },
                                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            )

                        size_key = str(shoe_size)
                        requested_size_quantities[(product_id, size_key)] = (
                            requested_size_quantities.get((product_id, size_key), 0) + quantity
                        )

                    normalized_items.append(
                        {
                            "product_id": product.id,
                            "product_name": product.name,
                            "product_image": product.image_url or "",
                            "price": product.price,
                            "quantity": quantity,
                            "shoe_size": shoe_size,
                        }
                    )

                for product_id, quantity in requested_quantities.items():
                    product = products_by_id[product_id]
                    if _is_shoe_category(product.category):
                        continue
                    if product.stock < quantity:
                        return Response(
                            {
                                "errors": {
                                    "items": [
                                        f"Only {product.stock} unit(s) left for product {product_id}."
                                    ]
                                }
                            },
                            status=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        )

                for (product_id, shoe_size), quantity in requested_size_quantities.items():
                    product = products_by_id[product_id]
                    available = _size_stock_qty(product, shoe_size)
                    if available < quantity:
                        return Response(
                            {
                                "errors": {
                                    "items": [
                                        f"Only {available} unit(s) left for product {product_id} in size {shoe_size}."
                                    ]
                                }
                            },
                            status=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        )

                total = sum((item["price"] * item["quantity"] for item in normalized_items), Decimal("0"))

                order = Order.objects.create(
                    user=user,
                    total_amount=total,
                    **data,
                )

                for item in normalized_items:
                    OrderItem.objects.create(order=order, **item)

                for product_id, quantity in requested_quantities.items():
                    product = products_by_id[product_id]
                    if _is_shoe_category(product.category):
                        continue
                    product.stock = max(0, int(product.stock or 0) - quantity)
                    product.save(update_fields=["stock", "updated_at"])

                for (product_id, shoe_size), quantity in requested_size_quantities.items():
                    product = products_by_id[product_id]
                    size_map = dict(product.size_stock or {})
                    current_qty = int(size_map.get(shoe_size, 0) or 0)
                    size_map[shoe_size] = max(0, current_qty - quantity)
                    product.size_stock = size_map
                    product.save(update_fields=["size_stock", "stock", "updated_at"])

                # Clear cart after placing order
                from cart.models import CartItem

                CartItem.objects.filter(user=user).delete()

            return Response(
                {"order": OrderSerializer(order).data},
                status=status.HTTP_201_CREATED,
            )
        except Exception as exc:
            logger.exception("Order placement failed for user_id=%s", getattr(user, "id", None))
            return Response(
                {
                    "error": "Unable to place order right now. Please try again.",
                    **({"debug": str(exc)} if getattr(settings, "DEBUG", False) else {}),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def order_detail(request, order_number):
    try:
        order = Order.objects.select_related("user").prefetch_related("items").get(
            user=request.user, order_number=order_number
        )
    except Order.DoesNotExist:
        return Response({"error": "Order not found."}, status=status.HTTP_404_NOT_FOUND)
    return Response({"order": OrderSerializer(order).data})
