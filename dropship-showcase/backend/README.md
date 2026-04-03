# Dropship — Django Backend

Django + PostgreSQL REST API backend for the ELITE Dropship Showcase.

## Quick Start

### 1. Prerequisites
- Python 3.11+
- PostgreSQL 14+

### 2. Install dependencies

```bash
cd dropship-showcase/backend
pip install -r requirements.txt
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env with your actual values
```

Never commit a populated `.env` file. Keep secrets only in your deployment platform secret manager (for example, Render environment variables).

### 4. Create database

```bash
psql -U postgres -c "CREATE DATABASE dropship;"
```

### 5. Run migrations

```bash
python manage.py migrate
```

### 6. Create a superuser (for admin panel)

```bash
python manage.py createsuperuser
```

### 7. Start the server

```bash
# Development
python manage.py runserver 8000

# Production (with gunicorn)
gunicorn dropship_backend.wsgi:application --bind 0.0.0.0:8000
```

The API will be available at `http://localhost:8000/api/`.
Django Admin panel at `http://localhost:8000/admin/`.

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `SECRET_KEY` | Django secret key (required in production) | insecure default |
| `DEBUG` | Debug mode | `True` |
| `ALLOWED_HOSTS` | Comma-separated allowed hosts | `localhost,127.0.0.1` |
| `DATABASE_URL` | Full PostgreSQL URL (overrides individual DB vars) | — |
| `DB_NAME` | Database name | `dropship` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | — |
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Database port | `5432` |
| `DB_CONN_MAX_AGE` | Persistent DB connections max age in seconds | `600` |
| `DB_CONN_HEALTH_CHECKS` | Enable connection health checks | `True` |
| `PGBOUNCER_TRANSACTION_POOLING` | Enable pgBouncer transaction-pooling compatibility | `False` |
| `STATIC_HOST` | CDN host for static files (for example `https://cdn.example.com`) | — |
| `MEDIA_HOST` | CDN host for media files | — |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret key for server-side verification | — |
| `JWT_LIFETIME_DAYS` | JWT access token lifetime in days | `7` |
| `JWT_SESSION_LIFETIME_HOURS` | Access token lifetime when remember me is OFF | `12` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed frontend origins | `http://localhost:5173` |
| `GOOGLE_CLIENT_ID` | Google OAuth web client ID used for token verification | — |
| `FIREBASE_PROJECT_ID` | Firebase project ID for verifying Firebase ID tokens | — |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin service account client email | — |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin private key (use escaped `\\n`) | — |
| `FIREBASE_PRIVATE_KEY_ID` | Firebase Admin private key id | — |
| `FIREBASE_CLIENT_ID` | Firebase Admin service account client id | — |
| `FIREBASE_CLIENT_X509_CERT_URL` | Firebase Admin service account cert URL | — |
| `EMAIL_TIMEOUT` | Timeout (seconds) for email API calls | `10` |
| `ZEPTOMAIL_API_URL` | ZeptoMail API endpoint | `https://api.zeptomail.in/v1.1/email` |
| `ZEPTOMAIL_API_KEY` | ZeptoMail API key (`Zoho-enczapikey` value) | — |
| `ZEPTOMAIL_FROM_EMAIL` | Verified sender email in ZeptoMail | `DEFAULT_FROM_EMAIL` |
| `ZEPTOMAIL_FROM_NAME` | Sender display name | `EliteDrop` |
| `RAZORPAY_KEY_ID` | Razorpay public key id for server-side order APIs | — |
| `RAZORPAY_KEY_SECRET` | Razorpay key secret (keep backend-only) | — |

### Razorpay Key Safety

- Put only the key id in frontend env (`VITE_RAZORPAY_KEY_ID`).
- Never put `RAZORPAY_KEY_SECRET` in frontend code, frontend env, logs, or screenshots.
- Keep `RAZORPAY_KEY_SECRET` only in backend env variables (for example, Render service secrets).

### Email Delivery (ZeptoMail)

Configure ZeptoMail in your environment:

```bash
DEFAULT_FROM_EMAIL=your-verified-sender@elitedrop.net.in
ZEPTOMAIL_API_KEY=Zoho-enczapikey-value
ZEPTOMAIL_FROM_EMAIL=your-verified-sender@elitedrop.net.in
ZEPTOMAIL_FROM_NAME=EliteDrop
```

Keep sender identity aligned with a verified ZeptoMail domain/sender.

### Turnstile

Auth endpoints (`signup`, `signin`, `social/google`, `social/firebase`) verify Turnstile when `TURNSTILE_SECRET_KEY` is configured.

## API Endpoints

### Auth (`/api/auth/`)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/signup/` | — | Register a new user |
| POST | `/signin/` | — | Sign in, returns JWT |
| POST | `/social/google/` | — | Continue with Google (ID token exchange) |
| POST | `/social/firebase/` | — | Continue with Firebase providers (Google popup token exchange) |
| GET | `/me/` | ✓ Bearer | Get current user |
| PATCH | `/me/update/` | ✓ Bearer | Update profile |
| POST | `/me/delete/` | ✓ Bearer | Delete account |

### Cart (`/api/cart/`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | ✓ | Get cart items |
| POST | `/` | ✓ | Add / upsert item |
| DELETE | `/` | ✓ | Clear cart |
| PUT | `/<product_id>/` | ✓ | Update quantity |
| DELETE | `/<product_id>/` | ✓ | Remove item |

### Wishlist (`/api/wishlist/`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | ✓ | Get wishlist product IDs |
| POST | `/toggle/` | ✓ | Toggle a product |
| POST | `/sync/` | ✓ | Sync local wishlist |

### Orders (`/api/orders/`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | ✓ | List user's orders |
| POST | `/` | ✓ | Place a new order |
| GET | `/<order_number>/` | ✓ | Order detail |

### Health
| Method | Path | Description |
|---|---|---|
| GET | `/api/health/` | Service health check |
