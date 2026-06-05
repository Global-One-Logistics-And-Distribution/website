from rest_framework import serializers
from .models import Product, HeroSlide


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


class HeroSlideSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = HeroSlide
        fields = [
            "id",
            "title",
            "subtitle",
            "eyebrow",
            "cta_label",
            "cta_url",
            "image",
            "sort_order",
        ]

    def get_image(self, obj):
        image_path = obj.resolve_image_url()
        if not image_path:
            return ""

        request = self.context.get("request")
        if request and image_path.startswith("/"):
            return request.build_absolute_uri(image_path)
        return image_path
