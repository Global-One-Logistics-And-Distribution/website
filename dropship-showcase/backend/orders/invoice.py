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
            f"<td class='item-name'>{item.product_name}</td>"
            f"<td class='center'>{item.quantity}</td>"
            f"<td class='center'>{size}</td>"
            f"<td class='right'>INR {_money(item.price)}</td>"
            f"<td class='right'>INR {_money(item.subtotal)}</td>"
            "</tr>"
        )

    company_name = getattr(settings, "COMPANY_NAME", "EliteDrop")
    return f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Invoice {order.order_number}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      body {{ font-family: 'Inter', Arial, sans-serif; margin: 0; padding: 40px; background-color: #f8fafc; color: #0f172a; line-height: 1.5; }}
      .invoice-container {{ max-width: 800px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }}
      .header {{ display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; }}
      .brand {{ display: flex; flex-direction: column; }}
      .brand h1 {{ margin: 0; font-size: 32px; font-weight: 700; color: #4f46e5; letter-spacing: -0.02em; }}
      .invoice-details {{ text-align: right; }}
      .invoice-details h2 {{ margin: 0 0 8px 0; font-size: 24px; color: #334155; text-transform: uppercase; letter-spacing: 0.05em; }}
      .invoice-details p {{ margin: 0; color: #64748b; font-size: 14px; }}
      .billing-section {{ display: flex; justify-content: space-between; margin-bottom: 40px; gap: 40px; }}
      .billing-card {{ flex: 1; padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }}
      .billing-card h3 {{ margin: 0 0 12px 0; font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }}
      .billing-card strong {{ display: block; margin-bottom: 4px; color: #0f172a; font-size: 16px; }}
      .billing-card p {{ margin: 0; color: #475569; font-size: 14px; }}
      table {{ width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 30px; }}
      th, td {{ padding: 16px; border-bottom: 1px solid #e2e8f0; }}
      th {{ text-align: left; font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; background: #f8fafc; border-top: 1px solid #e2e8f0; border-bottom: 2px solid #e2e8f0; }}
      th:first-child {{ border-top-left-radius: 8px; border-bottom-left-radius: 8px; border-left: 1px solid #e2e8f0; }}
      th:last-child {{ border-top-right-radius: 8px; border-bottom-right-radius: 8px; border-right: 1px solid #e2e8f0; }}
      td {{ font-size: 14px; color: #334155; }}
      .item-name {{ font-weight: 500; color: #0f172a; }}
      .center {{ text-align: center; }}
      .right {{ text-align: right; }}
      .totals {{ width: 300px; margin-left: auto; border-top: 2px solid #e2e8f0; padding-top: 20px; }}
      .total-row {{ display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; color: #475569; }}
      .total-row.grand-total {{ font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0; }}
      .footer {{ text-align: center; margin-top: 60px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 13px; }}
    </style>
  </head>
  <body>
    <div class="invoice-container">
      <div class="header">
        <div class="brand">
          <h1>{company_name}</h1>
        </div>
        <div class="invoice-details">
          <h2>Invoice</h2>
          <p>Order #{order.order_number}</p>
          <p>Date: {created}</p>
          <p>Status: {order.get_status_display()}</p>
        </div>
      </div>

      <div class="billing-section">
        <div class="billing-card">
          <h3>Billed To</h3>
          <strong>{order.shipping_name}</strong>
          <p>{order.shipping_email}</p>
          <p>{order.shipping_phone}</p>
        </div>
        <div class="billing-card">
          <h3>Shipped To</h3>
          <p>{order.shipping_address}</p>
          <p>{order.shipping_city}, {order.shipping_state}</p>
          <p>{order.shipping_pincode}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th class="center">Qty</th>
            <th class="center">Size</th>
            <th class="right">Unit Price</th>
            <th class="right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {''.join(item_rows)}
        </tbody>
      </table>

      <div class="totals">
        <div class="total-row">
          <span>Subtotal</span>
          <span>INR {_money(order.total_amount + order.discount_amount)}</span>
        </div>
        """ + (f"""
        <div class="total-row">
          <span>Discount ({order.coupon_code})</span>
          <span style="color: #10b981;">- INR {_money(order.discount_amount)}</span>
        </div>
        """ if order.discount_amount > 0 else "") + f"""
        <div class="total-row grand-total">
          <span>Total</span>
          <span>INR {_money(order.total_amount)}</span>
        </div>
      </div>

      <div class="footer">
        <p>Thank you for shopping with {company_name}. If you have any questions, please contact our support.</p>
      </div>
    </div>
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