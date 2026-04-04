from decimal import Decimal
from django.conf import settings
from django.utils import timezone

from accounts.utils import _send_via_zeptomail


def _money(value):
    amount = value if isinstance(value, Decimal) else Decimal(str(value or "0"))
    return f"{amount:.2f}"


def build_invoice_subject(order):
    return f"Invoice for your EliteDrop order {order.order_number}"


def build_invoice_text(order):
    lines = [
        "EliteDrop Invoice",
        "",
        f"Invoice Date: {timezone.localtime(order.created_at).strftime('%d %b %Y, %I:%M %p')}",
        f"Order Number: {order.order_number}",
        f"Order Status: {order.get_status_display()}",
        "",
        "Billing & Shipping",
        f"Name: {order.shipping_name}",
        f"Email: {order.shipping_email}",
        f"Phone: {order.shipping_phone}",
        f"Address: {order.shipping_address}",
        f"City/State: {order.shipping_city}, {order.shipping_state}",
        f"Pincode: {order.shipping_pincode}",
        "",
        "Items",
    ]

    for item in order.items.all():
        size = f" | Size: {item.shoe_size}" if item.shoe_size else ""
        lines.append(
            f"- {item.product_name} | Qty: {item.quantity} | Unit: INR {_money(item.price)} | Subtotal: INR {_money(item.subtotal)}{size}"
        )

    lines.extend(
        [
            "",
            f"Total Amount: INR {_money(order.total_amount)}",
            "",
            "Thank you for shopping with EliteDrop.",
        ]
    )
    return "\n".join(lines)


def build_invoice_html(order):
    created = timezone.localtime(order.created_at).strftime("%d %b %Y, %I:%M %p")
    item_rows = []
    for item in order.items.all():
        size = item.shoe_size or "-"
        item_rows.append(
            "<tr>"
            f"<td>{item.product_name}</td>"
            f"<td>{item.quantity}</td>"
            f"<td>{size}</td>"
            f"<td>INR {_money(item.price)}</td>"
            f"<td>INR {_money(item.subtotal)}</td>"
            "</tr>"
        )

    company_name = getattr(settings, "COMPANY_NAME", "EliteDrop")
    return f"""<!doctype html>
<html lang=\"en\">
  <head>
    <meta charset=\"utf-8\" />
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
    <title>Invoice {order.order_number}</title>
    <style>
      body {{ font-family: Arial, sans-serif; margin: 24px; color: #0f172a; }}
      h1 {{ margin: 0 0 6px 0; font-size: 24px; }}
      .meta {{ margin-bottom: 16px; color: #334155; }}
      .card {{ border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-bottom: 16px; }}
      table {{ width: 100%; border-collapse: collapse; font-size: 14px; }}
      th, td {{ border: 1px solid #e2e8f0; padding: 10px; text-align: left; }}
      th {{ background: #f8fafc; }}
      .total {{ margin-top: 14px; font-size: 18px; font-weight: 700; text-align: right; }}
    </style>
  </head>
  <body>
    <h1>{company_name} Invoice</h1>
    <div class=\"meta\">Order {order.order_number} | {created}</div>

    <div class=\"card\">
      <strong>Shipping Details</strong>
      <div>{order.shipping_name}</div>
      <div>{order.shipping_email} | {order.shipping_phone}</div>
      <div>{order.shipping_address}</div>
      <div>{order.shipping_city}, {order.shipping_state} - {order.shipping_pincode}</div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th>Qty</th>
          <th>Size</th>
          <th>Unit Price</th>
          <th>Subtotal</th>
        </tr>
      </thead>
      <tbody>
        {''.join(item_rows)}
      </tbody>
    </table>

    <div class=\"total\">Total: INR {_money(order.total_amount)}</div>
  </body>
</html>
"""


def send_order_invoice_email(order):
    to_email = order.shipping_email
    if not to_email:
        return False
    subject = build_invoice_subject(order)
    message = build_invoice_text(order)
    return _send_via_zeptomail(subject, message, to_email)