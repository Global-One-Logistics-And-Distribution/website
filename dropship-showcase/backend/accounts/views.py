from django.contrib.auth import authenticate
from django.conf import settings
from django.db import IntegrityError
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .serializers import SignupSerializer, SigninSerializer, UserSerializer, UpdateProfileSerializer
from .utils import send_verification_email


class LoginRateThrottle(AnonRateThrottle):
    rate = "10/hour"
    scope = "login"


def _dev_verification_fallback(user, email_sent):
    """Return debug-only verification payload when SMTP delivery fails."""
    if settings.DEBUG and not email_sent:
        return {
            "dev_verification_code": user.email_verification_code,
            "dev_note": "Email delivery failed in local mode. Use this code to verify.",
        }
    return {}


def _token_response(user):
    """Return {token, user} payload used by frontend."""
    refresh = RefreshToken.for_user(user)
    return {
        "token": str(refresh.access_token),
        "user": UserSerializer(user).data,
    }


@api_view(["POST"])
@permission_classes([AllowAny])
def signup(request):
    serializer = SignupSerializer(data=request.data)
    if not serializer.is_valid():
        errors = serializer.errors
        # Flatten errors to match frontend expectations: {errors:[{path,msg}]}
        flat = []
        for field, msgs in errors.items():
            for msg in msgs:
                flat.append({"path": field, "msg": str(msg)})
        return Response({"errors": flat}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

    email = serializer.validated_data["email"]
    if User.objects.filter(email=email).exists():
        return Response({"error": "Email is already registered."}, status=status.HTTP_409_CONFLICT)

    user = serializer.save()
    email_sent = send_verification_email(user)
    payload = {
        "requires_verification": True,
        "user": UserSerializer(user).data,
        "message": (
            "Verification code sent to your email. Please verify to finish signing up."
            if email_sent
            else "Account created, but we could not send the verification email right now. Please use resend code."
        ),
        "email_sent": email_sent,
    }
    payload.update(_dev_verification_fallback(user, email_sent))
    return Response(payload, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([LoginRateThrottle])
def signin(request):
    serializer = SigninSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({"error": "Invalid email or password."}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

    email = serializer.validated_data["email"]
    password = serializer.validated_data["password"]

    user = authenticate(request, username=email, password=password)
    if user is None:
        return Response({"error": "Invalid email or password."}, status=status.HTTP_401_UNAUTHORIZED)

    if not user.email_verified:
        code_missing = not user.email_verification_code
        code_expired = bool(
            user.email_verification_expires_at
            and timezone.now() > user.email_verification_expires_at
        )
        email_sent = True
        if code_missing or code_expired:
            email_sent = send_verification_email(user)

        return Response(
            {
                "error": (
                    "Email not verified. Enter the code sent to your inbox to continue."
                    if email_sent
                    else "Email not verified. We could not send a verification email right now. Try resend in a moment."
                ),
                "requires_verification": True,
                "email": user.email,
                "email_sent": email_sent,
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    return Response(_token_response(user))


@api_view(["POST"])
@permission_classes([AllowAny])
def verify_email(request):
    email = str(request.data.get("email", "")).lower().strip()
    code = str(request.data.get("code", "")).strip()

    if not email or not code:
        return Response({"error": "Email and code are required."}, status=status.HTTP_400_BAD_REQUEST)

    if len(code) != 6 or not code.isdigit():
        return Response({"error": "Verification code must be 6 digits."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({"error": "Account not found."}, status=status.HTTP_404_NOT_FOUND)

    if user.email_verified:
        return Response(_token_response(user), status=status.HTTP_200_OK)

    if not user.email_verification_code:
        email_sent = send_verification_email(user)
        return Response(
            {
                "error": "A new code has been sent. Please check your email.",
                "email_sent": email_sent,
                **_dev_verification_fallback(user, email_sent),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if user.email_verification_code != code:
        return Response(
            {"error": "Invalid verification code. Use the latest code sent to your email."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if user.email_verification_expires_at and timezone.now() > user.email_verification_expires_at:
        email_sent = send_verification_email(user)
        return Response(
            {
                "error": "Verification code expired. We've sent a new code.",
                "email_sent": email_sent,
                **_dev_verification_fallback(user, email_sent),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    user.email_verified = True
    user.email_verification_code = ""
    user.email_verification_expires_at = None
    user.save(
        update_fields=[
            "email_verified",
            "email_verification_code",
            "email_verification_expires_at",
        ]
    )

    return Response(_token_response(user), status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([LoginRateThrottle])
def resend_verification(request):
    email = str(request.data.get("email", "")).lower().strip()
    if not email:
        return Response({"error": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({"error": "Account not found."}, status=status.HTTP_404_NOT_FOUND)

    if user.email_verified:
        return Response({"message": "Email is already verified."}, status=status.HTTP_200_OK)

    email_sent = send_verification_email(user)
    if not email_sent:
        debug_payload = _dev_verification_fallback(user, email_sent)
        if debug_payload:
            return Response(
                {
                    "message": "Email could not be sent in local mode; use the OTP shown below.",
                    "email_sent": False,
                    **debug_payload,
                },
                status=status.HTTP_200_OK,
            )
        return Response(
            {"error": "Could not send verification email right now. Please try again shortly."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    return Response({"message": "Verification code resent.", "email_sent": True}, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    return Response({"user": UserSerializer(request.user).data})


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def update_profile(request):
    email_changed = False
    serializer = UpdateProfileSerializer(data=request.data, context={"request": request})
    if not serializer.is_valid():
        return Response({"errors": serializer.errors}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

    user = request.user
    if "name" in serializer.validated_data:
        user.name = serializer.validated_data["name"]
    if "email" in serializer.validated_data:
        new_email = serializer.validated_data["email"]
        if new_email != user.email:
            if User.objects.filter(email=new_email).exists():
                return Response({"error": "Email is already registered."}, status=status.HTTP_409_CONFLICT)
            user.email = new_email
            user.email_verified = False
            user.email_verification_code = ""
            user.email_verification_expires_at = None
            email_changed = True
    try:
        user.save()
    except IntegrityError:
        return Response({"error": "Email is already registered."}, status=status.HTTP_409_CONFLICT)

    if email_changed:
        send_verification_email(user)

    return Response({"user": UserSerializer(user).data})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def delete_account(request):
    password = request.data.get("password", "")
    user = request.user
    if not user.check_password(password):
        return Response({"error": "Incorrect password."}, status=status.HTTP_400_BAD_REQUEST)
    user.delete()
    return Response({"success": True})
