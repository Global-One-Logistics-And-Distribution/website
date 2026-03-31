from rest_framework import serializers
from .models import Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    subtotal = serializers.ReadOnlyField()

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "product_id",
            "product_name",
            "product_image",
            "price",
            "quantity",
            "shoe_size",
            "subtotal",
        ]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "order_number",
            "status",
            "status_display",
            "total_amount",
            "shipping_name",
            "shipping_email",
            "shipping_phone",
            "shipping_address",
            "shipping_city",
            "shipping_pincode",
            "shipping_state",
            "notes",
            "items",
            "created_at",
            "updated_at",
        ]


class ProductImageField(serializers.CharField):
    """Accepts blank/empty product_image values without URL validation errors."""
    def to_internal_value(self, data):
        value = super().to_internal_value(data)
        return value


class CreateOrderItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(min_value=1)
    product_name = serializers.CharField(max_length=255)
    product_image = ProductImageField(max_length=1000, required=False, allow_blank=True, default="")
    price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)
    quantity = serializers.IntegerField(min_value=1, max_value=99)
    shoe_size = serializers.CharField(max_length=10, required=False, allow_blank=True, default="")


class CreateOrderSerializer(serializers.Serializer):
    shipping_name = serializers.CharField(max_length=200)
    shipping_email = serializers.EmailField()
    shipping_phone = serializers.CharField(max_length=20, required=False, allow_blank=True, default="")
    shipping_address = serializers.CharField()
    shipping_city = serializers.CharField(max_length=100)
    shipping_pincode = serializers.CharField(max_length=10)
    shipping_state = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    items = CreateOrderItemSerializer(many=True)

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("Order must have at least one item.")
        return value
