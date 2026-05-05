from decimal import Decimal
from datetime import timedelta
import hashlib
import hmac
import json
import logging
import secrets
import time
from urllib.parse import urlsplit
from django.conf import settings
from django.core.cache import cache
from django.db import transaction
from django.http import HttpResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle

from .models import Order, OrderItem, Coupon, ReturnRequest
from .invoice import build_invoice_html, send_order_invoice_email
from .serializers import (
    OrderSerializer,
    CreateOrderSerializer,
    CouponSerializer,
    CouponValidationSerializer,
    CreateReturnRequestSerializer,
    ReturnRequestSerializer,
)
from products.models import Product
from products.models import SiteMaintenanceSettings
from cart.models import CartItem


logger = logging.getLogger(__name__)
SHOE_SIZES = {"7", "8", "9", "10", "11"}
PROOF_TTL_SECONDS = 15 * 60
PENDING_ORDER_TTL_SECONDS = 20 * 60
USED_PAYMENT_TTL_SECONDS = 7 * 24 * 60 * 60
RETURN_WINDOW_DAYS = 7


def _is_shoe_category(category):
    return "shoe" in (category or "").strip().lower()


def _size_stock_qty(product, size):
    size_map = product.size_stock if isinstance(product.size_stock, dict) else {}
    return int(size_map.get(str(size).strip(), 0) or 0)


def _normalize_coupon_code(value):
    return str(value or "").strip().upper()


def _coupon_discount_for_user(user, coupon, order_total, product_ids=None):
    now = timezone.now()
    order_total = Decimal(order_total or 0)
    product_ids = {int(pid) for pid in (product_ids or []) if str(pid).strip().isdigit()}

    if not coupon.active:
        return None, "This coupon is inactive."
    if coupon.starts_at and coupon.starts_at > now:
        return None, "This coupon is not active yet."
    if coupon.ends_at and coupon.ends_at < now:
        return None, "This coupon has expired."
    if order_total < Decimal(coupon.minimum_order_amount or 0):
        return None, "Order total does not meet the minimum amount for this coupon."
    if coupon.usage_limit_total is not None and coupon.usage_count >= coupon.usage_limit_total:
        return None, "This coupon has reached its usage limit."
    if coupon.usage_limit_per_user is not None and user and user.is_authenticated:
        user_uses = Order.objects.filter(user=user, coupon_code=coupon.code).count()
        if user_uses >= coupon.usage_limit_per_user:
            return None, "You have already used this coupon."
    if coupon.allowed_emails:
        allowed_emails = {str(email).strip().lower() for email in coupon.allowed_emails if str(email).strip()}
        if not user or not user.email or user.email.lower() not in allowed_emails:
            return None, "This coupon is restricted to specific users."
    if coupon.eligible_user_limit:
        eligible_user_ids = list(user.__class__.objects.filter(is_staff=False).order_by("created_at").values_list("id", flat=True))
        if not user or user.id not in eligible_user_ids[: int(coupon.eligible_user_limit)]:
            return None, "This coupon is limited to the first eligible users."
    if coupon.allowed_product_ids:
        allowed_product_ids = {int(pid) for pid in coupon.allowed_product_ids if str(pid).strip().isdigit()}
        if allowed_product_ids and not (product_ids & allowed_product_ids):
            return None, "This coupon only applies to selected products."

    if coupon.discount_type == Coupon.DISCOUNT_FIXED:
        discount = min(order_total, Decimal(coupon.discount_value or 0))
    else:
        discount = (order_total * Decimal(coupon.discount_value or 0)) / Decimal("100")
        if coupon.maximum_discount_amount is not None:
            discount = min(discount, Decimal(coupon.maximum_discount_amount))

    discount = max(Decimal("0"), discount.quantize(Decimal("0.01")))
    if discount <= 0:
        return None, "This coupon does not provide a valid discount."
    return discount, None




class PaymentCreateOrderThrottle(UserRateThrottle):
    scope = "payment_create_order"


