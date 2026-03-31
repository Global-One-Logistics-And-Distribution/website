from decimal import Decimal
import logging
from django.conf import settings
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


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def order_list(request):
    user = request.user

    if request.method == "GET":
        orders = Order.objects.filter(user=user).prefetch_related("items")
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

            product_ids = [item["product_id"] for item in items_data]
            products = Product.objects.filter(id__in=product_ids, is_active=True).only("id", "category")
            products_by_id = {product.id: product for product in products}

            for item in items_data:
                product_id = item["product_id"]
                product = products_by_id.get(product_id)
                if not product:
                    return Response(
                        {"errors": {"items": [f"Product {product_id} is unavailable."]}},
                        status=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    )

                shoe_size = str(item.get("shoe_size", "")).strip()
                item["shoe_size"] = shoe_size
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

            total = sum(
                Decimal(str(item["price"])) * item["quantity"] for item in items_data
            )

            order = Order.objects.create(
                user=user,
                total_amount=total,
                **data,
            )

            for item in items_data:
                OrderItem.objects.create(order=order, **item)

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
        order = Order.objects.prefetch_related("items").get(
            user=request.user, order_number=order_number
        )
    except Order.DoesNotExist:
        return Response({"error": "Order not found."}, status=status.HTTP_404_NOT_FOUND)
    return Response({"order": OrderSerializer(order).data})
