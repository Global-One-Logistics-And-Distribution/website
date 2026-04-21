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
            "invoice_id",
            "invoice_number",
            "invoice_status",
            "invoice_url",
            "invoice_created_at",
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
    # Kept optional for backward compatibility; server trusts DB values only.
    product_name = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")
    product_image = ProductImageField(max_length=1000, required=False, allow_blank=True, default="")
    # Kept optional for backward compatibility; server calculates trusted prices.
    price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0, required=False, default=0)
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
    items = CreateOrderItemSerializer(many=True, required=False, default=list)
    payment_proof = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")
    razorpay_order_id = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")
    razorpay_payment_id = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")

    def validate_shipping_phone(self, value):
        raw = str(value or "").strip().replace(" ", "")
        if raw.startswith("+91"):
            raw = raw[3:]
        elif raw.startswith("91") and len(raw) == 12:
            raw = raw[2:]

        if raw and (not raw.isdigit() or len(raw) != 10 or raw[0] not in "6789"):
            raise serializers.ValidationError(
                "Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9."
            )
        return raw

    def validate_items(self, value):
        return value
