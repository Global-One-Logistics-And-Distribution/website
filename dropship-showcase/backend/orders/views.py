from decimal import Decimal
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Order, OrderItem
from .serializers import OrderSerializer, CreateOrderSerializer


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
        except Exception:
            return Response(
                {"error": "Unable to place order right now. Please try again."},
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
