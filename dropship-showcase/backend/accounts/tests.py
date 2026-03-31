from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from .models import User


class SignupTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse("signup")

    def test_signup_success(self):
        res = self.client.post(self.url, {
            "name": "Test User",
            "email": "test@example.com",
            "password": "Secure123",
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res.data.get("requires_verification"))
        self.assertIn("user", res.data)
        self.assertNotIn("token", res.data)

    def test_signup_duplicate_email(self):
        User.objects.create_user(email="dup@example.com", name="Dup", password="Secure123")
        res = self.client.post(self.url, {
            "name": "Dup",
            "email": "dup@example.com",
            "password": "Secure123",
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)

    def test_signup_weak_password(self):
        res = self.client.post(self.url, {
            "name": "Test",
            "email": "test2@example.com",
            "password": "nouppercase1",
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)


class SigninTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse("signin")
        self.user = User.objects.create_user(
            email="login@example.com", name="Login User", password="Secure123", email_verified=True
        )

    def test_signin_success(self):
        res = self.client.post(self.url, {
            "email": "login@example.com",
            "password": "Secure123",
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("token", res.data)

    def test_signin_requires_verification_when_unverified(self):
        self.user.email_verified = False
        self.user.save(update_fields=["email_verified"])
        res = self.client.post(self.url, {
            "email": "login@example.com",
            "password": "Secure123",
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(res.data.get("requires_verification"))
        self.assertNotIn("token", res.data)

    def test_signin_wrong_password(self):
        res = self.client.post(self.url, {
            "email": "login@example.com",
            "password": "WrongPass1",
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class MeTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse("me")
        self.user = User.objects.create_user(
            email="me@example.com", name="Me User", password="Secure123", email_verified=True
        )

    def _get_token(self):
        from rest_framework_simplejwt.tokens import RefreshToken
        return str(RefreshToken.for_user(self.user).access_token)

    def test_me_authenticated(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self._get_token()}")
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["user"]["email"], "me@example.com")

    def test_me_unauthenticated(self):
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class VerificationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.verify_url = reverse("verify-email")
        self.resend_url = reverse("resend-verification")
        self.user = User.objects.create_user(
            email="verify@example.com",
            name="Verify User",
            password="Secure123",
        )

    def test_verify_email_success(self):
        # mimic code issuance
        self.user.email_verification_code = "123456"
        self.user.save(update_fields=["email_verification_code"])

        res = self.client.post(
            self.verify_url,
            {"email": "verify@example.com", "code": "123456"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.email_verified)
        self.assertIn("token", res.data)

    def test_verify_email_invalid_code(self):
        self.user.email_verification_code = "123456"
        self.user.save(update_fields=["email_verification_code"])

        res = self.client.post(
            self.verify_url,
            {"email": "verify@example.com", "code": "000000"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_resend_verification(self):
        res = self.client.post(
            self.resend_url, {"email": "verify@example.com"}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
