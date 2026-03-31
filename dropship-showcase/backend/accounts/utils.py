from datetime import timedelta
from django.conf import settings
from django.core.mail import get_connection, send_mail
from django.utils import timezone
from django.utils.crypto import get_random_string
import logging
import smtplib
import json
from urllib import request as urlrequest
from urllib.error import HTTPError, URLError

logger = logging.getLogger(__name__)


def _send_via_resend(subject, message, to_email):
    api_key = getattr(settings, "RESEND_API_KEY", "")
    if not api_key:
        logger.error("RESEND_API_KEY is missing while EMAIL_PROVIDER is set to resend.")
        return False

    from_email = getattr(settings, "RESEND_FROM_EMAIL", "") or getattr(settings, "DEFAULT_FROM_EMAIL", "")
    payload = {
        "from": from_email,
        "to": [to_email],
        "subject": subject,
        "text": message,
    }
    req = urlrequest.Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urlrequest.urlopen(req, timeout=getattr(settings, "EMAIL_TIMEOUT", 10)) as response:
            status = getattr(response, "status", 200)
            if status >= 400:
                logger.error("Resend returned non-success status: %s", status)
                return False
            return True
    except HTTPError as e:
        body = ""
        try:
            body = e.read().decode("utf-8", errors="ignore")
        except Exception:
            body = ""
        logger.error("Resend HTTP error for %s: %s %s", to_email, e.code, body)
        return False
    except URLError as e:
        logger.error("Resend network error for %s: %s", to_email, str(e))
        return False
    except Exception as e:
        logger.error("Resend send failed for %s: %s: %s", to_email, type(e).__name__, str(e))
        return False


def _send_via_smtp(subject, message, from_email, to_email):
    send_mail(
        subject,
        message,
        from_email,
        [to_email],
        fail_silently=False,
    )
    return True


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
    
    provider = getattr(settings, "EMAIL_PROVIDER", "smtp").strip().lower()
    try:
        logger.info(f"Attempting to send verification email to {user.email}")
        logger.info(
            "Email config - PROVIDER: %s, BACKEND: %s, HOST: %s, PORT: %s, TLS: %s",
            provider,
            getattr(settings, "EMAIL_BACKEND", "unknown"),
            getattr(settings, "EMAIL_HOST", ""),
            getattr(settings, "EMAIL_PORT", ""),
            getattr(settings, "EMAIL_USE_TLS", ""),
        )

        sent = False
        if provider == "resend":
            sent = _send_via_resend(subject, message, user.email)
            if not sent and getattr(settings, "EMAIL_FALLBACK_TO_SMTP", True):
                logger.warning("Resend failed; falling back to SMTP delivery for %s", user.email)
                sent = _send_via_smtp(subject, message, from_email, user.email)
        else:
            sent = _send_via_smtp(subject, message, from_email, user.email)

        if not sent:
            raise RuntimeError("Email provider did not accept the message")

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
