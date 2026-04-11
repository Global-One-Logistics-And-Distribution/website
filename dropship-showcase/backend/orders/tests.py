from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User
from products.models import Product


def get_token(user):
    return str(RefreshToken.for_user(user).access_token)


class OrdersTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="orders@example.com",
            name="Orders User",
            password="Secure123",
            email_verified=True,
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {get_token(self.user)}")
        self.orders_url = reverse("order-list")

        self.shoe_product = Product.objects.create(
            id=900,
            name="Luxury Sneaker",
            category="Luxury Shoes",
            price="3499.00",
            size_stock={"7": 2, "8": 2, "9": 2, "10": 2, "11": 2},
            is_active=True,
        )

    def _base_payload(self):
        return {
            "shipping_name": "Orders User",
            "shipping_email": "orders@example.com",
            "shipping_phone": "9876543210",
            "shipping_address": "123 Main Street",
            "shipping_city": "Bengaluru",
            "shipping_pincode": "560001",
            "shipping_state": "Karnataka",
            "items": [
                {
                    "product_id": self.shoe_product.id,
                    "quantity": 1,
                    "shoe_size": "",
                }
            ],
        }

    def test_order_rejects_shoe_without_size(self):
        payload = self._base_payload()
        res = self.client.post(self.orders_url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertIn("items", res.data["errors"])

    def test_order_accepts_shoe_with_valid_size(self):
        payload = self._base_payload()
        payload["items"][0]["shoe_size"] = "9"
        res = self.client.post(self.orders_url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["order"]["items"][0]["shoe_size"], "9")

    def test_order_ignores_tampered_item_price(self):
        payload = self._base_payload()
        payload["items"][0]["shoe_size"] = "10"
        payload["items"][0]["price"] = "1.00"
        payload["items"][0]["product_name"] = "Tampered"

        res = self.client.post(self.orders_url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["order"]["items"][0]["price"], "3499.00")
        self.assertEqual(res.data["order"]["items"][0]["product_name"], "Luxury Sneaker")

    def test_order_binds_shipping_email_to_authenticated_user(self):
        payload = self._base_payload()
        payload["items"][0]["shoe_size"] = "8"
        payload["shipping_email"] = "attacker@example.com"

        res = self.client.post(self.orders_url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["order"]["shipping_email"], self.user.email)

    def test_invoice_download_for_order_owner(self):
        regular_product = Product.objects.create(
            name="Luxury Belt",
            category="Accessories",
            price="1999.00",
            stock=5,
            is_active=True,
        )
        payload = {
            "shipping_name": "Orders User",
            "shipping_email": "orders@example.com",
            "shipping_phone": "9876543210",
            "shipping_address": "123 Main Street",
            "shipping_city": "Bengaluru",
            "shipping_pincode": "560001",
            "shipping_state": "Karnataka",
            "items": [
                {
                    "product_id": regular_product.id,
                    "quantity": 1,
                }
            ],
        }

        create_res = self.client.post(self.orders_url, payload, format="json")
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        order_number = create_res.data["order"]["order_number"]

        invoice_url = reverse("order-invoice-download", args=[order_number])
        invoice_res = self.client.get(invoice_url)
        self.assertEqual(invoice_res.status_code, status.HTTP_200_OK)
        self.assertIn("text/html", invoice_res["Content-Type"])
        self.assertIn("attachment; filename=\"invoice-", invoice_res["Content-Disposition"])
        self.assertIn(order_number, invoice_res.content.decode("utf-8"))
