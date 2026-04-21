# EliteDrop — Dropship Showcase

A full-stack dropshipping storefront built with **React + Vite** (frontend) and **Django + PostgreSQL** (backend).

## Architecture

```
dropship-showcase/
├── src/                  # React frontend (Vite)
│   ├── components/       # Shared UI components (Navbar, Footer, ErrorBoundary, …)
│   ├── context/          # AuthContext, CartContext, WishlistContext, ThemeContext
│   ├── pages/            # Route-level page components
│   ├── data/             # Static product JSON (dev/demo)
│   └── utils/            # currency formatter (formatINR)
├── backend/              # Django REST API backend  ← active backend
│   ├── accounts/         # User model, signup/signin/me endpoints
│   ├── cart/             # CartItem model + CRUD endpoints
│   ├── wishlist/         # WishlistItem model + toggle/sync endpoints
│   ├── dropship_backend/ # Django project settings, urls, wsgi
│   ├── requirements.txt  # Python dependencies
│   └── .env.example      # Backend env template
├── public/               # Static assets + SPA routing (_redirects for Netlify)
└── vercel.json           # Vercel SPA rewrite rules
```

**Tech stack:**
- Frontend: React 18, Vite, Tailwind CSS v4, Framer Motion, React Router v7, react-hot-toast, react-helmet-async
- Backend: **Django 6**, Django REST Framework, SimpleJWT, django-cors-headers, psycopg2
- Database: **PostgreSQL** (local or hosted — Supabase, Render, Railway, etc.)
- Currency: INR (₹) via `Intl.NumberFormat("en-IN")` — Indian comma grouping

---

## Local Development Setup

### Prerequisites
- Node.js 18+ (frontend)
- Python 3.11+ (backend)
- PostgreSQL 14+

---

### 1. Clone & install frontend

```sh
cd dropship-showcase
npm install
```

### 2. Configure frontend env

```sh
cp .env.example .env
# .env already defaults to http://localhost:8000/api
```

### 3. Install backend dependencies

```sh
cd dropship-showcase/backend
pip install -r requirements.txt
```

### 4. Configure backend env

```sh
cp .env.example .env
# Edit .env — set DB credentials and a long SECRET_KEY
```

### 5. Create database & run migrations

```sh
psql -U postgres -c "CREATE DATABASE dropship;"
python manage.py migrate
```

### 6. Create superuser (for admin panel)

```sh
python manage.py createsuperuser
```

### 7. Run the Django backend

```sh
# From dropship-showcase/backend/
python manage.py runserver 8000
```

### 8. Run the frontend

```sh
# From dropship-showcase/
npm run dev
```

- Frontend: **http://localhost:5173**
- API: **http://localhost:8000/api**
- Admin: **http://localhost:8000/admin**

---

## Environment Variables

### Frontend (`dropship-showcase/.env`)

| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | Django backend API base URL | `http://localhost:8000/api` |

```sh
cp dropship-showcase/.env.example dropship-showcase/.env
```

### Backend (`dropship-showcase/backend/.env`)

| Variable | Description | Default |
|---|---|---|
| `SECRET_KEY` | Django secret key (generate in production) | insecure dev key |
| `DEBUG` | Debug mode | `True` |
| `ALLOWED_HOSTS` | Comma-separated allowed hosts | `localhost,127.0.0.1` |
| `DATABASE_URL` | Full PostgreSQL URL (overrides individual settings) | — |
| `DB_NAME` | Database name | `dropship` |
| `DB_USER` | PostgreSQL user | `postgres` |
| `DB_PASSWORD` | PostgreSQL password | — |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `JWT_LIFETIME_DAYS` | JWT access token lifetime (days) | `7` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed frontend origins | `http://localhost:5173` |

```sh
cp dropship-showcase/backend/.env.example dropship-showcase/backend/.env
```

---

## API Overview

### Auth (`/api/auth/`)
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/signup` | — | Register → returns `{token, user}` |
| `POST` | `/signin` | — | Login → returns `{token, user}` |
| `GET` | `/me` | ✓ Bearer | Get current user |

### Cart (`/api/cart/`)
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/` | ✓ | Get all cart items |
| `POST` | `/` | ✓ | Add/upsert item `{productId, quantity}` |
| `DELETE` | `/` | ✓ | Clear entire cart |
| `PUT` | `/<id>` | ✓ | Update quantity `{quantity}` |
| `DELETE` | `/<id>` | ✓ | Remove single item |

