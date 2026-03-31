from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from accounts.models import User
from .models import CartItem
from products.models import Product


def get_token(user):
    return str(RefreshToken.for_user(user).access_token)


class CartTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="cart@example.com", name="Cart User", password="Secure123"
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {get_token(self.user)}")
        self.list_url = reverse("cart-list")

    def create_product(self, product_id, stock=10):
        return Product.objects.create(
            id=product_id,
            name=f"Product {product_id}",
            price="1999.00",
            stock=stock,
            is_active=True,
        )

    def test_get_empty_cart(self):
        res = self.client.get(self.list_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["items"], [])

    def test_add_to_cart(self):
        self.create_product(1, stock=20)
        res = self.client.post(
            self.list_url,
            {"productId": 1, "quantity": 2, "selectedSize": "9"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["item"]["product_id"], 1)
        self.assertEqual(res.data["item"]["quantity"], 2)
        self.assertEqual(res.data["item"]["selected_size"], "9")

    def test_add_same_product_increments(self):
        self.create_product(5, stock=20)
        self.client.post(
            self.list_url,
            {"productId": 5, "quantity": 1, "selectedSize": "8"},
            format="json",
        )
        self.client.post(self.list_url, {"productId": 5, "quantity": 2}, format="json")
        res = self.client.get(self.list_url)
        item = res.data["items"][0]
        self.assertEqual(item["quantity"], 3)
        self.assertEqual(item["selected_size"], "8")

    def test_sync_cart_persists_selected_size(self):
        self.create_product(55, stock=20)
        sync_url = reverse("cart-sync")
        res = self.client.post(
            sync_url,
            {
                "items": [
                    {"productId": 55, "quantity": 1, "selectedSize": "10"},
                ]
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["items"][0]["selected_size"], "10")

    def test_update_quantity(self):
        self.create_product(10, stock=20)
        CartItem.objects.create(user=self.user, product_id=10, quantity=1)
        url = reverse("cart-item", kwargs={"product_id": 10})
        res = self.client.put(url, {"quantity": 5}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["item"]["quantity"], 5)

    def test_add_to_cart_blocks_above_max_quantity(self):
        self.create_product(11, stock=50)
        res = self.client.post(self.list_url, {"productId": 11, "quantity": 11}, format="json")
        self.assertEqual(res.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertIn("quantity", res.data["errors"])

    def test_add_to_cart_blocks_when_over_stock(self):
        self.create_product(12, stock=3)
        res = self.client.post(self.list_url, {"productId": 12, "quantity": 4}, format="json")
        self.assertEqual(res.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertIn("quantity", res.data["errors"])

    def test_update_quantity_blocks_when_over_stock(self):
        self.create_product(13, stock=2)
        CartItem.objects.create(user=self.user, product_id=13, quantity=1)
        url = reverse("cart-item", kwargs={"product_id": 13})
        res = self.client.put(url, {"quantity": 3}, format="json")
        self.assertEqual(res.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertIn("quantity", res.data["errors"])

    def test_remove_item(self):
        CartItem.objects.create(user=self.user, product_id=20, quantity=2)
        url = reverse("cart-item", kwargs={"product_id": 20})
        res = self.client.delete(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(CartItem.objects.filter(user=self.user, product_id=20).count(), 0)

    def test_clear_cart(self):
        CartItem.objects.create(user=self.user, product_id=30, quantity=1)
        CartItem.objects.create(user=self.user, product_id=31, quantity=1)
        res = self.client.delete(self.list_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(CartItem.objects.filter(user=self.user).count(), 0)

    def test_unauthenticated_access(self):
        self.client.credentials()
        res = self.client.get(self.list_url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_cart_is_isolated_per_user(self):
        other_user = User.objects.create_user(
            email="other-cart@example.com", name="Other Cart User", password="Secure123"
        )
        CartItem.objects.create(user=other_user, product_id=77, quantity=2)
        CartItem.objects.create(user=self.user, product_id=88, quantity=1)

        res = self.client.get(self.list_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data["items"]), 1)
        self.assertEqual(res.data["items"][0]["product_id"], 88)
