from datetime import timedelta
from django.conf import settings
from django.utils import timezone
from django.utils.crypto import get_random_string
import logging
import json
from urllib import request as urlrequest
from urllib.error import HTTPError, URLError

logger = logging.getLogger(__name__)


def _normalize_zeptomail_api_key(raw_key):
    value = str(raw_key or "").strip()
    if value.lower().startswith("zoho-enczapikey "):
        return value.split(" ", 1)[1].strip()
    return value


def _send_via_zeptomail(subject, message, to_email):
    api_key = _normalize_zeptomail_api_key(getattr(settings, "ZEPTOMAIL_API_KEY", ""))
    if not api_key:
        logger.error("ZEPTOMAIL_API_KEY is missing.")
        return False

    from_email = getattr(settings, "ZEPTOMAIL_FROM_EMAIL", "") or getattr(settings, "DEFAULT_FROM_EMAIL", "")
    from_name = getattr(settings, "ZEPTOMAIL_FROM_NAME", "EliteDrop")
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
        logger.error(
            "ZeptoMail HTTP error for %s: status=%s reason=%s body=%s",
            to_email,
            e.code,
            getattr(e, "reason", ""),
            body,
        )
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
    valid_minutes = int(getattr(settings, "EMAIL_VERIFICATION_EXPIRY_MINUTES", 10))
    user.email_verification_code = code
    user.email_verification_expires_at = timezone.now() + timedelta(minutes=valid_minutes)
    user.email_verified = False
    user.save(
        update_fields=[
            "email_verification_code",
            "email_verification_expires_at",
            "email_verified",
        ]
    )

    company_name = getattr(settings, "COMPANY_NAME", "EliteDrop")
    brand_name = getattr(settings, "BRAND_NAME", company_name)
    support_email = getattr(settings, "SUPPORT_EMAIL", "support@elitedrop.net.in") or getattr(settings, "DEFAULT_FROM_EMAIL", "support@elitedrop.net.in")

    subject = f"{company_name} verification code"
    message = (
        "Verification code\n\n"
        f"Enter the below one time password to verify your {company_name} account:\n\n"
        f"{code}\n\n"
        f"The verification code expires in {valid_minutes} minutes.\n\n"
        f"If you have further questions, write to us at {support_email} and our team will get back to you.\n\n"
        "Have a great day!\n\n"
        f"Team {brand_name}"
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
        # Don't crash signup flow; caller can show retry guidance to user.
        return False
