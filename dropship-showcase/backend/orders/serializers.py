from decimal import Decimal
from rest_framework import serializers
from .models import Order, OrderItem, Coupon, ReturnRequest


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
    return_requests = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "order_number",
            "status",
            "status_display",
            "total_amount",
            "discount_amount",
            "coupon_code",
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
            "return_requests",
            "created_at",
            "updated_at",
        ]

    def get_return_requests(self, obj):
        requests = getattr(obj, "return_requests", None)
        if requests is None:
            return []
        try:
            return ReturnRequestSerializer(requests.all(), many=True).data
        except Exception:
            return []


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
    coupon_code = serializers.CharField(max_length=50, required=False, allow_blank=True, default="")
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


class CouponSerializer(serializers.ModelSerializer):
    discount_type_display = serializers.CharField(source="get_discount_type_display", read_only=True)

    class Meta:
        model = Coupon
        fields = [
            "id",
            "code",
            "name",
            "description",
            "terms",
            "discount_type",
            "discount_type_display",
            "discount_value",
            "minimum_order_amount",
            "maximum_discount_amount",
            "usage_limit_total",
            "usage_limit_per_user",
            "eligible_user_limit",
            "allowed_emails",
            "allowed_product_ids",
            "active",
            "starts_at",
            "ends_at",
            "usage_count",
            "created_at",
            "updated_at",
        ]


class CouponValidationSerializer(serializers.Serializer):
    coupon_code = serializers.CharField(max_length=50)
    order_total = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0"))


class ReturnRequestSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source="order.order_number", read_only=True)
    order_status = serializers.CharField(source="order.get_status_display", read_only=True)
    resolution_display = serializers.CharField(source="get_resolution_display", read_only=True)

    class Meta:
        model = ReturnRequest
        fields = [
            "id",
            "order",
            "order_number",
            "order_status",
            "reason",
            "resolution",
            "resolution_display",
            "status",
            "refund_status",
            "refund_amount",
            "notes",
            "created_at",
            "updated_at",
            "resolved_at",
        ]
        read_only_fields = ["order", "created_at", "updated_at", "resolved_at"]


class CreateReturnRequestSerializer(serializers.Serializer):
    order_number = serializers.CharField(max_length=20)
    reason = serializers.CharField()
    resolution = serializers.ChoiceField(choices=["refund", "return"], default="refund")

    def validate_reason(self, value):
        cleaned = str(value or "").strip()
        if len(cleaned) < 10:
            raise serializers.ValidationError("Please provide a detailed reason for the return.")
        return cleaned
