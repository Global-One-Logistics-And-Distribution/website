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


from pathlib import Path

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
    logo_path = str((Path(settings.BASE_DIR).parent / "public" / "logo.svg").resolve()).replace("\\", "/")
    
    discount_html = ""
    if order.discount_amount > 0:
        discount_html = f"""
          <tr>
            <td>Item Discount ({order.coupon_code})</td>
            <td style="color: #10b981;">- INR {_money(order.discount_amount)}</td>
          </tr>
        """
        
    return f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Tax Invoice - {order.order_number}</title>
    <style>
      @page {{
        size: a4;
        margin: 1.5cm;
      }}
      body {{ font-family: Helvetica, Arial, sans-serif; font-size: 12px; color: #333; line-height: 1.4; }}
      table {{ width: 100%; border-collapse: collapse; }}
      td, th {{ vertical-align: top; }}
      
      .header-table {{ margin-bottom: 20px; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; }}
      .company-logo {{ max-height: 45px; max-width: 250px; margin-bottom: 5px; }}
      .company-info {{ font-size: 11px; color: #64748b; }}
      .invoice-title {{ font-size: 20px; font-weight: bold; color: #333; text-align: right; text-transform: uppercase; }}
      .invoice-meta {{ text-align: right; font-size: 11px; color: #64748b; margin-top: 5px; }}
      
      .billing-table {{ margin-bottom: 20px; }}
      .billing-table td {{ width: 48%; padding: 12px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 11px; }}
      .billing-spacer {{ width: 4%; }}
      .billing-title {{ font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 5px; display: block; }}
      
      .items-table {{ margin-bottom: 20px; border: 1px solid #e2e8f0; }}
      .items-table th {{ background-color: #f1f5f9; padding: 10px; text-align: left; font-size: 11px; color: #64748b; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }}
      .items-table td {{ padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }}
      .items-table th.center, .items-table td.center {{ text-align: center; }}
      .items-table th.right, .items-table td.right {{ text-align: right; }}
      .item-name {{ font-weight: bold; color: #0f172a; }}
      .item-sku {{ color: #64748b; font-size: 10px; }}
      
      .footer-table td {{ vertical-align: top; }}
      .payment-info {{ padding: 12px; background-color: #f8fafc; border: 1px solid #e2e8f0; font-size: 11px; color: #475569; border-radius: 4px; }}
      .payment-info-title {{ font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 5px; }}
      
      .totals-table {{ width: 100%; border-collapse: collapse; }}
      .totals-table td {{ padding: 6px 10px; text-align: right; font-size: 11px; color: #475569; }}
      .totals-table tr.border-top td {{ border-top: 1px solid #e2e8f0; padding-top: 8px; }}
      .totals-table tr.grand-total td {{ font-size: 14px; font-weight: bold; color: #0f172a; border-top: 2px solid #e2e8f0; padding-top: 8px; }}
      .totals-table tr.amount-paid td {{ color: #10b981; font-weight: bold; }}
      .totals-table tr.amount-due td {{ color: #ef4444; font-weight: bold; }}
      
      .notes {{ margin-top: 40px; text-align: center; color: #64748b; font-size: 10px; border-top: 1px solid #e2e8f0; padding-top: 15px; }}
    </style>
  </head>
  <body>
    <table class="header-table">
      <tr>
        <td>
          <img src="{logo_path}" class="company-logo" alt="{company_name}" />
          <div class="company-info">
            Navi Mumbai, Maharashtra 400001<br/>
            GSTIN: 27ABCFG1029Q1Z6<br/>
            support@elitedrop.net.in
          </div>
        </td>
        <td style="text-align: right;">
          <div class="invoice-title">TAX INVOICE</div>
          <div class="invoice-meta">
            <strong>Invoice #:</strong> {order.order_number}<br/>
            <strong>Date Issued:</strong> {created}<br/>
            <strong>Due Date:</strong> {due_date}
          </div>
        </td>
      </tr>
    </table>

    <table class="billing-table">
      <tr>
        <td>
          <span class="billing-title">Billed To</span>
          <strong>{order.shipping_name}</strong><br/>
          {order.shipping_email}<br/>
          {order.shipping_phone}
        </td>
        <td class="billing-spacer"></td>
        <td>
          <span class="billing-title">Shipped To</span>
          <strong>{order.shipping_name}</strong><br/>
          {order.shipping_address}<br/>
          {order.shipping_city}, {order.shipping_state} - {order.shipping_pincode}
        </td>
      </tr>
    </table>

    <table class="items-table">
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

    <table class="footer-table">
      <tr>
        <td style="width: 45%;">
          <div class="payment-info">
            <div class="payment-info-title">Payment Information</div>
            <strong>Method:</strong> {payment_method}<br/>
            <strong>Transaction ID:</strong> {transaction_id}<br/>
            <strong>Status:</strong> {order.get_status_display()}
          </div>
        </td>
        <td style="width: 10%;"></td>
        <td style="width: 45%;">
          <table class="totals-table">
            <tr>
              <td>Net Amount (Before Tax)</td>
              <td>INR {_money(base_amount + order.discount_amount)}</td>
            </tr>
            {discount_html}
            <tr>
              <td>CGST (9%)</td>
              <td>INR {_money(cgst)}</td>
            </tr>
            <tr>
              <td>SGST (9%)</td>
              <td>INR {_money(sgst)}</td>
            </tr>
            <tr>
              <td>Shipping Fees</td>
              <td>INR 0.00</td>
            </tr>
            <tr class="grand-total">
              <td>Grand Total</td>
              <td>INR {_money(order.total_amount)}</td>
            </tr>
            <tr class="amount-paid">
              <td>Amount Paid</td>
              <td>INR {_money(order.total_amount)}</td>
            </tr>
            <tr class="amount-due">
              <td>Balance Due</td>
              <td>INR 0.00</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <div class="notes">
      <strong>Thank you for your business!</strong><br/>
      Return Policy: Items can be returned within 7 days of delivery. Visit our website for more details.<br/>
      This is a computer-generated invoice and does not require a physical signature.
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