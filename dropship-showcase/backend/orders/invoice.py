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
    due_date = created # For prepaid ecommerce, due date is same as invoice date
    
    # Calculate taxes (Assuming 18% inclusive GST for demonstration)
    total_after_discount = order.total_amount
    tax_rate = Decimal('0.18')
    # Total = Base + Base * 0.18 = Base * 1.18  => Base = Total / 1.18
    base_amount = (total_after_discount / Decimal('1.18')).quantize(Decimal('0.01'))
    total_tax = total_after_discount - base_amount
    cgst = (total_tax / 2).quantize(Decimal('0.01'))
    sgst = total_tax - cgst
    
    # Extract Payment ID from notes if possible
    payment_method = "Online Payment"
    transaction_id = "N/A"
    if order.notes and "Payment ID:" in order.notes:
        parts = order.notes.split("Payment ID:")
        if len(parts) > 1:
            transaction_id = parts[1].split()[0].strip()
            payment_method = "Razorpay"

    item_rows = []
    for item in order.items.all():
        size = item.shoe_size or "-"
        sku = f"SKU-{item.product_id:04d}"
        item_rows.append(
            "<tr>"
            f"<td class='item-name'>{item.product_name}<br><small class='text-muted'>SKU: {sku}</small></td>"
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
    <title>Tax Invoice - {order.order_number}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      body {{ font-family: 'Inter', Arial, sans-serif; margin: 0; padding: 40px; background-color: #f8fafc; color: #0f172a; line-height: 1.5; }}
      .invoice-container {{ max-width: 800px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 8px; border: 1px solid #e2e8f0; }}
      .header {{ display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; }}
      .brand {{ display: flex; flex-direction: column; }}
      .brand h1 {{ margin: 0; font-size: 28px; font-weight: 700; color: #0f172a; letter-spacing: -0.02em; }}
      .logo {{ max-width: 150px; margin-bottom: 10px; }}
      .invoice-details {{ text-align: right; }}
      .invoice-details h2 {{ margin: 0 0 8px 0; font-size: 20px; color: #4f46e5; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; }}
      .invoice-details p {{ margin: 0; color: #475569; font-size: 13px; }}
      .billing-section {{ display: flex; justify-content: space-between; margin-bottom: 30px; gap: 20px; }}
      .billing-card {{ flex: 1; padding: 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 13px; }}
      .billing-card h3 {{ margin: 0 0 10px 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }}
      .billing-card strong {{ display: block; margin-bottom: 4px; color: #0f172a; font-size: 14px; }}
      .billing-card p {{ margin: 0; color: #475569; }}
      table {{ width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 30px; }}
      th, td {{ padding: 12px 16px; border-bottom: 1px solid #e2e8f0; }}
      th {{ text-align: left; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; background: #f1f5f9; }}
      th:first-child {{ border-top-left-radius: 6px; border-bottom-left-radius: 6px; }}
      th:last-child {{ border-top-right-radius: 6px; border-bottom-right-radius: 6px; }}
      td {{ font-size: 13px; color: #334155; }}
      .item-name {{ font-weight: 500; color: #0f172a; }}
      .text-muted {{ color: #64748b; font-size: 11px; }}
      .center {{ text-align: center; }}
      .right {{ text-align: right; }}
      .totals-container {{ display: flex; justify-content: space-between; align-items: flex-start; margin-top: 20px; }}
      .payment-info {{ width: 45%; font-size: 13px; color: #475569; padding: 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }}
      .payment-info h4 {{ margin: 0 0 8px 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }}
      .totals {{ width: 350px; border-top: 2px solid #e2e8f0; padding-top: 16px; }}
      .total-row {{ display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; color: #475569; }}
      .total-row.grand-total {{ font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 12px; padding-top: 12px; border-top: 1px solid #e2e8f0; }}
      .total-row.amount-paid {{ font-size: 14px; font-weight: 600; color: #10b981; }}
      .total-row.amount-due {{ font-size: 14px; font-weight: 600; color: #ef4444; }}
      .footer {{ text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px; line-height: 1.6; }}
      .footer p {{ margin: 4px 0; }}
    </style>
  </head>
  <body>
    <div class="invoice-container">
      <div class="header">
        <div class="brand">
          <!-- Logo Placeholder -->
          <div style="font-size: 24px; font-weight: 800; background: linear-gradient(135deg, #4f46e5, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 8px;">{company_name}</div>
          <p style="margin:0; font-size: 12px; color: #64748b;">
            EliteDrop<br>
            Navi Mumbai, Maharashtra 400001<br>
            GSTIN: 27ABCFG1029Q1Z6<br>
            support@elitedrop.net.in
          </p>
        </div>
        <div class="invoice-details">
          <h2>TAX INVOICE</h2>
          <p><strong>Invoice #:</strong> {order.order_number}</p>
          <p><strong>Date Issued:</strong> {created}</p>
          <p><strong>Due Date:</strong> {due_date}</p>
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
          <strong>{order.shipping_name}</strong>
          <p>{order.shipping_address}</p>
          <p>{order.shipping_city}, {order.shipping_state} - {order.shipping_pincode}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Item & Description</th>
            <th class="center">Qty</th>
            <th class="center">Size</th>
            <th class="right">Unit Price</th>
            <th class="right">Net Amount</th>
          </tr>
        </thead>
        <tbody>
          {''.join(item_rows)}
        </tbody>
      </table>

      <div class="totals-container">
        <div class="payment-info">
          <h4>Payment Information</h4>
          <p><strong>Method:</strong> {payment_method}</p>
          <p><strong>Transaction ID:</strong> {transaction_id}</p>
          <p><strong>Status:</strong> {order.get_status_display()}</p>
        </div>

        <div class="totals">
          <div class="total-row">
            <span>Net Amount (Before Tax)</span>
            <span>INR {_money(base_amount + order.discount_amount)}</span>
          </div>
          """ + (f"""
          <div class="total-row">
            <span>Item Discount ({order.coupon_code})</span>
            <span style="color: #10b981;">- INR {_money(order.discount_amount)}</span>
          </div>
          """ if order.discount_amount > 0 else "") + f"""
          <div class="total-row">
            <span>CGST (9%)</span>
            <span>INR {_money(cgst)}</span>
          </div>
          <div class="total-row">
            <span>SGST (9%)</span>
            <span>INR {_money(sgst)}</span>
          </div>
          <div class="total-row">
            <span>Shipping Fees</span>
            <span>INR 0.00</span>
          </div>
          <div class="total-row grand-total">
            <span>Grand Total</span>
            <span>INR {_money(order.total_amount)}</span>
          </div>
          <div class="total-row amount-paid">
            <span>Amount Paid</span>
            <span>INR {_money(order.total_amount)}</span>
          </div>
          <div class="total-row amount-due">
            <span>Balance Due</span>
            <span>INR 0.00</span>
          </div>
        </div>
      </div>

      <div class="footer">
        <p><strong>Thank you for your business!</strong></p>
        <p>Return Policy: Items can be returned within 7 days of delivery. Visit our website for more details.</p>
        <p>This is a computer-generated invoice and does not require a physical signature.</p>
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