class PaymentVerifyThrottle(UserRateThrottle):
    scope = "payment_verify"


def _pending_order_cache_key(user_id, order_id):
    return f"rzp:pending:{user_id}:{order_id}"


def _payment_proof_cache_key(user_id, proof_token):
    return f"rzp:proof:{user_id}:{proof_token}"


def _used_payment_cache_key(payment_id):
    return f"rzp:used:{payment_id}"


def _frontend_base_url(request):
    origin = request.headers.get("Origin") or request.headers.get("Referer") or ""
    if origin:
        parsed = urlsplit(origin)
        if parsed.scheme and parsed.netloc:
            return f"{parsed.scheme}://{parsed.netloc}"

    if getattr(settings, "DEBUG", False):
        return "http://localhost:5173"

    return getattr(settings, "STOREFRONT_URL", "").rstrip("/")


def _build_trusted_cart_snapshot(user, lock_rows=False):
    cart_qs = CartItem.objects.filter(user=user).order_by("created_at")
    if lock_rows:
        cart_qs = cart_qs.select_for_update()

    cart_items = list(cart_qs)
    if not cart_items:
        return None, Response({"error": "Your cart is empty."}, status=status.HTTP_400_BAD_REQUEST)

    product_ids = [item.product_id for item in cart_items]
    products_qs = Product.objects.filter(id__in=product_ids, is_active=True).only(
        "id", "category", "name", "price", "image_url", "stock", "size_stock"
    )
    if lock_rows:
        products_qs = products_qs.select_for_update()

    products_by_id = {product.id: product for product in products_qs}
    missing_ids = sorted({product_id for product_id in product_ids if product_id not in products_by_id})
    if missing_ids:
        return (
            None,
            Response(
                {"errors": {"items": [f"Product {pid} is unavailable." for pid in missing_ids]}},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            ),
        )

    requested_quantities = {}
    requested_size_quantities = {}
    normalized_items = []

    for cart_item in cart_items:
        product_id = cart_item.product_id
        quantity = int(cart_item.quantity or 0)
        if quantity <= 0:
            return None, Response({"error": "Invalid cart quantity."}, status=status.HTTP_400_BAD_REQUEST)

        requested_quantities[product_id] = requested_quantities.get(product_id, 0) + quantity

        product = products_by_id[product_id]
        shoe_size = str(cart_item.selected_size or "").strip()
        if _is_shoe_category(product.category):
            if not shoe_size:
                return (
                    None,
                    Response(
                        {"errors": {"items": [f"Shoe size is required for product {product_id}."]}},
                        status=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    ),
                )
            if shoe_size not in SHOE_SIZES:
                return (
                    None,
                    Response(
                        {"errors": {"items": [f"Invalid shoe size '{shoe_size}' for product {product_id}."]}},
                        status=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    ),
                )
            requested_size_quantities[(product_id, shoe_size)] = (
                requested_size_quantities.get((product_id, shoe_size), 0) + quantity
            )

        normalized_items.append(
            {
                "product_id": product.id,
                "product_name": product.name,
                "product_image": product.image_url or "",
                "price": product.price,
                "quantity": quantity,
                "shoe_size": shoe_size,
            }
        )

    for product_id, quantity in requested_quantities.items():
        product = products_by_id[product_id]
        if _is_shoe_category(product.category):
            continue
        if int(product.stock or 0) < quantity:
            return (
                None,
                Response(
                    {"errors": {"items": [f"Only {product.stock} unit(s) left for product {product_id}."]}},
                    status=status.HTTP_422_UNPROCESSABLE_ENTITY,
                ),
            )

    for (product_id, shoe_size), quantity in requested_size_quantities.items():
        product = products_by_id[product_id]
        available = _size_stock_qty(product, shoe_size)
        if available < quantity:
            return (
                None,
                Response(
                    {
                        "errors": {
                            "items": [f"Only {available} unit(s) left for product {product_id} in size {shoe_size}."]
                        }
                    },
                    status=status.HTTP_422_UNPROCESSABLE_ENTITY,
                ),
            )

    total = sum((item["price"] * item["quantity"] for item in normalized_items), Decimal("0"))
    total_paise = int((total * 100).to_integral_value())

    return (
        {
            "normalized_items": normalized_items,
            "requested_quantities": requested_quantities,
            "requested_size_quantities": requested_size_quantities,
            "products_by_id": products_by_id,
            "total": total,
            "total_paise": total_paise,
            "currency": "INR",
        },
        None,
    )


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def order_list(request):
    user = request.user

    if request.method == "GET":
        orders = (
            Order.objects.filter(user=user)
            .select_related("user")
            .prefetch_related("items", "return_requests")
        )
        return Response({"orders": OrderSerializer(orders, many=True).data})

    if request.method == "POST":
        maintenance_payload = SiteMaintenanceSettings.get_solo().as_public_payload()
        if maintenance_payload["whole_site"] or maintenance_payload["checkout"]:
            return Response(
                {
                    "error": maintenance_payload["message"],
                    "maintenance": maintenance_payload,
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

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
            data.pop("items", None)
            payment_proof = str(data.pop("payment_proof", "")).strip()
            request_order_id = str(data.pop("razorpay_order_id", "")).strip()
            request_payment_id = str(data.pop("razorpay_payment_id", "")).strip()
            if not payment_proof:
                return Response(
                    {"error": "Verified payment proof is required before placing order."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            proof_payload = cache.get(_payment_proof_cache_key(user.id, payment_proof))
            if not proof_payload:
                return Response(
                    {"error": "Payment verification expired. Please retry payment."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            proof_order_id = str(proof_payload.get("order_id", ""))
            proof_payment_id = str(proof_payload.get("payment_id", ""))
            proof_amount = int(proof_payload.get("amount", 0) or 0)
            proof_currency = str(proof_payload.get("currency", "INR")).upper()
            proof_coupon_code = _normalize_coupon_code(proof_payload.get("coupon_code", ""))
            proof_coupon_discount = Decimal(proof_payload.get("coupon_discount", "0") or 0)

            if request_order_id and request_order_id != proof_order_id:
                return Response({"error": "Payment order mismatch."}, status=status.HTTP_400_BAD_REQUEST)
            if request_payment_id and request_payment_id != proof_payment_id:
                return Response({"error": "Payment transaction mismatch."}, status=status.HTTP_400_BAD_REQUEST)

            if cache.get(_used_payment_cache_key(proof_payment_id)):
                return Response({"error": "Payment has already been used."}, status=status.HTTP_400_BAD_REQUEST)

            data["shipping_email"] = user.email

            with transaction.atomic():
                snapshot, snapshot_error = _build_trusted_cart_snapshot(user, lock_rows=True)
                if snapshot_error is not None:
                    return snapshot_error

                if snapshot["total_paise"] < 100:
                    return Response(
                        {"error": "Order amount must be at least 100 paise."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                expected_amount = int(((snapshot["total"] - proof_coupon_discount).quantize(Decimal("0.01")) * 100).to_integral_value())
                if expected_amount != proof_amount or snapshot["currency"] != proof_currency:
                    return Response(
                        {"error": "Payment amount does not match the current cart total."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                note = (data.get("notes") or "").strip()
                payment_note = (
                    f"Paid via Razorpay. Order ID: {proof_order_id}, Payment ID: {proof_payment_id}"
                )
                data["notes"] = f"{note}\n{payment_note}".strip()
                data["coupon_code"] = proof_coupon_code

                order = Order.objects.create(
                    user=user,
                    total_amount=(snapshot["total"] - proof_coupon_discount).quantize(Decimal("0.01")),
                    discount_amount=proof_coupon_discount,
                    **data,
                )

                for item in snapshot["normalized_items"]:
                    OrderItem.objects.create(order=order, **item)

                products_by_id = snapshot["products_by_id"]

                for product_id, quantity in snapshot["requested_quantities"].items():
                    product = products_by_id.get(product_id)
                    if not product:
                        continue
                    if _is_shoe_category(product.category):
                        continue
                    product.stock = max(0, int(product.stock or 0) - quantity)
                    product.save(update_fields=["stock", "updated_at"])

                for (product_id, shoe_size), quantity in snapshot["requested_size_quantities"].items():
                    product = products_by_id.get(product_id)
                    if not product:
                        continue
                    size_map = dict(product.size_stock or {})
                    current_qty = int(size_map.get(shoe_size, 0) or 0)
                    size_map[shoe_size] = max(0, current_qty - quantity)
                    product.size_stock = size_map
                    product.save(update_fields=["size_stock", "stock", "updated_at"])

                CartItem.objects.filter(user=user).delete()
                cache.delete(_payment_proof_cache_key(user.id, payment_proof))
                cache.set(_used_payment_cache_key(proof_payment_id), order.order_number, timeout=USED_PAYMENT_TTL_SECONDS)

            try:
                send_order_invoice_email(order)
            except Exception:
                logger.exception("Invoice email failed for order=%s", order.order_number)

            return Response(
                {"order": OrderSerializer(order).data},
                status=status.HTTP_201_CREATED,
            )

        except Exception as exc:
            logger.exception("Order placement failed for user_id=%s", getattr(user, "id", None))
            return Response(
                {
                    "error": "Unable to place order right now. Please try again.",
                    **({"debug": str(exc)} if getattr(settings, "DEBUG", False) else {}),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def order_detail(request, order_number):
    try:
        order = Order.objects.select_related("user").prefetch_related("items", "return_requests").get(
            user=request.user, order_number=order_number
        )
    except Order.DoesNotExist:
        return Response({"error": "Order not found."}, status=status.HTTP_404_NOT_FOUND)
    return Response({"order": OrderSerializer(order).data})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def coupon_validate(request):
    serializer = CouponValidationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({"errors": serializer.errors}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

    coupon_code = _normalize_coupon_code(serializer.validated_data["coupon_code"])
    order_total = serializer.validated_data["order_total"]
    coupon = Coupon.objects.filter(code=coupon_code).first()
    if not coupon:
        return Response({"error": "Coupon not found."}, status=status.HTTP_404_NOT_FOUND)

    discount, discount_error = _coupon_discount_for_user(request.user, coupon, order_total)
    if discount_error:
        return Response({"error": discount_error}, status=status.HTTP_400_BAD_REQUEST)

    discounted_total = max(Decimal("0"), (Decimal(order_total) - discount).quantize(Decimal("0.01")))
    response = CouponSerializer(coupon).data
    response.update(
        {
            "discount_amount": str(discount),
            "discounted_total": str(discounted_total),
            "applies": True,
        }
    )
    return Response(response, status=status.HTTP_200_OK)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def return_requests(request):
    if request.method == "GET":
        requests_qs = ReturnRequest.objects.filter(user=request.user).select_related("order")
        return Response({"requests": ReturnRequestSerializer(requests_qs, many=True).data})

    serializer = CreateReturnRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({"errors": serializer.errors}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

    order_number = serializer.validated_data["order_number"]
    reason = serializer.validated_data["reason"]
    resolution = serializer.validated_data.get("resolution") or "refund"

    try:
        order = Order.objects.get(user=request.user, order_number=order_number)
    except Order.DoesNotExist:
        return Response({"error": "Order not found."}, status=status.HTTP_404_NOT_FOUND)



    existing = ReturnRequest.objects.filter(order=order, user=request.user).first()
    if existing:
        return Response({"request": ReturnRequestSerializer(existing).data}, status=status.HTTP_200_OK)

    refund_amount = Decimal(order.total_amount or 0)
    request_obj = ReturnRequest.objects.create(
        order=order,
        user=request.user,
        reason=reason,
        resolution=resolution,
        refund_amount=refund_amount,
    )
    return Response({"request": ReturnRequestSerializer(request_obj).data}, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def order_invoice_download(request, order_number):
    try:
        order = Order.objects.select_related("user").prefetch_related("items", "return_requests").get(
            user=request.user, order_number=order_number
        )
    except Order.DoesNotExist:
        return Response({"error": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

    html = build_invoice_html(order)
    response = HttpResponse(html, content_type="text/html; charset=utf-8")
    response["Content-Disposition"] = f'attachment; filename="invoice-{order.order_number}.html"'
    return response


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([PaymentCreateOrderThrottle])
def create_razorpay_order(request):
    snapshot, snapshot_error = _build_trusted_cart_snapshot(request.user, lock_rows=False)
    if snapshot_error is not None:
        return snapshot_error

    coupon_code = _normalize_coupon_code(request.data.get("coupon_code", ""))
    discount_amount = Decimal("0")
    coupon_payload = None
    if coupon_code:
        coupon = Coupon.objects.filter(code=coupon_code).first()
        if not coupon:
            return Response({"error": "Coupon not found."}, status=status.HTTP_404_NOT_FOUND)
        discount_amount, discount_error = _coupon_discount_for_user(
            request.user,
            coupon,
            snapshot["total"],
            product_ids=[item["product_id"] for item in snapshot["normalized_items"]],
        )
        if discount_error:
            return Response({"error": discount_error}, status=status.HTTP_400_BAD_REQUEST)
        coupon_payload = coupon

    final_total = max(Decimal("0"), (snapshot["total"] - discount_amount).quantize(Decimal("0.01")))
    final_total_paise = int((final_total * 100).to_integral_value())

    if final_total_paise < 100:
        return Response({"error": "Amount must be at least 100 paise."}, status=status.HTTP_400_BAD_REQUEST)

    client = _get_razorpay_client()
    if not client:
        return Response({"error": "Razorpay is not configured on server."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        receipt = f"rcpt_{request.user.id}_{int(time.time())}"[:40]
        order = client.order.create(
            {
                "amount": final_total_paise,
                "currency": snapshot["currency"],
                "receipt": receipt,
                "notes": {"user_id": str(request.user.id), "coupon_code": coupon_payload.code if coupon_payload else ""},
            }
        )

        order_id = str(order.get("id") or "")
        if not order_id:
            return Response({"error": "Invalid order response from gateway."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        cache.set(
            _pending_order_cache_key(request.user.id, order_id),
            {
                "amount": int(order.get("amount") or 0),
                "currency": str(order.get("currency") or snapshot["currency"]).upper(),
                "receipt": str(order.get("receipt") or receipt),
                "coupon_code": coupon_payload.code if coupon_payload else "",
                "coupon_discount": str(discount_amount),
                "order_total": str(snapshot["total"]),
                "final_total": str(final_total),
            },
            timeout=PENDING_ORDER_TTL_SECONDS,
        )

        return Response(
            {
                "order_id": order_id,
                "amount": order.get("amount"),
                "currency": order.get("currency"),
            },
            status=status.HTTP_200_OK,
        )
    except Exception as exc:
        status_code = int(getattr(exc, "status_code", 500) or 500)
        if status_code == 401:
            return Response({"error": "Razorpay authentication failed."}, status=status.HTTP_401_UNAUTHORIZED)
        logger.exception("Razorpay create order failed for user_id=%s", request.user.id)
        return Response(
            {
                "error": "Failed to create Razorpay order.",
                **({"debug": str(exc)} if getattr(settings, "DEBUG", False) else {}),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([PaymentVerifyThrottle])
def verify_razorpay_payment(request):
    order_id = request.data.get("razorpay_order_id")
    payment_id = request.data.get("razorpay_payment_id")
    signature = request.data.get("razorpay_signature")

    if not order_id or not payment_id or not signature:
        return Response(
            {
                "error": "razorpay_order_id, razorpay_payment_id and razorpay_signature are required.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    key_secret = getattr(settings, "RAZORPAY_KEY_SECRET", "")
    if not key_secret:
        return Response(
            {"error": "Razorpay secret is not configured on server."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    pending_payload = cache.get(_pending_order_cache_key(request.user.id, str(order_id)))
    if not pending_payload:
        return Response(
            {"success": False, "error": "Order session expired. Please try payment again."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    payload = f"{order_id}|{payment_id}".encode("utf-8")
    expected_signature = hmac.new(
        key_secret.encode("utf-8"), payload, hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(expected_signature, str(signature)):
        return Response(
            {"success": False, "error": "Invalid payment signature."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if cache.get(_used_payment_cache_key(str(payment_id))):
        return Response(
            {"success": False, "error": "Payment has already been used."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    client = _get_razorpay_client()
    if not client:
        return Response(
            {"success": False, "error": "Razorpay is not configured on server."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    try:
        payment = client.payment.fetch(str(payment_id))
    except Exception as exc:
        logger.exception("Razorpay payment fetch failed for payment_id=%s", payment_id)
        return Response(
            {
                "success": False,
                "error": "Unable to validate payment with gateway.",
                **({"debug": str(exc)} if getattr(settings, "DEBUG", False) else {}),
            },
            status=status.HTTP_502_BAD_GATEWAY,
        )

    gateway_order_id = str(payment.get("order_id") or "")
    gateway_amount = int(payment.get("amount") or 0)
    gateway_currency = str(payment.get("currency") or "").upper()
    gateway_status = str(payment.get("status") or "").lower()

    if gateway_order_id != str(order_id):
        return Response({"success": False, "error": "Gateway order mismatch."}, status=status.HTTP_400_BAD_REQUEST)

    if gateway_amount != int(pending_payload.get("amount") or 0):
        return Response({"success": False, "error": "Gateway amount mismatch."}, status=status.HTTP_400_BAD_REQUEST)

    if gateway_currency != str(pending_payload.get("currency") or "INR").upper():
        return Response({"success": False, "error": "Gateway currency mismatch."}, status=status.HTTP_400_BAD_REQUEST)

    if gateway_status not in {"authorized", "captured"}:
        return Response(
            {"success": False, "error": "Payment is not authorized/captured yet."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    proof_token = secrets.token_urlsafe(32)
    cache.set(
        _payment_proof_cache_key(request.user.id, proof_token),
        {
            "order_id": str(order_id),
            "payment_id": str(payment_id),
            "amount": gateway_amount,
            "currency": gateway_currency,
        },
        timeout=PROOF_TTL_SECONDS,
    )
    cache.delete(_pending_order_cache_key(request.user.id, str(order_id)))

    return Response(
        {
            "success": True,
            "payment_proof": proof_token,
            "razorpay_order_id": str(order_id),
            "razorpay_payment_id": str(payment_id),
        },
        status=status.HTTP_200_OK,
    )


@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def razorpay_webhook(request):
    webhook_secret = getattr(settings, "RAZORPAY_WEBHOOK_SECRET", "")
    if not webhook_secret:
        return Response({"error": "Webhook secret not configured."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    signature = request.headers.get("X-Razorpay-Signature", "")
    if not signature:
        return Response({"error": "Missing webhook signature."}, status=status.HTTP_400_BAD_REQUEST)

    body = request.body or b""
    expected_signature = hmac.new(
        webhook_secret.encode("utf-8"), body, hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(expected_signature, signature):
        return Response({"error": "Invalid webhook signature."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        payload = json.loads(body.decode("utf-8") or "{}")
    except Exception:
        return Response({"error": "Invalid webhook payload."}, status=status.HTTP_400_BAD_REQUEST)

    event = str(payload.get("event") or "")
    logger.info("Razorpay webhook received: event=%s", event)
    return Response({"success": True}, status=status.HTTP_200_OK)
