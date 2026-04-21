from decimal import Decimal
import hashlib
import hmac
import json
import logging
import secrets
import time
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

from .models import Order, OrderItem
from .invoice import build_invoice_html, send_order_invoice_email
from .payments import build_razorpay_invoice_payload
from .serializers import OrderSerializer, CreateOrderSerializer
from products.models import Product
from products.models import SiteMaintenanceSettings
from cart.models import CartItem


logger = logging.getLogger(__name__)
SHOE_SIZES = {"7", "8", "9", "10", "11"}
PROOF_TTL_SECONDS = 15 * 60
PENDING_ORDER_TTL_SECONDS = 20 * 60
USED_PAYMENT_TTL_SECONDS = 7 * 24 * 60 * 60


def _is_shoe_category(category):
    return "shoe" in (category or "").strip().lower()


def _size_stock_qty(product, size):
    size_map = product.size_stock if isinstance(product.size_stock, dict) else {}
    return int(size_map.get(str(size).strip(), 0) or 0)


def _get_razorpay_client():
    key_id = getattr(settings, "RAZORPAY_KEY_ID", "")
    key_secret = getattr(settings, "RAZORPAY_KEY_SECRET", "")
    if not key_id or not key_secret:
        return None
    try:
        import razorpay
    except Exception:
        logger.exception("Razorpay package import failed.")
        return None
    return razorpay.Client(auth=(key_id, key_secret))


def _create_or_get_razorpay_invoice(order):
    if order.invoice_id and order.invoice_url:
        return {
            "invoice_id": order.invoice_id,
            "invoice_number": order.invoice_number,
            "invoice_status": order.invoice_status,
            "invoice_url": order.invoice_url,
            "created": False,
        }

    if not order.items.exists():
        return None

    client = _get_razorpay_client()
    if not client:
        return None

    invoice_payload = build_razorpay_invoice_payload(order)
    invoice = client.invoice.create(invoice_payload)

    order.invoice_id = str(invoice.get("id") or "")
    order.invoice_number = str(invoice.get("invoice_number") or "")
    order.invoice_status = str(invoice.get("status") or "")
    order.invoice_url = str(invoice.get("short_url") or invoice.get("hosted_invoice_url") or "")
    order.invoice_created_at = timezone.now()
    order.save(
        update_fields=[
            "invoice_id",
            "invoice_number",
            "invoice_status",
            "invoice_url",
            "invoice_created_at",
            "updated_at",
        ]
    )

    return {
        "invoice_id": order.invoice_id,
        "invoice_number": order.invoice_number,
        "invoice_status": order.invoice_status,
        "invoice_url": order.invoice_url,
        "created": True,
    }


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
            .prefetch_related("items")
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

                if snapshot["total_paise"] != proof_amount or snapshot["currency"] != proof_currency:
                    return Response(
                        {"error": "Payment amount does not match the current cart total."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                note = (data.get("notes") or "").strip()
                payment_note = (
                    f"Paid via Razorpay. Order ID: {proof_order_id}, Payment ID: {proof_payment_id}"
                )
                data["notes"] = f"{note}\n{payment_note}".strip()

                order = Order.objects.create(
                    user=user,
                    total_amount=snapshot["total"],
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

            try:
                _create_or_get_razorpay_invoice(order)
            except Exception:
                logger.exception("Razorpay invoice auto-create failed for order=%s", order.order_number)

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
        order = Order.objects.select_related("user").prefetch_related("items").get(
            user=request.user, order_number=order_number
        )
    except Order.DoesNotExist:
        return Response({"error": "Order not found."}, status=status.HTTP_404_NOT_FOUND)
    return Response({"order": OrderSerializer(order).data})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def order_invoice_download(request, order_number):
    try:
        order = Order.objects.select_related("user").prefetch_related("items").get(
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
def create_razorpay_invoice(request, order_number):
    try:
        order = Order.objects.select_related("user").prefetch_related("items").get(
            user=request.user, order_number=order_number
        )
    except Order.DoesNotExist:
        return Response({"error": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

    try:
        invoice_payload = _create_or_get_razorpay_invoice(order)
        if invoice_payload is None:
            return Response(
                {"error": "Cannot create invoice right now for this order."},
                status=status.HTTP_400_BAD_REQUEST,
            )
    except Exception as exc:
        status_code = int(getattr(exc, "status_code", 500) or 500)
        if status_code == 401:
            return Response({"error": "Razorpay authentication failed."}, status=status.HTTP_401_UNAUTHORIZED)
        logger.exception("Razorpay invoice create failed for order=%s", order.order_number)
        return Response(
            {
                "error": "Failed to create Razorpay invoice.",
                **({"debug": str(exc)} if getattr(settings, "DEBUG", False) else {}),
            },
            status=status.HTTP_502_BAD_GATEWAY,
        )

    return Response(
        {
            "invoice_id": invoice_payload["invoice_id"],
            "invoice_number": invoice_payload["invoice_number"],
            "invoice_status": invoice_payload["invoice_status"],
            "invoice_url": invoice_payload["invoice_url"],
        },
        status=status.HTTP_201_CREATED if invoice_payload.get("created") else status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([PaymentCreateOrderThrottle])
def create_razorpay_order(request):
    snapshot, snapshot_error = _build_trusted_cart_snapshot(request.user, lock_rows=False)
    if snapshot_error is not None:
        return snapshot_error

    if snapshot["total_paise"] < 100:
        return Response({"error": "Amount must be at least 100 paise."}, status=status.HTTP_400_BAD_REQUEST)

    client = _get_razorpay_client()
    if not client:
        return Response({"error": "Razorpay is not configured on server."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        receipt = f"rcpt_{request.user.id}_{int(time.time())}"[:40]
        order = client.order.create(
            {
                "amount": snapshot["total_paise"],
                "currency": snapshot["currency"],
                "receipt": receipt,
                "notes": {"user_id": str(request.user.id)},
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
