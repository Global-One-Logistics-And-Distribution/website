# Dropship — Django Backend

Django + PostgreSQL REST API backend for the G.O.L.D Dropship Showcase.

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
| `JWT_LIFETIME_DAYS` | JWT access token lifetime in days | `7` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed frontend origins | `http://localhost:5173` |
| `EMAIL_PROVIDER` | Email delivery provider: `smtp` or `resend` | `smtp` |
| `EMAIL_FALLBACK_TO_SMTP` | Fallback to SMTP when API provider fails | `True` |
| `RESEND_API_KEY` | API key used when `EMAIL_PROVIDER=resend` | — |
| `RESEND_FROM_EMAIL` | Sender identity for Resend | `DEFAULT_FROM_EMAIL` |
| `RAZORPAY_KEY_ID` | Razorpay public key id for server-side order APIs | — |
| `RAZORPAY_KEY_SECRET` | Razorpay key secret (keep backend-only) | — |

### Razorpay Key Safety

- Put only the key id in frontend env (`VITE_RAZORPAY_KEY_ID`).
- Never put `RAZORPAY_KEY_SECRET` in frontend code, frontend env, logs, or screenshots.
- Keep `RAZORPAY_KEY_SECRET` only in backend env variables (for example, Render service secrets).

### Production Email Fix (Outlook Basic Auth Disabled)

If Microsoft SMTP returns `535 Authentication unsuccessful, basic authentication is disabled`,
switch to Resend API delivery:

```bash
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=onboarding@your-verified-domain.com
EMAIL_FALLBACK_TO_SMTP=False
```

Keep `DEFAULT_FROM_EMAIL` aligned with your verified sender identity.

## API Endpoints

### Auth (`/api/auth/`)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/signup/` | — | Register a new user |
| POST | `/signin/` | — | Sign in, returns JWT |
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
