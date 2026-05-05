"""
Django settings for the Dropship backend.
"""
from pathlib import Path
from datetime import timedelta
from decouple import config, Csv

try:
    import whitenoise  # noqa: F401
    HAS_WHITENOISE = True
except ImportError:
    HAS_WHITENOISE = False

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config("SECRET_KEY", default="q+7izv=m%r72y(41m4@cj8a7z_*)$9#k1s@!y3!7-z-&8^+0o8")

DEBUG = config("DEBUG", default=True, cast=bool)

if not DEBUG and SECRET_KEY == "django-insecure-change-me-in-production-!@#$%":
    raise ValueError("SECRET_KEY must be set to a secure value when DEBUG=False")

ALLOWED_HOSTS = config(
    "ALLOWED_HOSTS",
    default="localhost,127.0.0.1,elitedrop-admin.onrender.com,elitedrop.net.in,www.elitedrop.net.in",
    cast=Csv(),
)

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third party
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    # Local apps
    "accounts",
    "cart",
    "wishlist",
    "products",
    "orders",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.gzip.GZipMiddleware",
    "dropship_backend.middleware.SecurityHeadersMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

if HAS_WHITENOISE:
    # Keep static file serving optimized in environments where whitenoise is installed.
    MIDDLEWARE.insert(3, "whitenoise.middleware.WhiteNoiseMiddleware")

ROOT_URLCONF = "dropship_backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "dropship_backend.wsgi.application"

# ── Database ──────────────────────────────────────────────────────────────────
# Uses DATABASE_URL env var for PostgreSQL; falls back to SQLite for development
DATABASE_URL = config("DATABASE_URL", default=None)
DB_CONN_MAX_AGE = config("DB_CONN_MAX_AGE", default=600, cast=int)
DB_CONN_HEALTH_CHECKS = config("DB_CONN_HEALTH_CHECKS", default=True, cast=bool)

if DATABASE_URL:
    import dj_database_url
    DATABASES = {
        "default": dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=DB_CONN_MAX_AGE,
            conn_health_checks=DB_CONN_HEALTH_CHECKS,
        )
    }
    if config("PGBOUNCER_TRANSACTION_POOLING", default=False, cast=bool):
        DATABASES["default"]["DISABLE_SERVER_SIDE_CURSORS"] = True
else:
    # Allow individual env vars for PostgreSQL; fall back to SQLite for quick dev setup
    _pg_name = config("DB_NAME", default="")
    if _pg_name:
        DATABASES = {
            "default": {
                "ENGINE": "django.db.backends.postgresql",
                "NAME": config("DB_NAME", default="EliteDrop"),
                "USER": config("DB_USER", default="EliteDrop"),
                "PASSWORD": config("DB_PASSWORD", default="EliteDrop@2026"),
                "HOST": config("DB_HOST", default="db.uhicntqrshlkvvxtmdqy.supabase.co"),
                "PORT": config("DB_PORT", default="5432"),
                "CONN_MAX_AGE": DB_CONN_MAX_AGE,
                "CONN_HEALTH_CHECKS": DB_CONN_HEALTH_CHECKS,
                'OPTIONS': {
                          'sslmode': 'require',  # needed for Supabase
                 },
            }
        }
        if config("PGBOUNCER_TRANSACTION_POOLING", default=False, cast=bool):
            DATABASES["default"]["DISABLE_SERVER_SIDE_CURSORS"] = True
    else:
        DATABASES = {
            "default": {
                "ENGINE": "django.db.backends.sqlite3",
                "NAME": BASE_DIR / "db.sqlite3",
            }
        }

# ── Auth ──────────────────────────────────────────────────────────────────────
AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ── DRF ───────────────────────────────────────────────────────────────────────
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_RENDERER_CLASSES": (
        "rest_framework.renderers.JSONRenderer",
    ),
    "NON_FIELD_ERRORS_KEY": "error",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/hour",
        "user": "1000/hour",
        "login": "10/hour",
        "payment_create_order": "30/hour",
        "payment_verify": "60/hour",
    },
}

# ── JWT ───────────────────────────────────────────────────────────────────────
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(days=config("JWT_LIFETIME_DAYS", default=7, cast=int)),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=30),
    "ROTATE_REFRESH_TOKENS": False,
    "UPDATE_LAST_LOGIN": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}

JWT_SESSION_LIFETIME_HOURS = config("JWT_SESSION_LIFETIME_HOURS", default=12, cast=int)
GOOGLE_CLIENT_ID = config("GOOGLE_CLIENT_ID", default="")
FIREBASE_PROJECT_ID = config("FIREBASE_PROJECT_ID", default="")
FIREBASE_CLIENT_EMAIL = config("FIREBASE_CLIENT_EMAIL", default="")
FIREBASE_PRIVATE_KEY = config("FIREBASE_PRIVATE_KEY", default="")
FIREBASE_PRIVATE_KEY_ID = config("FIREBASE_PRIVATE_KEY_ID", default="")
FIREBASE_CLIENT_ID = config("FIREBASE_CLIENT_ID", default="")
FIREBASE_CLIENT_X509_CERT_URL = config("FIREBASE_CLIENT_X509_CERT_URL", default="")
FIREBASE_CLOCK_SKEW_SECONDS = config("FIREBASE_CLOCK_SKEW_SECONDS", default=60, cast=int)
RAZORPAY_KEY_ID = config("RAZORPAY_KEY_ID", default="")
RAZORPAY_KEY_SECRET = config("RAZORPAY_KEY_SECRET", default="")
RAZORPAY_WEBHOOK_SECRET = config("RAZORPAY_WEBHOOK_SECRET", default="")

