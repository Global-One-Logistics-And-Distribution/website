from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.utils import timezone


def _to_paise(amount):
    value = amount if isinstance(amount, Decimal) else Decimal(str(amount or "0"))
    return int((value * 100).to_integral_value())


def build_razorpay_invoice_payload(order):
    expire_days = 7
    try:
        expire_days = max(1, int(getattr(settings, "RAZORPAY_INVOICE_EXPIRE_DAYS", 7) or 7))
    except Exception:
        expire_days = 7

    expire_by = int((timezone.now() + timedelta(days=expire_days)).timestamp())
    customer_name = (order.shipping_name or "").strip() or "Customer"
    customer_email = (order.shipping_email or "").strip()
    customer_contact = (order.shipping_phone or "").strip()

    line_items = []
    for item in order.items.all():
        line_items.append(
            {
                "name": item.product_name,
                "description": f"Size: {item.shoe_size}" if item.shoe_size else "",
                "amount": _to_paise(item.price),
                "currency": "INR",
                "quantity": int(item.quantity or 1),
            }
        )

    storefront = getattr(settings, "STOREFRONT_URL", "").rstrip("/")
    view_less = f"{storefront}/orders/{order.order_number}" if storefront else ""

    return {
        "type": "link",
        "description": f"Invoice for order {order.order_number}",
        "customer": {
            "name": customer_name,
            "email": customer_email,
            "contact": customer_contact,
        },
        "line_items": line_items,
        "currency": "INR",
        "receipt": order.order_number[:40],
        "expire_by": expire_by,
        "sms_notify": 1,
        "email_notify": 1,
        "notes": {
            "order_number": order.order_number,
            "user_id": str(order.user_id or ""),
        },
        "view_less": view_less,
    }
