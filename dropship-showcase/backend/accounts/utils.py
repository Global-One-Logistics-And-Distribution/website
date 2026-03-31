from datetime import timedelta
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
from django.utils.crypto import get_random_string


def generate_verification_code():
    """Return a 6-digit numeric code."""
    return get_random_string(length=6, allowed_chars="0123456789")


def send_verification_email(user):
    """
    Generate a verification code, persist expiry, and send it to the user.
    Email sending failures are silenced so signup/login is not blocked.
    """
    code = generate_verification_code()
    user.email_verification_code = code
    user.email_verification_expires_at = timezone.now() + timedelta(minutes=10)
    user.email_verified = False
    user.save(
        update_fields=[
            "email_verification_code",
            "email_verification_expires_at",
            "email_verified",
        ]
    )

    subject = "Verify your email for G.O.L.D"
    message = (
        f"Hi {user.name},\n\n"
        f"Your verification code is {code}. It expires in 10 minutes.\n\n"
        "If you did not request this, you can ignore this email."
    )
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "no-reply@dropship.local")
    send_mail(
        subject,
        message,
        from_email,
        [user.email],
        fail_silently=True,
    )

    return code
