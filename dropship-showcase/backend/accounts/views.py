from django.contrib.auth import authenticate
from django.conf import settings
from django.db import IntegrityError
from django.utils import timezone
from django.utils.crypto import get_random_string
from datetime import timedelta
import logging
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from .models import User
from .serializers import SignupSerializer, SigninSerializer, UserSerializer, UpdateProfileSerializer
from .utils import send_verification_email
from .firebase_auth import verify_firebase_id_token


logger = logging.getLogger(__name__)


class LoginRateThrottle(AnonRateThrottle):
    rate = "10/hour"
    scope = "login"


def _token_response(user):
    """Return {token, user} payload used by frontend."""
    return _token_response_with_remember(user, remember_me=True)


def _token_response_with_remember(user, remember_me=True):
    """Return token payload with lifetime based on remember_me."""
    refresh = RefreshToken.for_user(user)
    access = refresh.access_token

    if remember_me:
        access_lifetime_days = settings.SIMPLE_JWT.get("ACCESS_TOKEN_LIFETIME", timedelta(days=7))
        access.set_exp(lifetime=access_lifetime_days)
    else:
        session_hours = int(getattr(settings, "JWT_SESSION_LIFETIME_HOURS", 12) or 12)
        access.set_exp(lifetime=timedelta(hours=session_hours))

    return {
        "token": str(access),
        "user": UserSerializer(user).data,
        "remember_me": bool(remember_me),
    }


def _upsert_social_user(email, name):
    user = User.objects.filter(email=email).first()
    if user is None:
        user = User.objects.create_user(
            email=email,
            name=name or "User",
            password=get_random_string(48),
        )
    elif name and user.name != name:
        user.name = name
        user.save(update_fields=["name"])

    if not user.email_verified:
        user.email_verified = True
        user.email_verification_code = ""
        user.email_verification_expires_at = None
        user.save(update_fields=["email_verified", "email_verification_code", "email_verification_expires_at"])

    return user


def _parse_remember_me(request):
    return bool(request.data.get("remember_me", True))


@api_view(["POST"])
@permission_classes([AllowAny])
def signup(request):
    serializer = SignupSerializer(data=request.data)
    if not serializer.is_valid():
        errors = serializer.errors
        # Flatten errors to match frontend expectations: {errors:[{path,msg}]}
        flat = []
        for field, msgs in errors.items():
            field_name = "form" if field in ("non_field_errors", "error") else field
            for msg in msgs:
                flat.append({"path": field_name, "msg": str(msg)})
        return Response(
            {
                "error": "Please correct the highlighted fields.",
                "errors": flat,
            },
            status=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )

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
    remember_me = _parse_remember_me(request)

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

    return Response(_token_response_with_remember(user, remember_me=remember_me))


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([LoginRateThrottle])
def google_signin(request):
    raw_token = str(request.data.get("id_token", "")).strip()
    remember_me = _parse_remember_me(request)
    if not raw_token:
        return Response({"error": "Google token is required."}, status=status.HTTP_400_BAD_REQUEST)

    client_id = getattr(settings, "GOOGLE_CLIENT_ID", "")
    if not client_id:
        return Response(
            {"error": "Google sign in is not configured on the server."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    try:
        info = google_id_token.verify_oauth2_token(raw_token, google_requests.Request(), client_id)
    except ValueError:
        return Response({"error": "Invalid Google token."}, status=status.HTTP_401_UNAUTHORIZED)

    email = str(info.get("email", "")).lower().strip()
    if not email:
        return Response({"error": "Google account email is missing."}, status=status.HTTP_400_BAD_REQUEST)

    name = str(info.get("name", "")).strip() or email.split("@", 1)[0].title()
    user = _upsert_social_user(email=email, name=name)
    return Response(_token_response_with_remember(user, remember_me=remember_me))


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([LoginRateThrottle])
def firebase_signin(request):
    raw_token = str(request.data.get("id_token", "")).strip()
    remember_me = _parse_remember_me(request)
    if not raw_token:
        return Response({"error": "Firebase token is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        info = verify_firebase_id_token(raw_token)
    except RuntimeError:
        return Response(
            {"error": "Firebase sign in is not configured on the server."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    except Exception as exc:
        logger.warning("Firebase token verification failed: %s", exc)
        payload = {"error": "Invalid Firebase token."}
        if settings.DEBUG:
            payload["detail"] = str(exc)
        return Response(payload, status=status.HTTP_401_UNAUTHORIZED)

    email = str(info.get("email", "")).lower().strip()
    if not email:
        return Response({"error": "Firebase account email is missing."}, status=status.HTTP_400_BAD_REQUEST)

    name = str(request.data.get("name", "")).strip() or str(info.get("name", "")).strip()
    if not name:
        name = email.split("@", 1)[0].title()

    user = _upsert_social_user(email=email, name=name)
    return Response(_token_response_with_remember(user, remember_me=remember_me))


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
