# VPS Deployment (Hostinger KVM2 / Ubuntu + Nginx + Gunicorn + Let’s Encrypt)

## 1) System packages

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3-venv python3-pip nginx postgresql postgresql-contrib git
```

## 2) PostgreSQL

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE elitedrop;
CREATE USER elitedrop WITH ENCRYPTED PASSWORD 'STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE elitedrop TO elitedrop;
\q
```

## 3) App user + code

```bash
sudo adduser --disabled-password --gecos "" dropship
sudo mkdir -p /var/www/dropship
sudo chown dropship:dropship /var/www/dropship
sudo -u dropship git clone <YOUR_REPO_URL> /var/www/dropship/app
```

## 4) Python venv + deps

```bash
cd /var/www/dropship/app/dropship-showcase/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 5) Environment

Create `/var/www/dropship/app/dropship-showcase/backend/.env`:

```
DEBUG=False
SECRET_KEY=replace-with-strong-random-secret
ALLOWED_HOSTS=api.example.com
DATABASE_URL=postgresql://elitedrop:STRONG_PASSWORD@localhost:5432/elitedrop
CORS_ALLOWED_ORIGINS=https://www.example.com
CSRF_TRUSTED_ORIGINS=https://www.example.com
STOREFRONT_URL=https://www.example.com
```

## 6) Migrate + static

```bash
source .venv/bin/activate
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser
```

## 7) Gunicorn with PM2

Install PM2 and set up a process for Gunicorn:

```bash
sudo npm install -g pm2
cd /var/www/dropship/app/dropship-showcase/backend
pm2 start "./.venv/bin/gunicorn dropship_backend.wsgi:application --bind 127.0.0.1:8000 --workers 3 --threads 2 --timeout 120" --name dropship-api
pm2 save
pm2 startup
```

## 8) Nginx reverse proxy

Create `/etc/nginx/sites-available/dropship`:

```
server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static/ {
        alias /var/www/dropship/app/dropship-showcase/backend/staticfiles/;
    }

    location /media/ {
        alias /var/www/dropship/app/dropship-showcase/backend/media/;
    }
}
```

Enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/dropship /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 9) SSL (Let’s Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.example.com
```

## 10) Frontend

Set `VITE_API_URL=https://admin.elitedrop.net.in/api` and deploy the frontend build to your web root or static host.
