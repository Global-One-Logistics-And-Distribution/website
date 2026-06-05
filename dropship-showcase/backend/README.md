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

Never commit a populated `.env` file. Keep secrets only in your deployment secret manager.

For production, use `.env.production.example` as a template.

### 4. Create local database

```bash
psql -U postgres -c "CREATE DATABASE dropship;"
```

If you use a different local PostgreSQL user or password, update `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, and `DB_PORT` in your backend environment.

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

## VPS Deployment (Ubuntu 24.04 + Nginx + PM2)

See `DEPLOYMENT_VPS.md` for a full production setup.

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `SECRET_KEY` | Django secret key (required in production) | insecure default |
| `DEBUG` | Debug mode | `True` |
| `ALLOWED_HOSTS` | Comma-separated allowed hosts | `localhost,127.0.0.1` |
| `DB_NAME` | PostgreSQL database name | `dropship` |
| `DB_USER` | PostgreSQL user | `postgres` |
| `DB_PASSWORD` | PostgreSQL password | — |
| `DB_HOST` | PostgreSQL host | `127.0.0.1` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_CONN_MAX_AGE` | Persistent DB connections max age in seconds | `600` |
| `DB_CONN_HEALTH_CHECKS` | Enable connection health checks | `True` |
| `PGBOUNCER_TRANSACTION_POOLING` | Enable pgBouncer transaction-pooling compatibility | `False` |
| `STATIC_HOST` | CDN host for static files (for example `https://cdn.example.com`) | — |
| `MEDIA_HOST` | CDN host for media files | — |
| `JWT_LIFETIME_DAYS` | JWT access token lifetime in days | `7` |
| `JWT_SESSION_LIFETIME_HOURS` | Access token lifetime when remember me is OFF | `12` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed frontend origins | `http://localhost:5173` |
| `STOREFRONT_URL` | Public storefront base URL used in feeds/canonical links | `https://www.elitedrop.net.in` |
| `MERCHANT_FEED_CURRENCY` | Currency code used in Google Merchant feed prices | `INR` |
| `MERCHANT_FEED_SHIPPING_COUNTRIES` | Comma-separated ISO country codes for feed shipping lines | `IN` |
| `MERCHANT_FEED_SHIPPING_SERVICE` | Shipping service label in Merchant feed | `Standard` |
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
| POST | `/<order_number>/invoice/create/` | ✓ | Create Razorpay invoice link for this order |
| GET | `/<order_number>/invoice/` | ✓ | Download HTML invoice |

### Health
| Method | Path | Description |
|---|---|---|
| GET | `/api/health/` | Service health check |

### Google Merchant Feed
| Method | Path | Description |
|---|---|---|
| GET | `/api/products/merchant/google.xml` | XML product feed for Google Merchant Center |

### Homepage Hero Slides
| Method | Path | Description |
|---|---|---|
| GET | `/api/products/hero-slides/` | Returns active hero carousel slides managed in Django admin |

Merchant feed notes:
- Feed now includes `g:shipping` per item using `MERCHANT_FEED_SHIPPING_COUNTRIES`.
- Feed shipping `g:price` is generated per item and matches each product price.
- Feed always includes fallback `g:age_group`, `g:gender`, and `g:color` values to satisfy Merchant Center requirements.
- Set `MERCHANT_FEED_SHIPPING_COUNTRIES` to all your target countries in Merchant Center, for example `IN,AE,US`.
