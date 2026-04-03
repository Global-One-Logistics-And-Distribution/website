from rest_framework import serializers
from .models import CartItem
from products.models import Product
from products.serializers import ProductListSerializer


CART_MAX_QUANTITY = 10


class CartItemSerializer(serializers.ModelSerializer):
    product = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ["product_id", "quantity", "selected_size", "product"]

    def get_product(self, obj):
        products_map = self.context.get("products_map") or {}
        product = products_map.get(obj.product_id)
        if product is None:
            product = Product.objects.filter(id=obj.product_id, is_active=True).only(
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
            ).first()
        if not product:
            return None
        return ProductListSerializer(product).data


class AddToCartSerializer(serializers.Serializer):
    productId = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1, max_value=CART_MAX_QUANTITY, default=1)
    selectedSize = serializers.CharField(max_length=10, required=False, allow_blank=True, default="")


class SyncCartSerializer(serializers.Serializer):
    items = AddToCartSerializer(many=True, required=False, default=list)


class UpdateQuantitySerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1, max_value=CART_MAX_QUANTITY)
