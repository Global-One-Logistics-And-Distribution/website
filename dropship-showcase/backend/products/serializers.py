from rest_framework import serializers
from .models import Product


class ProductListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
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
        ]


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "description",
            "short_description",
            "price",
            "category",
            "brand",
            "product_code",
            "image_url",
            "gallery_urls",
            "features",
            "size_stock",
            "stock",
            "rating",
            "is_active",
            "created_at",
            "updated_at",
        ]
