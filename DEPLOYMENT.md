# Deployment & Operations Guide — eDNA Explorer

This document describes the production deployment, architecture, security hardening, and operational procedures for the **eDNA Explorer** platform.

---

## 1. System Architecture Overview

The system consists of two primary tiers:

```
┌───────────────────────────────┐
│        Web Browser            │
│   (React + TypeScript SPA)    │
└──────────────┬────────────────┘
               │ HTTPS / JSON & Multipart
               ▼
┌───────────────────────────────┐
│ Reverse Proxy (Nginx / Caddy) │
│ - TLS termination             │
│ - Security headers            │
│ - Static assets (SPA bundle)  │
│ - Proxy /api/ to FastAPI      │
└──────────────┬────────────────┘
               │ HTTP (Uvicorn / Gunicorn)
               ▼
┌───────────────────────────────┐
│     FastAPI ASGI Backend      │
│ - FASTA streaming & validation│
│ - Contract v1.0 enforcement   │
│ - Threshold classification    │
└──────────────┬────────────────┘
               │ SQLite WAL / PostgreSQL
               ▼
┌───────────────────────────────┐
│ Persistent Storage (Database) │
│ - SQLite WAL + busy_timeout   │
│ - Analysis runs & sequences   │
└───────────────────────────────┘
```

---

## 2. Security Hardening Measures

The following security controls are active:

1. **Path Traversal & Filename Sanitization:**
   - All uploaded file paths are stripped of directory hierarchy via `os.path.basename` and regex-sanitized to eliminate null bytes (`\x00`) and control characters.
2. **File Size Enforcement:**
   - Upload streams are consumed in 1 MB chunks and abort with `HTTP 413 Content Too Large` if `MAX_FILE_SIZE_BYTES` (default 10 MB) is exceeded.
3. **Database Concurrency & Integrity:**
   - SQLite connections enable Write-Ahead Logging (`PRAGMA journal_mode=WAL`), `PRAGMA synchronous=NORMAL`, `PRAGMA foreign_keys=ON`, and `PRAGMA busy_timeout=5000` to prevent database locks and enforce cascading deletes.
   - All write transactions are wrapped in explicit rollback blocks on exception.
4. **CORS Restrictions:**
   - Configurable allowed origins via `CORS_ORIGINS` in `.env`.
   - Wildcard origins (`*`) are disallowed when credentials are transmitted.
5. **Information Leakage Prevention:**
   - Unhandled exceptions are intercepted by a global exception handler returning a generic `500 Internal Server Error`, while full tracebacks are logged strictly to internal logs.
6. **Scientific Disclosure & Synthetic Isolation:**
   - Synthetic fixtures are marked with `is_synthetic: true` across database records, API payloads, UI tags, and exports, preventing confusion with real classified runs.

---

## 3. Backend Deployment

### Prerequisites
- Python 3.10+ (Python 3.11+ recommended)
- Virtual environment (`venv`)

### Installation & Configuration
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env` for production:
```ini
APP_ENV=production
DEBUG=False
HOST=127.0.0.1
PORT=8000
CORS_ORIGINS=https://edna.yourdomain.org
DATABASE_URL=sqlite:///./edna_explorer.db
```

### Running with Systemd (Linux)
Create `/etc/systemd/system/edna-api.service`:
```ini
[Unit]
Description=eDNA Explorer FastAPI Service
After=network.target

[Service]
User=edna
Group=edna
WorkingDirectory=/opt/edna-explorer/backend
Environment="PATH=/opt/edna-explorer/backend/.venv/bin"
EnvironmentFile=/opt/edna-explorer/backend/.env
ExecStart=/opt/edna-explorer/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 4 --proxy-headers --forwarded-allow-ips='*'
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable edna-api
sudo systemctl start edna-api
```

---

## 4. Frontend Deployment

### Build Production Bundle
```bash
cd frontend
npm ci
npm run build
```
The optimized static build is emitted to `frontend/dist/`. Manual chunk splitting bundles React runtime, Recharts, and Lucide icons into separate vendor chunks for browser caching.

### Nginx Configuration
Create `/etc/nginx/sites-available/edna-explorer.conf`:
```nginx
server {
    listen 80;
    server_name edna.yourdomain.org;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name edna.yourdomain.org;

    ssl_certificate /etc/letsencrypt/live/edna.yourdomain.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/edna.yourdomain.org/privkey.pem;

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://edna.yourdomain.org;" always;

    # Static Frontend
    root /opt/edna-explorer/frontend/dist;
    index index.html;

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 12M;
    }

    # API Documentation (optional, can be restricted to internal IPs)
    location ~ ^/(docs|redoc|openapi.json) {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
    }
}
```

---

## 5. Operations & Database Maintenance

### Database Backups (SQLite WAL Mode)
Because SQLite uses Write-Ahead Logging (`WAL`), the live database file should be backed up using the SQLite online backup API or CLI tool rather than a raw copy:
```bash
# Perform non-blocking online backup:
sqlite3 /opt/edna-explorer/backend/edna_explorer.db ".backup '/opt/backups/edna_explorer_$(date +%Y%m%d_%H%M%S).db'"
```

Schedule daily automated backups via crontab:
```bash
0 2 * * * sqlite3 /opt/edna-explorer/backend/edna_explorer.db ".backup '/opt/backups/edna_$(date +\%F).db'" && find /opt/backups -name "edna_*.db" -mtime +14 -delete
```

### Health Check Monitoring
The API provides an operational health probe endpoint:
```http
GET /api/health
```
Response:
```json
{
  "status": "healthy",
  "service": "edna-explorer-api",
  "version": "1.0.0",
  "database": "connected"
}
```
If database connectivity fails, `status` returns `"degraded"` and `database` reports the underlying operational status.
