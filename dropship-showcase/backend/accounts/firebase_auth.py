from django.conf import settings
import firebase_admin
from firebase_admin import auth as firebase_admin_auth, credentials


def _build_certificate_from_settings():
    project_id = getattr(settings, "FIREBASE_PROJECT_ID", "")
    client_email = getattr(settings, "FIREBASE_CLIENT_EMAIL", "")
    private_key = getattr(settings, "FIREBASE_PRIVATE_KEY", "")

    if not project_id or not client_email or not private_key:
        return None

    return credentials.Certificate(
        {
            "type": "service_account",
            "project_id": project_id,
            "private_key_id": getattr(settings, "FIREBASE_PRIVATE_KEY_ID", ""),
            "private_key": private_key.replace("\\n", "\n"),
            "client_email": client_email,
            "client_id": getattr(settings, "FIREBASE_CLIENT_ID", ""),
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_x509_cert_url": getattr(settings, "FIREBASE_CLIENT_X509_CERT_URL", ""),
        }
    )


def get_firebase_app():
    if firebase_admin._apps:
        return firebase_admin.get_app()

    cert = _build_certificate_from_settings()
    if cert is None:
        return None

    return firebase_admin.initialize_app(cert, {"projectId": settings.FIREBASE_PROJECT_ID})


def verify_firebase_id_token(id_token):
    app = get_firebase_app()
    if app is None:
        raise RuntimeError("Firebase Admin is not configured")

    clock_skew_seconds = int(getattr(settings, "FIREBASE_CLOCK_SKEW_SECONDS", 60) or 60)
    return firebase_admin_auth.verify_id_token(
        id_token,
        app=app,
        clock_skew_seconds=clock_skew_seconds,
    )
