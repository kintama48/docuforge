# DocuForge Production Launch Guide

**Last Updated:** 2026-02-11
**Target Architecture:** DigitalOcean Droplet (Engine + API) + Cloudflare Pages (Frontend) + Cloudflare R2 (Assets)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [DNS & Domain Setup](#dns--domain-setup)
4. [Cloudflare R2 Setup (Signed URLs)](#cloudflare-r2-setup-signed-urls)
5. [Droplet Setup](#droplet-setup)
6. [Deploy Backend](#deploy-backend)
7. [Deploy Frontend](#deploy-frontend)
8. [Post-Deploy Configuration](#post-deploy-configuration)
9. [Environment Variables Reference](#environment-variables-reference)
10. [QA Checklist](#qa-checklist)
11. [Rollback Plan](#rollback-plan)
12. [Troubleshooting](#troubleshooting)

---

## Executive Summary

### Launch Readiness: 95/100

**Domain:** `docuforge.app`
**Infrastructure:** Cloudflare (CDN/DNS/R2) + DigitalOcean Droplet

**All code blockers resolved:**
- [x] 33/33 SQA audit issues fixed
- [x] `process.env` bypasses replaced with validated `env.*` (health.ts, engine.ts, asset.ts)
- [x] Caching & compression middleware implemented (Cache-Control, ETags, gzip)
- [x] AI toggle (`AI_ENABLED` env var)
- [x] RAG vector store for Typst documentation
- [x] Webhook system for render events
- [x] 282 tests passing, 0 failures

**What you need to do (infra only):**
1. Configure DNS records in Cloudflare
2. Create R2 bucket + API token
3. Set up droplet (nginx, systemd, SSL)
4. Deploy frontend to Cloudflare Pages
5. Configure Stripe webhooks + OAuth redirects

**Timeline:** 3-4 hours

---

## Architecture Overview

```
                         docuforge.app
                              |
                         CLOUDFLARE
            ┌─────────────────┼─────────────────┐
            |                 |                  |
   www.docuforge.app   api.docuforge.app    R2 Bucket
   (CF Pages - marketing)  (Proxied)       (docuforge-assets)
            |                 |                  |
  console.docuforge.app      |           Signed URLs only
   (CF Pages - app)          |           (no public access)
                              |
                    ┌─────────▼──────────┐
                    │  DIGITALOCEAN VPS   │
                    │                     │
                    │  Nginx (443/80)     │
                    │    ↓                │
                    │  API (Bun:3000)     │
                    │    ↓                │
                    │  Engine (Rust:3001) │
                    │                     │
                    │  SQLite DB          │
                    └─────────────────────┘
```

### Key Principles
1. **Engine isolation** — localhost only, never exposed to internet
2. **R2 private bucket** — no public access, all reads/writes via presigned URLs from the API
3. **Cloudflare proxy** — all traffic goes through CF (DDoS protection, Brotli, caching)
4. **Two frontends** — `www` for marketing (public, cacheable), `console` for app (private, no-cache HTML)

---

## DNS & Domain Setup

In **Cloudflare Dashboard → DNS** for `docuforge.app`:

| Type | Name | Value | Proxy |
|------|------|-------|-------|
| A | `api` | `YOUR_DROPLET_IP` | Proxied (orange cloud) |
| CNAME | `www` | `docuforge.pages.dev` | Proxied |
| CNAME | `console` | `docuforge.pages.dev` | Proxied |
| CNAME | `@` | `www.docuforge.app` | Proxied |

The `@` → `www` redirect ensures `docuforge.app` redirects to `www.docuforge.app`.

**Important:** The API **must** be proxied (orange cloud) for Cloudflare's compression and cache rules to work. Since traffic goes through CF, you use a **Cloudflare Origin Certificate** for SSL between CF and your droplet (not Let's Encrypt).

---

## Cloudflare R2 Setup (Signed URLs)

The asset system uses **private R2 bucket + AWS SDK presigned URLs**. No public domain needed on the bucket — the API generates short-lived signed URLs for uploads and downloads.

### Step 1: Create R2 Bucket

1. Cloudflare Dashboard → R2 Object Storage → **Create bucket**
2. Bucket name: `docuforge-assets`
3. Location: Auto (or choose region closest to your droplet)
4. **Do NOT enable public access** — the bucket stays private

### Step 2: Create R2 API Token

1. Cloudflare Dashboard → R2 → **Manage R2 API Tokens**
2. Click **Create API Token**
3. Permissions: **Object Read & Write**
4. Specify bucket: `docuforge-assets`
5. TTL: No expiry (or set a long TTL)
6. Click **Create API Token**
7. **Save these values** (shown only once):
   - **Access Key ID** → `R2_ACCESS_KEY_ID`
   - **Secret Access Key** → `R2_SECRET_ACCESS_KEY`

### Step 3: Get Your Account ID

1. Cloudflare Dashboard → any domain → right sidebar → **Account ID**
2. Or: R2 overview page shows it in the S3 API endpoint

Your R2 endpoint is: `https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com`

### Step 4: Configure API Environment

Add to `api/.env`:

```bash
R2_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_access_key_id_from_step_2
R2_SECRET_ACCESS_KEY=your_secret_access_key_from_step_2
R2_BUCKET=docuforge-assets
R2_PUBLIC_URL=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
```

`R2_PUBLIC_URL` is used as a fallback reference only. All actual access goes through presigned URLs generated by the API using `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`.

### How Signed URLs Work

```
Upload flow:
  Frontend → POST /v1/assets/upload-url → API generates PutObject presigned URL (10 min)
  Frontend → PUT directly to R2 signed URL (bypasses API)
  Frontend → POST /v1/assets (confirm) → API verifies via HeadObject, saves to DB

Download/Render flow:
  API → resolveUserAssets() → generates GetObject presigned URLs (5 min each)
  Engine → fetches assets via signed URLs during render
```

The API uses the AWS SDK S3-compatible client:

```typescript
// Already implemented in api/src/services/asset.ts
const client = new S3Client({
  region: 'auto',
  endpoint: env.R2_ENDPOINT,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});
```

### Verify R2 Works

After deploying the API, test with:

```bash
# Request upload URL
curl -X POST https://api.docuforge.app/v1/assets/upload-url \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"filename":"test.png","content_type":"image/png"}'

# Response includes:
# { "upload_url": "https://ACCOUNT.r2.cloudflarestorage.com/docuforge-assets/...?X-Amz-Signature=..." }
```

### R2 CORS Configuration

If the frontend uploads directly to R2 (browser → R2), configure CORS on the bucket:

1. Cloudflare Dashboard → R2 → `docuforge-assets` → **Settings**
2. Add CORS policy:

```json
[
  {
    "AllowedOrigins": ["https://console.docuforge.app"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

This allows the browser to PUT files directly to R2 using the presigned URL.

---

## Droplet Setup

### Step 1: Provision

- **Size:** Basic ($24/mo) — 2 vCPUs, 4GB RAM, 80GB SSD
- **OS:** Ubuntu 22.04 LTS
- **Region:** Closest to target users
- Enable monitoring (free)

### Step 2: Initial Setup

```bash
ssh root@YOUR_DROPLET_IP

# Update system
apt update && apt upgrade -y

# Install dependencies
apt install -y curl git build-essential nginx

# Install Bun
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source ~/.cargo/env

# Create app user
useradd -m -s /bin/bash docuforge
mkdir -p /var/www/docuforge /var/lib/docuforge/db /var/backups/docuforge
chown -R docuforge:docuforge /var/www/docuforge /var/lib/docuforge /var/backups/docuforge
```

### Step 3: Firewall

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh

# Allow HTTP/HTTPS from Cloudflare IPs only
curl -s https://www.cloudflare.com/ips-v4 | while read ip; do
  ufw allow from $ip to any port 443 proto tcp
  ufw allow from $ip to any port 80 proto tcp
done

ufw enable
```

### Step 4: SSL with Cloudflare Origin Certificate

Since Cloudflare proxies all traffic, use a **Cloudflare Origin Certificate** (free, 15-year validity) instead of Let's Encrypt:

1. Cloudflare Dashboard → SSL/TLS → **Origin Server**
2. Click **Create Certificate**
3. Hostnames: `*.docuforge.app, docuforge.app`
4. Validity: 15 years
5. Key format: PEM
6. Copy the **Origin Certificate** and **Private Key**

Install on droplet:

```bash
# Save certificate
mkdir -p /etc/ssl/cloudflare
nano /etc/ssl/cloudflare/origin.pem     # paste Origin Certificate
nano /etc/ssl/cloudflare/origin-key.pem  # paste Private Key
chmod 600 /etc/ssl/cloudflare/origin-key.pem
```

Set SSL mode in Cloudflare:
- **SSL/TLS → Overview → Full (strict)**

### Step 5: Nginx Configuration

```bash
nano /etc/nginx/sites-available/docuforge
```

```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;

upstream docuforge_api {
    server 127.0.0.1:3000 fail_timeout=5s max_fails=3;
    keepalive 32;
}

server {
    listen 80;
    server_name api.docuforge.app;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.docuforge.app;

    ssl_certificate /etc/ssl/cloudflare/origin.pem;
    ssl_certificate_key /etc/ssl/cloudflare/origin-key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Cloudflare real IP
    set_real_ip_from 173.245.48.0/20;
    set_real_ip_from 103.21.244.0/22;
    set_real_ip_from 103.22.200.0/22;
    set_real_ip_from 103.31.4.0/22;
    set_real_ip_from 141.101.64.0/18;
    set_real_ip_from 108.162.192.0/18;
    set_real_ip_from 190.93.240.0/20;
    set_real_ip_from 188.114.96.0/20;
    set_real_ip_from 197.234.240.0/22;
    set_real_ip_from 198.41.128.0/17;
    set_real_ip_from 162.158.0.0/15;
    set_real_ip_from 104.16.0.0/13;
    set_real_ip_from 104.24.0.0/14;
    set_real_ip_from 172.64.0.0/13;
    set_real_ip_from 131.0.72.0/22;
    real_ip_header CF-Connecting-IP;

    access_log /var/log/nginx/docuforge-access.log;
    error_log /var/log/nginx/docuforge-error.log warn;

    # Default: rate limited proxy
    location / {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://docuforge_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_connect_timeout 5s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        proxy_buffering off;
        proxy_request_buffering off;
    }

    # Health check (no rate limit, no access log)
    location /health {
        limit_req off;
        proxy_pass http://docuforge_api;
        access_log off;
    }

    # Stripe webhook (no rate limit)
    location /v1/billing/webhook {
        limit_req off;
        proxy_pass http://docuforge_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable:

```bash
ln -s /etc/nginx/sites-available/docuforge /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
```

---

## Deploy Backend

### Step 1: Clone & Build

```bash
su - docuforge
cd /var/www/docuforge
git clone https://github.com/YOUR_ORG/docuforge.git .

# API
cd api
bun install --frozen-lockfile --production

# Engine
cd ../engine
make fonts
cargo build --release
```

### Step 2: Environment Files

**API** (`/var/www/docuforge/api/.env`):

```bash
NODE_ENV=production
PORT=3000
APP_URL=https://console.docuforge.app
API_URL=https://api.docuforge.app

DATABASE_URL=file:/var/lib/docuforge/db/docuforge.db

ENGINE_URL=http://127.0.0.1:3001
ENGINE_TIMEOUT_MS=5000

# Generate with: openssl rand -base64 48
JWT_SECRET=PASTE_YOUR_GENERATED_SECRET_HERE
JWT_EXPIRY=7d

# R2 (from R2 setup above)
R2_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_key
R2_SECRET_ACCESS_KEY=your_secret
R2_BUCKET=docuforge-assets
R2_PUBLIC_URL=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...

# Gemini AI
GEMINI_API_KEY=your_gemini_key
AI_MODEL=gemini-2.5-flash
AI_ENABLED=true

# RAG (loads Typst docs into memory for smarter AI)
RAG_ENABLED=true
RAG_TOP_K=5

# OAuth (optional — set up later)
# OAUTH_GOOGLE_CLIENT_ID=
# OAUTH_GOOGLE_CLIENT_SECRET=
# OAUTH_GITHUB_CLIENT_ID=
# OAUTH_GITHUB_CLIENT_SECRET=

# Sentry (optional)
# SENTRY_DSN=https://...@sentry.io/...
# SENTRY_ENVIRONMENT=production

# Limits
FREE_MONTHLY_LIMIT=500
STARTER_MONTHLY_LIMIT=10000
PRO_MONTHLY_LIMIT=50000
MAX_UPLOAD_SIZE_MB=10
WEBHOOK_MAX_PER_USER=10
```

**Engine** (`/var/www/docuforge/engine/.env`):

```bash
HOST=127.0.0.1
PORT=3001
MAX_BODY_SIZE_MB=50
RENDER_TIMEOUT_MS=5000
ASSET_CACHE_SIZE_MB=100
LOG_LEVEL=info
LOG_FORMAT=json
# SENTRY_DSN=https://...@sentry.io/...
```

### Step 3: systemd Services

**Engine** (`/etc/systemd/system/docuforge-engine.service`):

```ini
[Unit]
Description=DocuForge Engine (Rust/Typst)
After=network.target

[Service]
Type=simple
User=docuforge
Group=docuforge
WorkingDirectory=/var/www/docuforge/engine
EnvironmentFile=/var/www/docuforge/engine/.env
ExecStart=/var/www/docuforge/engine/target/release/docuforge-engine
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/docuforge

[Install]
WantedBy=multi-user.target
```

**API** (`/etc/systemd/system/docuforge-api.service`):

```ini
[Unit]
Description=DocuForge API (Bun/Hono)
After=network.target docuforge-engine.service
Requires=docuforge-engine.service

[Service]
Type=simple
User=docuforge
Group=docuforge
WorkingDirectory=/var/www/docuforge/api
EnvironmentFile=/var/www/docuforge/api/.env
ExecStart=/home/docuforge/.bun/bin/bun run src/index.ts
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/var/lib/docuforge

[Install]
WantedBy=multi-user.target
```

Start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable docuforge-engine docuforge-api
sudo systemctl start docuforge-engine
sleep 5
sudo systemctl start docuforge-api
```

### Step 4: Verify

```bash
# Engine (internal)
curl http://127.0.0.1:3001/health

# API (internal)
curl http://127.0.0.1:3000/health

# API (via nginx + cloudflare)
curl https://api.docuforge.app/health
```

Expected:

```json
{"status":"ok","engine":"healthy","version":"1.0.0","uptime":12}
```

---

## Deploy Frontend

### Cloudflare Pages Setup

1. Cloudflare Dashboard → **Pages** → Create project
2. Connect your Git repository
3. Configure build:
   - **Build command:** `bun run build`
   - **Build output directory:** `.next`
   - **Root directory:** `frontend`
4. Environment variables:
   ```
   NEXT_PUBLIC_API_URL=https://api.docuforge.app
   NEXT_PUBLIC_APP_URL=https://console.docuforge.app
   ```
5. Deploy

### Custom Domains

After first deploy, add custom domains:

1. Pages → your project → **Custom domains**
2. Add `console.docuforge.app` (main app)
3. Add `www.docuforge.app` (marketing — same deploy, different cache rules)

### Cloudflare Cache Rules

Already documented in `docs/caching-compression-strategy.md`. Create these 7 rules:

1. **API bypass** — `api.docuforge.app` → bypass cache
2. **API health** — `api.docuforge.app` + `/health` → cache 10s
3. **www HTML** — `www.docuforge.app` (not `/_next/*`) → edge cache 7 days
4. **www static** — `www.docuforge.app` + `/_next/static/*` → cache 1 year
5. **www OG** — `www.docuforge.app` + `/og/*` → cache 1 hour
6. **console HTML** — `console.docuforge.app` (not `/_next/*`) → bypass cache
7. **console static** — `console.docuforge.app` + `/_next/static/*` → cache 1 year

Also in **Caching → Configuration**:
- Browser Cache TTL: **Respect Existing Headers**
- Enable **Smart Tiered Cache**

And in **Speed → Optimization**:
- Verify **Brotli** is enabled

---

## Post-Deploy Configuration

### Stripe Webhooks

1. Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://api.docuforge.app/v1/billing/webhook`
3. Events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy signing secret → `STRIPE_WEBHOOK_SECRET` in API `.env`
5. `sudo systemctl restart docuforge-api`

### OAuth Redirect URIs

Set callback URLs in each provider's dashboard:

- **Google:** `https://api.docuforge.app/v1/auth/oauth/google/callback`
- **Microsoft:** `https://api.docuforge.app/v1/auth/oauth/microsoft/callback`
- **GitHub:** `https://api.docuforge.app/v1/auth/oauth/github/callback`

### Sentry (Optional)

1. Create Sentry projects: `docuforge-api`, `docuforge-engine`, `docuforge-frontend`
2. Copy DSNs to respective `.env` files
3. Restart services

### Automated Backups

```bash
# /usr/local/bin/backup-docuforge.sh
#!/bin/bash
BACKUP_DIR="/var/backups/docuforge"
DATE=$(date +%Y%m%d_%H%M%S)
cp /var/lib/docuforge/db/docuforge.db "$BACKUP_DIR/db_$DATE.db"
find "$BACKUP_DIR" -name "db_*.db" -mtime +30 -delete
```

```bash
chmod +x /usr/local/bin/backup-docuforge.sh
crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-docuforge.sh
```

### Uptime Monitoring

Set up Uptime Robot (free) to monitor `https://api.docuforge.app/health` every 5 minutes.

---

## Environment Variables Reference

### API — All Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | `production` in prod |
| `PORT` | No | `3000` | API port |
| `APP_URL` | No | `http://localhost:5173` | Frontend URL (for CORS, redirects) |
| `API_URL` | No | `http://localhost:3000` | API public URL |
| `DATABASE_URL` | **Yes** | — | SQLite path or Turso URL |
| `DATABASE_AUTH_TOKEN` | No | — | Turso auth token (if using Turso) |
| `ENGINE_URL` | No | `http://127.0.0.1:3001` | Rust engine URL |
| `ENGINE_TIMEOUT_MS` | No | `5000` | Render timeout |
| `JWT_SECRET` | **Yes** | — | Min 32 chars. `openssl rand -base64 48` |
| `JWT_EXPIRY` | No | `7d` | Token lifetime |
| `R2_ENDPOINT` | **Yes** | — | `https://ACCT.r2.cloudflarestorage.com` |
| `R2_ACCESS_KEY_ID` | **Yes** | — | R2 API token access key |
| `R2_SECRET_ACCESS_KEY` | **Yes** | — | R2 API token secret |
| `R2_BUCKET` | **Yes** | — | `docuforge-assets` |
| `R2_PUBLIC_URL` | **Yes** | — | Same as R2_ENDPOINT (private bucket) |
| `STRIPE_SECRET_KEY` | **Yes** | — | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | **Yes** | — | Stripe webhook signing secret |
| `STRIPE_STARTER_PRICE_ID` | **Yes** | — | Stripe price ID |
| `STRIPE_PRO_PRICE_ID` | **Yes** | — | Stripe price ID |
| `GEMINI_API_KEY` | **Yes** | — | Google AI API key |
| `AI_MODEL` | No | `gemini-2.5-flash` | Gemini model |
| `AI_ENABLED` | No | `true` | Toggle AI on/off |
| `RAG_ENABLED` | No | `true` | Toggle RAG vector store |
| `RAG_TOP_K` | No | `5` | Number of doc chunks to inject |
| `RAG_EMBEDDING_MODEL` | No | `text-embedding-004` | Embedding model |
| `SENTRY_DSN` | No | — | Sentry DSN (opt-in) |
| `SENTRY_ENVIRONMENT` | No | — | Environment tag |
| `SENTRY_TRACES_SAMPLE_RATE` | No | `0.1` | Trace sampling |
| `OAUTH_GOOGLE_CLIENT_ID` | No | — | Google OAuth |
| `OAUTH_GOOGLE_CLIENT_SECRET` | No | — | Google OAuth |
| `OAUTH_MICROSOFT_CLIENT_ID` | No | — | Microsoft OAuth |
| `OAUTH_MICROSOFT_CLIENT_SECRET` | No | — | Microsoft OAuth |
| `OAUTH_GITHUB_CLIENT_ID` | No | — | GitHub OAuth |
| `OAUTH_GITHUB_CLIENT_SECRET` | No | — | GitHub OAuth |
| `FREE_MONTHLY_LIMIT` | No | `500` | Free tier renders/month |
| `STARTER_MONTHLY_LIMIT` | No | `10000` | Starter tier |
| `PRO_MONTHLY_LIMIT` | No | `50000` | Pro tier |
| `MAX_UPLOAD_SIZE_MB` | No | `10` | Asset upload limit |
| `WEBHOOK_TIMEOUT_MS` | No | `5000` | Webhook delivery timeout |
| `WEBHOOK_MAX_PER_USER` | No | `10` | Max webhooks per user |

### Engine — All Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `HOST` | No | `127.0.0.1` | Bind address |
| `PORT` | No | `3001` | Engine port |
| `FONT_DIR` | No | `./assets/fonts` | Font directory |
| `RENDER_TIMEOUT_MS` | No | `5000` | Typst compilation timeout |
| `MAX_BODY_SIZE_MB` | No | `50` | Max request body |
| `ASSET_CACHE_SIZE_MB` | No | `100` | LRU cache for fetched assets |
| `LOG_LEVEL` | No | `info` | Tracing level |
| `LOG_FORMAT` | No | `pretty` | `json` for production |
| `SENTRY_DSN` | No | — | Sentry DSN (opt-in) |

### Frontend — CF Pages Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | **Yes** | `https://api.docuforge.app` |
| `NEXT_PUBLIC_APP_URL` | **Yes** | `https://console.docuforge.app` |
| `SENTRY_DSN` | No | Frontend Sentry DSN |
| `SENTRY_ENVIRONMENT` | No | `production` |

---

## QA Checklist

### Smoke Tests (do these first, 15 min)

```bash
# 1. Health check
curl https://api.docuforge.app/health
# → {"status":"ok","engine":"healthy",...}

# 2. Register
curl -X POST https://api.docuforge.app/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123456"}'
# → {"user":{...},"token":"...","api_key":{...}}

# 3. Render with API key
curl -X POST https://api.docuforge.app/v1/render \
  -H "X-API-Key: dfk_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"template_id":"...","data":{}}' \
  --output test.pdf

# 4. Upload asset
curl -X POST https://api.docuforge.app/v1/assets/upload-url \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"filename":"test.png","content_type":"image/png"}'
# → {"upload_url":"https://...r2.cloudflarestorage.com/...?X-Amz-Signature=..."}
```

### Full QA (do before going public)

- [ ] Register + login (email/password)
- [ ] OAuth login (Google/GitHub/Microsoft)
- [ ] Create template in editor
- [ ] Render PDF + download
- [ ] Render with data (sys.inputs)
- [ ] Upload asset + use in template (`#image("logo.png")`)
- [ ] Publish template (create version)
- [ ] Version history + restore
- [ ] API key create/revoke
- [ ] Rate limiting (send 15+ requests quickly → 429)
- [ ] Stripe checkout (test card: `4242 4242 4242 4242`)
- [ ] Plan upgrade/downgrade
- [ ] AI generate from prompt
- [ ] AI generate from image
- [ ] AI toggle off (`AI_ENABLED=false`) → 503
- [ ] Compilation error → shows relevant docs + suggestion (RAG)
- [ ] Webhook create → render → delivery logged
- [ ] Invalid Typst syntax → error with line number
- [ ] CORS blocked from unauthorized origin
- [ ] Presigned URL expires after 5 min (assets) / 10 min (uploads)

---

## Rollback Plan

### API/Engine (10 min)

```bash
cd /var/www/docuforge
git log --oneline -10
git checkout PREVIOUS_COMMIT
cd api && bun install
cd ../engine && cargo build --release
sudo systemctl restart docuforge-engine docuforge-api
```

### Frontend (2 min)

Cloudflare Pages → your project → Deployments → previous deploy → **Rollback**

### Database (5 min)

```bash
sudo systemctl stop docuforge-api
cp /var/backups/docuforge/db_YYYYMMDD_HHMMSS.db /var/lib/docuforge/db/docuforge.db
sudo systemctl start docuforge-api
```

---

## Troubleshooting

**502 Bad Gateway** → Engine not running
```bash
sudo systemctl status docuforge-engine
sudo systemctl restart docuforge-engine docuforge-api
```

**Render timeout** → Increase timeout
```bash
# In api/.env
ENGINE_TIMEOUT_MS=10000
sudo systemctl restart docuforge-api
```

**R2 access denied** → Check credentials
```bash
# Verify endpoint format (no trailing slash)
R2_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
# Verify token has Object Read & Write on the correct bucket
```

**CORS error on asset upload** → Add R2 CORS rule (see R2 setup above)

**OAuth callback fails** → Redirect URI mismatch in provider dashboard

**Stripe webhooks not received** → Verify `STRIPE_WEBHOOK_SECRET` matches, endpoint URL is correct

**RAG not loading** → Check `GEMINI_API_KEY` is valid, look for "RAG vector store initialization failed" in logs
```bash
journalctl -u docuforge-api | grep -i rag
```

**Logs:**
```bash
journalctl -u docuforge-api -f     # API logs
journalctl -u docuforge-engine -f  # Engine logs
```