### Wishlist (`/api/wishlist/`)
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/` | ✓ | Get list of product IDs |
| `POST` | `/toggle` | ✓ | Toggle product `{productId}` |
| `POST` | `/sync` | ✓ | Bulk replace `{productIds:[...]}` |

### Health
```
GET /api/health/  →  {"status": "ok", "timestamp": "..."}
```

---

## Deployment Notes

### Django Backend

1. Set `DEBUG=False` in production.
2. Generate a strong `SECRET_KEY`:
   ```sh
   python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
   ```
3. Set `ALLOWED_HOSTS` to your domain(s).
4. Set `DATABASE_URL` (recommended for hosting platforms).
5. Set `CORS_ALLOWED_ORIGINS` to your frontend domain.
6. Run with Gunicorn:
   ```sh
   gunicorn dropship_backend.wsgi:application --bind 0.0.0.0:8000
   ```
7. Run migrations on deploy: `python manage.py migrate`.

### Frontend (SPA — Blank Screen on Refresh Fix)

When deploying the React SPA, the server must rewrite all unknown paths to `index.html`.  
Rewrite rules are already included:

- **Netlify**: `public/_redirects` already present (`/* /index.html 200`)
- **Vercel**: `vercel.json` rewrite rule already present
- **Nginx** (custom server):
  ```nginx
  location / {
    try_files $uri $uri/ /index.html;
  }
  ```
- **Apache**:
  ```apache
  FallbackResource /index.html
  ```

Build the frontend:
```sh
npm run build   # outputs to dist/
```
Deploy the `dist/` folder to Vercel, Netlify, or any static host.  
Set `VITE_API_URL` to your Django backend URL during build.

---

## Django Admin Panel — Practical Usage

The Django Admin panel (`/admin/`) is a built-in, auto-generated management UI.  
After running `python manage.py createsuperuser` and visiting `/admin/`, you can:

| Entity | What you can do |
|---|---|
| **Users** | List all registered users, view/edit profiles, reset passwords, deactivate accounts, filter by staff/active status |
| **Cart Items** | Inspect any user's cart, correct quantities, remove stuck items if a cart bug occurs |
| **Wishlist Items** | View/moderate all wishlist entries across users |
| **Groups / Permissions** | Assign fine-grained permissions to staff accounts (e.g., give a content moderator access to products but not user data) |

**How it complements the frontend:**
- **Catalog management**: Products are currently served from `src/data/products.json` (static JSON). When you move to a `Product` Django model, the admin panel immediately gives you a full CRUD UI for catalog management — add/edit/delete products, update prices in INR, manage stock, without touching code.
- **Order management**: Once an `Order` model is added, admins can see order history, update statuses (`pending → shipped → delivered`), and handle refunds.
- **User moderation**: Ban/deactivate abusive accounts, reset passwords, or verify emails without needing a custom admin interface.
- **Quick data ops**: Bulk-delete test data, export CSV of users/orders, run data corrections via admin actions — all without writing SQL.
- **Debug production issues**: Check if a user's cart has malformed data, inspect which products are in wishlists, verify JWT is being issued correctly by checking `last_login`.

---

## Changelog

### Django Migration (this PR)
- **Replaced** Node/Express backend with Django + PostgreSQL (`backend/` directory)
- **Added** Django apps: `accounts`, `cart`, `wishlist` with full CRUD APIs
- **Added** JWT authentication via `djangorestframework-simplejwt`
- **Added** Rate limiting on login endpoint (10 requests / 15 min per IP)
- **Added** CORS configuration via `django-cors-headers`
- **Added** `ErrorBoundary` component in frontend to prevent full white screens
- **Added** SPA routing fix: `public/_redirects` (Netlify) and `vercel.json` (Vercel)
- **Added** Catch-all route in `App.jsx` to redirect unknown paths to home
- **Updated** all default API URLs from `localhost:5000` → `localhost:8000`
- **Fixed** cart `normalizeServerItems` to handle multiple response shapes
- **INR formatting** applied globally via `formatINR` utility

### Verification Checklist
- [ ] `python manage.py migrate` completes without errors
- [ ] `POST /api/auth/signup` creates user and returns `{token, user}`
- [ ] `POST /api/auth/signin` returns `{token, user}`
- [ ] `GET /api/auth/me` with Bearer token returns user data
- [ ] `GET /api/cart/` returns `{items:[...]}`
- [ ] Cart CRUD operations persist to database
- [ ] Wishlist toggle/sync works for authenticated users
- [ ] Frontend loads without blank screen on refresh (SPA rewrite active)
- [ ] INR prices display with Indian comma formatting (₹1,00,000)
- [ ] Django admin accessible at `/admin/` with superuser credentials

---

## Author
agm024

## License
MIT
