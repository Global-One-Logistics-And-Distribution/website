from datetime import timedelta
from django.conf import settings
from django.utils import timezone
from django.utils.crypto import get_random_string
import logging
import json
from urllib import request as urlrequest
from urllib.error import HTTPError, URLError

logger = logging.getLogger(__name__)


def _send_via_zeptomail(subject, message, to_email):
    api_key = getattr(settings, "ZEPTOMAIL_API_KEY", "")
    if not api_key:
        logger.error("ZEPTOMAIL_API_KEY is missing.")
        return False

    from_email = getattr(settings, "ZEPTOMAIL_FROM_EMAIL", "") or getattr(settings, "DEFAULT_FROM_EMAIL", "")
    from_name = getattr(settings, "ZEPTOMAIL_FROM_NAME", "G.O.L.D")
    api_url = getattr(settings, "ZEPTOMAIL_API_URL", "https://api.zeptomail.in/v1.1/email")
    if not from_email:
        logger.error("ZEPTOMAIL_FROM_EMAIL or DEFAULT_FROM_EMAIL must be set.")
        return False

    payload = {
        "from": {"address": from_email, "name": from_name},
        "to": [{"email_address": {"address": to_email}}],
        "subject": subject,
        "textbody": message,
    }
    req = urlrequest.Request(
        api_url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Zoho-enczapikey {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )

    try:
        with urlrequest.urlopen(req, timeout=getattr(settings, "EMAIL_TIMEOUT", 10)) as response:
            status = getattr(response, "status", 200)
            if status >= 400:
                logger.error("ZeptoMail returned non-success status: %s", status)
                return False
            return True
    except HTTPError as e:
        body = ""
        try:
            body = e.read().decode("utf-8", errors="ignore")
        except Exception:
            body = ""
        logger.error("ZeptoMail HTTP error for %s: %s %s", to_email, e.code, body)
        return False
    except URLError as e:
        logger.error("ZeptoMail network error for %s: %s", to_email, str(e))
        return False
    except Exception as e:
        logger.error("ZeptoMail send failed for %s: %s: %s", to_email, type(e).__name__, str(e))
        return False


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
    from_email = getattr(settings, "ZEPTOMAIL_FROM_EMAIL", "") or getattr(settings, "DEFAULT_FROM_EMAIL", "")

    try:
        logger.info(f"Attempting to send verification email to {user.email}")
        logger.info(
            "Email config - PROVIDER: zeptomail, URL: %s, FROM: %s",
            getattr(settings, "ZEPTOMAIL_API_URL", "https://api.zeptomail.in/v1.1/email"),
            from_email,
        )

        sent = _send_via_zeptomail(subject, message, user.email)

        if not sent:
            raise RuntimeError("Email provider did not accept the message")

        logger.info(f"Verification email sent successfully to {user.email}")
        return True
    except Exception as e:
        error_msg = f"Failed to send verification email to {user.email}: {type(e).__name__}: {str(e)}"
        logger.error(error_msg)
        if getattr(settings, "DEBUG", False):
            logger.warning("Debug OTP for %s is %s", user.email, code)
        # Don't crash signup - let user verify with code even if email didn't send
        # In development, they can see the code in admin panel
        return False
