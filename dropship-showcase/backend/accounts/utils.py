from datetime import timedelta
from django.conf import settings
from django.core.mail import get_connection, send_mail
from django.utils import timezone
from django.utils.crypto import get_random_string
import logging
import smtplib

logger = logging.getLogger(__name__)


def generate_verification_code():
    """Return a 6-digit numeric code."""
    return get_random_string(length=6, allowed_chars="0123456789")


def send_verification_email(user):
    """
    Generate a verification code, persist expiry, and send it to the user.
    Returns True if email sent successfully, False otherwise.
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
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "") or "no-reply@dropship.local"
    
    try:
        logger.info(f"Attempting to send verification email to {user.email}")
        logger.info(
            "Email config - BACKEND: %s, HOST: %s, PORT: %s, TLS: %s",
            getattr(settings, "EMAIL_BACKEND", "unknown"),
            getattr(settings, "EMAIL_HOST", ""),
            getattr(settings, "EMAIL_PORT", ""),
            getattr(settings, "EMAIL_USE_TLS", ""),
        )
        
        send_mail(
            subject,
            message,
            from_email,
            [user.email],
            fail_silently=False,
        )
        logger.info(f"Verification email sent successfully to {user.email}")
        return True
    except smtplib.SMTPAuthenticationError as e:
        error_msg = f"Failed to send verification email to {user.email}: {type(e).__name__}: {str(e)}"
        logger.error(error_msg)
        if getattr(settings, "DEBUG", False):
            logger.warning(
                "SMTP auth failed in DEBUG. Falling back to console email backend. OTP for %s is %s",
                user.email,
                code,
            )
            try:
                console_connection = get_connection("django.core.mail.backends.console.EmailBackend")
                send_mail(
                    subject,
                    message,
                    from_email,
                    [user.email],
                    fail_silently=False,
                    connection=console_connection,
                )
                return True
            except Exception as fallback_error:
                logger.error(
                    "Console email fallback failed for %s: %s: %s",
                    user.email,
                    type(fallback_error).__name__,
                    str(fallback_error),
                )
                return False
        return False
    except Exception as e:
        error_msg = f"Failed to send verification email to {user.email}: {type(e).__name__}: {str(e)}"
        logger.error(error_msg)
        if getattr(settings, "DEBUG", False):
            logger.warning("Debug OTP for %s is %s", user.email, code)
        # Don't crash signup - let user verify with code even if email didn't send
        # In development, they can see the code in admin panel
        return False
