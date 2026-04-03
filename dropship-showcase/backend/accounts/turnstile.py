import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


def is_turnstile_enabled():
    return bool(getattr(settings, "TURNSTILE_SECRET_KEY", "").strip())


def verify_turnstile_token(token, remoteip=""):
    secret = str(getattr(settings, "TURNSTILE_SECRET_KEY", "")).strip()
    if not secret:
        return True, ""

    token = str(token or "").strip()
    if not token:
        return False, "Turnstile token is required."

    try:
        response = requests.post(
            TURNSTILE_VERIFY_URL,
            data={
                "secret": secret,
                "response": token,
                "remoteip": remoteip or "",
            },
            timeout=10,
        )
        payload = response.json() if response.ok else {}
        if bool(payload.get("success")):
            return True, ""

        error_codes = payload.get("error-codes") or []
        message = "Turnstile verification failed."
        if error_codes:
            message = f"Turnstile verification failed: {', '.join(error_codes)}"
        return False, message
    except Exception as exc:
        logger.warning("Turnstile verification error: %s", exc)
        return False, "Unable to verify Turnstile right now."
