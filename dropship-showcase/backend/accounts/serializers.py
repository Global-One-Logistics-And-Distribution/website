import re
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import User


class SignupSerializer(serializers.Serializer):
    name = serializers.CharField(min_length=2, max_length=100, trim_whitespace=True)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_email(self, value):
        return value.lower().strip()

    def validate_password(self, value):
        if not re.search(r"[A-Z]", value):
            raise serializers.ValidationError("Password must contain at least one uppercase letter.")
        if not re.search(r"[0-9]", value):
            raise serializers.ValidationError("Password must contain at least one number.")
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def validate_name(self, value):
        stripped = value.strip()
        if len(stripped) < 2:
            raise serializers.ValidationError("Name must be at least 2 characters.")
        return stripped

    def create(self, validated_data):
        return User.objects.create_user(
            email=validated_data["email"],
            name=validated_data["name"],
            password=validated_data["password"],
        )


class SigninSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate_email(self, value):
        return value.lower().strip()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "name", "email", "email_verified", "created_at"]


class UpdateProfileSerializer(serializers.Serializer):
    name = serializers.CharField(min_length=2, max_length=100, trim_whitespace=True, required=False)
    email = serializers.EmailField(required=False)

    def validate_email(self, value):
        return value.lower().strip()

    def validate_name(self, value):
        stripped = value.strip()
        if len(stripped) < 2:
            raise serializers.ValidationError("Name must be at least 2 characters.")
        return stripped

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError("No fields provided to update.")
        return attrs