# ── CORS ──────────────────────────────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = config(
    "CORS_ALLOWED_ORIGINS",
    default="http://localhost:5173,http://127.0.0.1:5173,https://elitedrop.net.in,https://www.elitedrop.net.in",
    cast=Csv(),
)
CORS_ALLOWED_ORIGIN_REGEXES = config(
    "CORS_ALLOWED_ORIGIN_REGEXES",
    default=r"^https://.*\.vercel\.app$",
    cast=Csv(),
)
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]
CORS_ALLOW_METHODS = ["DELETE", "GET", "OPTIONS", "PATCH", "POST", "PUT"]
CSRF_TRUSTED_ORIGINS = config(
    "CSRF_TRUSTED_ORIGINS",
    default="http://localhost:5173,http://127.0.0.1:5173,https://elitedrop.net.in,https://www.elitedrop.net.in",
    cast=Csv(),
)
STOREFRONT_URL = config("STOREFRONT_URL", default="https://www.elitedrop.net.in")

# ── Security (production) ─────────────────────────────────────────────────────
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SECURE_BROWSER_XSS_FILTER = True

SECURE_HSTS_SECONDS = config("SECURE_HSTS_SECONDS", default=31536000, cast=int)
SECURE_HSTS_INCLUDE_SUBDOMAINS = config("SECURE_HSTS_INCLUDE_SUBDOMAINS", default=True, cast=bool)
SECURE_HSTS_PRELOAD = config("SECURE_HSTS_PRELOAD", default=True, cast=bool)

SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = config("CSRF_COOKIE_HTTPONLY", default=True, cast=bool)
SESSION_COOKIE_SAMESITE = config("SESSION_COOKIE_SAMESITE", default="Lax")
CSRF_COOKIE_SAMESITE = config("CSRF_COOKIE_SAMESITE", default="Lax")
SESSION_COOKIE_SECURE = config("SESSION_COOKIE_SECURE", default=not DEBUG, cast=bool)
CSRF_COOKIE_SECURE = config("CSRF_COOKIE_SECURE", default=not DEBUG, cast=bool)

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = config("SECURE_SSL_REDIRECT", default=not DEBUG, cast=bool)
SECURE_REFERRER_POLICY = config("SECURE_REFERRER_POLICY", default="strict-origin-when-cross-origin")

# ── Static ────────────────────────────────────────────────────────────────────
STATIC_HOST = config("STATIC_HOST", default="").rstrip("/")
MEDIA_HOST = config("MEDIA_HOST", default="").rstrip("/")
STATIC_URL = f"{STATIC_HOST}/static/" if STATIC_HOST else "/static/"
MEDIA_URL = f"{MEDIA_HOST}/media/" if MEDIA_HOST else "/media/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_ROOT = BASE_DIR / "media"
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": (
            "whitenoise.storage.CompressedManifestStaticFilesStorage"
            if HAS_WHITENOISE
            else "django.contrib.staticfiles.storage.StaticFilesStorage"
        ),
    },
}

# ── Email (ZeptoMail API) ─────────────────────────────────────────────────────
EMAIL_TIMEOUT = config("EMAIL_TIMEOUT", default=10, cast=int)
EMAIL_VERIFICATION_REQUIRED = config("EMAIL_VERIFICATION_REQUIRED", default=True, cast=bool)
DEFAULT_FROM_EMAIL = config(
    "DEFAULT_FROM_EMAIL",
    default="no-reply@elitedrop.net.in",
)
ZEPTOMAIL_API_URL = config("ZEPTOMAIL_API_URL", default="https://api.zeptomail.in/v1.1/email")
ZEPTOMAIL_API_KEY = config("ZEPTOMAIL_API_KEY", default="")
ZEPTOMAIL_FROM_EMAIL = config("ZEPTOMAIL_FROM_EMAIL", default=DEFAULT_FROM_EMAIL)
ZEPTOMAIL_FROM_NAME = config("ZEPTOMAIL_FROM_NAME", default="EliteDrop Support")

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "dropship-cache",
        "TIMEOUT": 300,
    }
}

# ── Logging ───────────────────────────────────────────────────────────────────
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
        },
    },
    "loggers": {
        "accounts": {
            "handlers": ["console"],
            "level": "DEBUG",
            "propagate": True,
        },
        "django.core.mail": {
            "handlers": ["console"],
            "level": "DEBUG",
            "propagate": True,
        },
    }
}
