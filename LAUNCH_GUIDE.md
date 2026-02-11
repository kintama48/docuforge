# DocuForge Production Launch Guide

**Last Updated:** 2026-02-08
**Target Architecture:** DigitalOcean Droplet (Engine + API) + Cloudflare Pages (Frontend) + Cloudflare R2 (Assets)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Status](#current-status)
3. [Architecture Overview](#architecture-overview)
4. [Pre-Launch Blockers](#pre-launch-blockers)
5. [Environment Variables Reference](#environment-variables-reference)
6. [Deployment Steps](#deployment-steps)
7. [Manual QA Checklist](#manual-qa-checklist)
8. [Security Hardening](#security-hardening)
9. [Monitoring & Observability](#monitoring--observability)
10. [Rollback Plan](#rollback-plan)

---

## Executive Summary

### Launch Readiness: 85/100 ✅

**Status:** Ready for production launch with minor fixes required.

**Critical Issues Resolved:** 33/33 security and code quality issues from the SQA audit have been fixed (see `AUDIT_ISSUES.md`).

**Remaining Blockers:**
1. **CRITICAL:** Fix hardcoded ENGINE_URL fallbacks in API (15 min fix)
2. **HIGH:** Generate production environment variables
3. **MEDIUM:** Configure Nginx reverse proxy
4. **MEDIUM:** Set up Cloudflare IP whitelisting
5. **LOW:** Fix frontend JSX-in-TS build issue (optional, workaround available)

**Timeline to Launch:** 4-6 hours for deployment + testing

---

## Current Status

### ✅ What's Working
- All 33 audit issues resolved with regression tests (API: 12, Frontend: 12, Engine: 9)
- Security hardened (CORS, JWT, OAuth, rate limiting)
- Database auto-migration on startup
- Health checks on all services
- Sentry integration (optional, opt-in)
- Stripe billing integration complete
- Gemini AI integration complete
- R2/S3 asset storage ready
- Docker builds tested
- Test coverage: API >85%, Frontend >80%, Engine >90%

### ⚠️ Known Limitations
- **Single-instance only**: Rate limiting and OAuth state stored in-memory
  - **Impact:** Works perfectly for your architecture (single droplet)
  - **Future:** Migrate to Redis when scaling to multiple instances
- **Frontend build warning**: JSX in `.ts` files under `src/app/og/` (pre-existing)
  - **Workaround:** Build succeeds if those files aren't imported; can rename to `.tsx` if needed

### 🔧 Required Fixes Before Launch
1. Remove hardcoded `ENGINE_URL` fallbacks in `api/src/routes/health.ts` and `api/src/services/engine.ts`
2. Configure production environment variables for all three services
3. Set up Nginx configuration for reverse proxy
4. Configure Cloudflare IP whitelist on droplet firewall

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          USER BROWSER                            │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ HTTPS
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE CDN/WAF                            │
│  ┌────────────────┐              ┌─────────────────────────┐    │
│  │ Pages/Workers  │              │      R2 Bucket          │    │
│  │  (Frontend)    │              │ assets.docuforge.tech   │    │
│  └────────────────┘              └─────────────────────────┘    │
└──────────┬──────────────────────────────────────────────────────┘
           │ API calls only from CF IPs
           │ HTTPS
           ▼
┌─────────────────────────────────────────────────────────────────┐
│              DIGITALOCEAN DROPLET (Ubuntu 22.04+)                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                         NGINX                             │   │
│  │          (Reverse Proxy + SSL Termination)               │   │
│  └───────────────────┬──────────────────────────────────────┘   │
│                      │ localhost:3000                            │
│  ┌───────────────────▼──────────────────────────────────────┐   │
│  │                    API (Bun + Hono)                       │   │
│  │                   Port 3000 (internal)                    │   │
│  └───────────────────┬──────────────────────────────────────┘   │
│                      │ localhost:3001                            │
│  ┌───────────────────▼──────────────────────────────────────┐   │
│  │              ENGINE (Rust + Typst)                        │   │
│  │              Port 3001 (internal only)                    │   │
│  │              !! NEVER EXPOSED !!                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  SQLite Database                          │   │
│  │              /var/lib/docuforge/db/                       │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Principles
1. **Engine isolation**: Never exposed to internet, localhost-only communication
2. **CF IP whitelist**: Droplet only accepts HTTPS from Cloudflare IPs
3. **Assets on R2**: All user uploads/assets served from `assets.docuforge.tech`
4. **Frontend on CF Pages**: Fast, global CDN distribution
5. **API on droplet**: Direct access to engine, database, and Stripe webhooks

---

## Pre-Launch Blockers

### 🔴 CRITICAL: Fix Hardcoded ENGINE_URL Fallbacks

**Issue:** Three files have `process.env.ENGINE_URL || 'http://127.0.0.1:3001'` which bypasses env validation.

**Impact:** If `ENGINE_URL` isn't set, falls back to localhost (correct for your architecture, but bypasses startup validation).

**Fix Required:**

**File 1:** `api/src/routes/health.ts:8`
```typescript
// BEFORE
const engineUrl = process.env.ENGINE_URL || 'http://127.0.0.1:3001';

// AFTER
const engineUrl = env.ENGINE_URL;
```

**File 2:** `api/src/services/engine.ts:14`
```typescript
// BEFORE
const ENGINE_URL = process.env.ENGINE_URL || 'http://127.0.0.1:3001';

// AFTER
const ENGINE_URL = env.ENGINE_URL;
```

**File 3:** `api/src/services/engine.ts:79` (same fix as File 2)

**Time to fix:** 5 minutes

---

### 🟡 HIGH: Generate Production Environment Variables

All three services need production-ready environment variables. See [Environment Variables Reference](#environment-variables-reference) below.

---

### 🟡 MEDIUM: Configure Nginx Reverse Proxy

See [Nginx Configuration](#step-3-configure-nginx-reverse-proxy) in deployment steps.

---

### 🟡 MEDIUM: Cloudflare IP Whitelisting

See [Firewall Configuration](#step-2-configure-firewall-cloudflare-ips-only) in deployment steps.

---

### 🟢 LOW: Frontend JSX-in-TS Issue (Optional)

**Issue:** `next build` may fail if JSX exists in `.ts` files under `src/app/og/`.

**Workaround:** If those files aren't imported, build succeeds. Otherwise rename to `.tsx`.

**Not blocking:** Can deploy frontend without fixing this if it doesn't affect your build.

---

## Environment Variables Reference

### Production Domain Setup

For this guide, assuming:
- **API Domain:** `api.docuforge.tech`
- **Frontend Domain:** `docuforge.tech` or `app.docuforge.tech`
- **Assets Domain:** `assets.docuforge.tech` (R2 custom domain)

Adjust these to your actual domains.

---

### API Environment Variables

**File:** `/var/www/docuforge/api/.env`

```bash
# ============================================
# SERVER CONFIGURATION
# ============================================
NODE_ENV=production
PORT=3000
APP_URL=https://docuforge.tech
API_URL=https://api.docuforge.tech

# ============================================
# DATABASE (Turso or Local SQLite)
# ============================================
# Option 1: Local SQLite (simple, single-server)
DATABASE_URL=file:/var/lib/docuforge/db/docuforge.db

# Option 2: Turso (managed, replicated)
# DATABASE_URL=libsql://your-db-name.turso.io
# DATABASE_AUTH_TOKEN=your-turso-auth-token

# ============================================
# RUST ENGINE (localhost only)
# ============================================
ENGINE_URL=http://127.0.0.1:3001
ENGINE_TIMEOUT_MS=5000

# ============================================
# CLOUDFLARE R2 (Asset Storage)
# ============================================
R2_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=YOUR_R2_ACCESS_KEY
R2_SECRET_ACCESS_KEY=YOUR_R2_SECRET_KEY
R2_BUCKET=docuforge-assets
R2_PUBLIC_URL=https://assets.docuforge.tech

# ============================================
# STRIPE (Billing)
# ============================================
STRIPE_SECRET_KEY=sk_live_YOUR_SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
STRIPE_STARTER_PRICE_ID=price_YOUR_STARTER_PRICE
STRIPE_PRO_PRICE_ID=price_YOUR_PRO_PRICE

# ============================================
# GOOGLE GEMINI (AI Features)
# ============================================
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
AI_MODEL=gemini-2.5-flash

# ============================================
# AUTHENTICATION
# ============================================
# CRITICAL: Generate a secure 32+ character secret
# Command: openssl rand -base64 48
JWT_SECRET=YOUR_SECURE_256_BIT_SECRET_CHANGE_THIS
JWT_EXPIRY=7d

# ============================================
# OAUTH PROVIDERS (Optional)
# ============================================
OAUTH_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
OAUTH_GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET

OAUTH_MICROSOFT_CLIENT_ID=YOUR_MICROSOFT_CLIENT_ID
OAUTH_MICROSOFT_CLIENT_SECRET=YOUR_MICROSOFT_CLIENT_SECRET

OAUTH_GITHUB_CLIENT_ID=YOUR_GITHUB_CLIENT_ID
OAUTH_GITHUB_CLIENT_SECRET=YOUR_GITHUB_CLIENT_SECRET

# ============================================
# USAGE LIMITS
# ============================================
FREE_MONTHLY_LIMIT=500
STARTER_MONTHLY_LIMIT=10000
PRO_MONTHLY_LIMIT=50000
MAX_UPLOAD_SIZE_MB=10

# ============================================
# SENTRY (Error Tracking - Optional but Recommended)
# ============================================
SENTRY_DSN=https://YOUR_KEY@o123456.ingest.sentry.io/YOUR_PROJECT
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
```

---

### Engine Environment Variables

**File:** `/var/www/docuforge/engine/.env`

```bash
# ============================================
# SERVER CONFIGURATION
# ============================================
HOST=127.0.0.1
PORT=3001

# ============================================
# RENDERING LIMITS
# ============================================
MAX_BODY_SIZE_MB=50
RENDER_TIMEOUT_MS=5000
CACHE_SIZE_MB=1024

# ============================================
# LOGGING
# ============================================
RUST_LOG=info
LOG_FORMAT=json

# ============================================
# SENTRY (Optional - must match API Sentry project)
# ============================================
SENTRY_DSN=https://YOUR_KEY@o123456.ingest.sentry.io/YOUR_PROJECT
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
```

---

### Frontend Environment Variables

**Cloudflare Pages Environment Variables** (set in CF dashboard):

```bash
# ============================================
# PUBLIC VARIABLES (exposed to browser)
# ============================================
NEXT_PUBLIC_API_URL=https://api.docuforge.tech
NEXT_PUBLIC_APP_URL=https://docuforge.tech

# ============================================
# SENTRY (Optional)
# ============================================
SENTRY_DSN=https://YOUR_KEY@o123456.ingest.sentry.io/YOUR_FRONTEND_PROJECT
SENTRY_ENVIRONMENT=production
```

**Build Commands for Cloudflare Pages:**
- **Build command:** `bun run build`
- **Build output directory:** `.next`
- **Root directory:** `frontend`
- **Node version:** 20.x

---

## Deployment Steps

### Phase 1: Pre-Deployment Setup

#### Step 1: Provision DigitalOcean Droplet

**Recommended Specs:**
- **Size:** Basic Droplet (2 vCPUs, 4GB RAM, 80GB SSD) - $24/month
- **OS:** Ubuntu 22.04 LTS x64
- **Region:** Closest to your target users
- **Add-ons:**
  - ✅ Monitoring (free)
  - ❌ Backups ($4.80/month) - optional but recommended

**SSH Access:**
```bash
ssh root@YOUR_DROPLET_IP
```

**Initial Setup:**
```bash
# Update system
apt update && apt upgrade -y

# Install dependencies
apt install -y curl git build-essential nginx certbot python3-certbot-nginx

# Install Bun
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source ~/.cargo/env

# Create application user
useradd -m -s /bin/bash docuforge
mkdir -p /var/www/docuforge /var/lib/docuforge/db
chown -R docuforge:docuforge /var/www/docuforge /var/lib/docuforge
```

---

#### Step 2: Configure Firewall (Cloudflare IPs Only)

**Install UFW:**
```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
```

**Whitelist Cloudflare IPs Only:**
```bash
# Download Cloudflare IP ranges
curl https://www.cloudflare.com/ips-v4 -o /tmp/cf-ips-v4.txt
curl https://www.cloudflare.com/ips-v6 -o /tmp/cf-ips-v6.txt

# Allow HTTPS only from Cloudflare IPs
while read ip; do ufw allow from $ip to any port 443 proto tcp; done < /tmp/cf-ips-v4.txt
while read ip; do ufw allow from $ip to any port 443 proto tcp; done < /tmp/cf-ips-v6.txt

# Allow HTTP for Let's Encrypt challenges (temporary)
ufw allow 80/tcp

# Enable firewall
ufw enable
```

**Verify:**
```bash
ufw status numbered
```

---

#### Step 3: Configure Nginx Reverse Proxy

**Create Nginx config:**
```bash
nano /etc/nginx/sites-available/docuforge
```

**Nginx Configuration:**
```nginx
# Rate limiting zone
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;

# Upstream API server
upstream docuforge_api {
    server 127.0.0.1:3000 fail_timeout=5s max_fails=3;
    keepalive 32;
}

server {
    listen 80;
    server_name api.docuforge.tech;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirect to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name api.docuforge.tech;

    # SSL certificates (set up via certbot later)
    ssl_certificate /etc/letsencrypt/live/api.docuforge.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.docuforge.tech/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
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

    # Logging
    access_log /var/log/nginx/docuforge-access.log;
    error_log /var/log/nginx/docuforge-error.log warn;

    # Proxy settings
    location / {
        limit_req zone=api_limit burst=20 nodelay;

        proxy_pass http://docuforge_api;
        proxy_http_version 1.1;

        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";

        # Timeouts
        proxy_connect_timeout 5s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffering
        proxy_buffering off;
        proxy_request_buffering off;
    }

    # Health check (bypass rate limit)
    location /health {
        limit_req off;
        proxy_pass http://docuforge_api;
        access_log off;
    }

    # Stripe webhooks (bypass rate limit)
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

**Enable site:**
```bash
ln -s /etc/nginx/sites-available/docuforge /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

---

#### Step 4: Set Up SSL with Let's Encrypt

**Before running certbot, ensure:**
1. DNS A record for `api.docuforge.tech` points to droplet IP
2. Nginx is running with HTTP (port 80) enabled

```bash
# Run certbot
certbot --nginx -d api.docuforge.tech

# Auto-renewal
certbot renew --dry-run
```

---

### Phase 2: Deploy Application

#### Step 5: Clone Repository

```bash
su - docuforge
cd /var/www/docuforge
git clone https://github.com/YOUR_ORG/docuforge.git .

# Or use rsync if not using git
# rsync -avz --exclude node_modules --exclude target /local/path/ docuforge@droplet:/var/www/docuforge/
```

---

#### Step 6: Fix ENGINE_URL Hardcoded Fallbacks

**Apply fixes from [Pre-Launch Blockers](#pre-launch-blockers) section.**

```bash
cd /var/www/docuforge/api

# Edit files
nano src/routes/health.ts
nano src/services/engine.ts

# Replace all instances of:
#   process.env.ENGINE_URL || 'http://127.0.0.1:3001'
# With:
#   env.ENGINE_URL
```

---

#### Step 7: Configure Environment Variables

**API:**
```bash
cd /var/www/docuforge/api
cp .env.example .env
nano .env
# Fill in all production values from [API Environment Variables](#api-environment-variables)
```

**Engine:**
```bash
cd /var/www/docuforge/engine
nano .env
# Fill in values from [Engine Environment Variables](#engine-environment-variables)
```

**Generate secure JWT secret:**
```bash
openssl rand -base64 48
# Copy output to JWT_SECRET in api/.env
```

---

#### Step 8: Install Dependencies

**API:**
```bash
cd /var/www/docuforge/api
bun install --frozen-lockfile --production
```

**Engine:**
```bash
cd /var/www/docuforge/engine

# Download fonts (required for Typst)
make fonts

# Build release binary
cargo build --release
```

**Verify builds:**
```bash
# API
cd /var/www/docuforge/api
bun run src/index.ts --help

# Engine
cd /var/www/docuforge/engine
./target/release/docuforge-engine --version
```

---

#### Step 9: Set Up systemd Services

**Engine Service:**
```bash
sudo nano /etc/systemd/system/docuforge-engine.service
```

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

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/docuforge

[Install]
WantedBy=multi-user.target
```

**API Service:**
```bash
sudo nano /etc/systemd/system/docuforge-api.service
```

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

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/var/lib/docuforge

[Install]
WantedBy=multi-user.target
```

**Enable and start services:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable docuforge-engine docuforge-api
sudo systemctl start docuforge-engine
sleep 5
sudo systemctl start docuforge-api
```

**Check status:**
```bash
sudo systemctl status docuforge-engine
sudo systemctl status docuforge-api
journalctl -u docuforge-engine -f
journalctl -u docuforge-api -f
```

---

#### Step 10: Verify Backend Health

```bash
# Test engine (internal)
curl http://127.0.0.1:3001/health

# Test API (internal)
curl http://127.0.0.1:3000/health

# Test API (via Nginx)
curl https://api.docuforge.tech/health
```

**Expected response:**
```json
{
  "status": "ok",
  "version": "0.1.0",
  "uptime": 123,
  "engine": {
    "status": "ok",
    "latency_ms": 2
  }
}
```

---

### Phase 3: Deploy Frontend

#### Step 11: Configure Cloudflare R2

**Create R2 Bucket:**
1. Log in to Cloudflare Dashboard
2. Go to R2 Object Storage
3. Create bucket: `docuforge-assets`
4. Create API Token:
   - Permissions: Object Read & Write
   - Copy `Access Key ID` and `Secret Access Key`
5. Set up custom domain:
   - Add `assets.docuforge.tech` as custom domain
   - Configure DNS CNAME: `assets.docuforge.tech` → `docuforge-assets.YOUR_ACCOUNT_ID.r2.cloudflarestorage.com`

**Update API .env:**
```bash
R2_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=YOUR_ACCESS_KEY
R2_SECRET_ACCESS_KEY=YOUR_SECRET_KEY
R2_BUCKET=docuforge-assets
R2_PUBLIC_URL=https://assets.docuforge.tech
```

**Restart API:**
```bash
sudo systemctl restart docuforge-api
```

---

#### Step 12: Deploy Frontend to Cloudflare Pages

**Option A: Via Cloudflare Dashboard (Recommended)**

1. Go to Cloudflare Dashboard → Pages
2. Create new project
3. Connect to your Git repository
4. Configure build:
   - **Build command:** `bun run build`
   - **Build output directory:** `.next`
   - **Root directory:** `frontend`
   - **Node version:** 20.x
5. Add environment variables:
   ```
   NEXT_PUBLIC_API_URL=https://api.docuforge.tech
   NEXT_PUBLIC_APP_URL=https://docuforge.tech
   SENTRY_DSN=YOUR_SENTRY_DSN (optional)
   SENTRY_ENVIRONMENT=production
   ```
6. Deploy

**Option B: Via Wrangler CLI**

```bash
cd /var/www/docuforge/frontend

# Install Wrangler
bun install -g wrangler

# Login
wrangler login

# Build
NODE_ENV=production bun run build

# Deploy
wrangler pages deploy .next --project-name=docuforge --branch=main
```

**Set custom domain:**
1. In Cloudflare Pages → Custom domains
2. Add `docuforge.tech` (or `app.docuforge.tech`)
3. Cloudflare will auto-configure DNS

---

### Phase 4: Post-Deployment Configuration

#### Step 13: Configure Stripe Webhooks

**Create webhook endpoint:**
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://api.docuforge.tech/v1/billing/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy webhook signing secret
5. Update `STRIPE_WEBHOOK_SECRET` in `api/.env`
6. Restart API: `sudo systemctl restart docuforge-api`

**Test webhook:**
```bash
stripe listen --forward-to https://api.docuforge.tech/v1/billing/webhook
stripe trigger checkout.session.completed
```

---

#### Step 14: Configure OAuth Redirect URIs

**Google:**
- Redirect URI: `https://api.docuforge.tech/v1/auth/oauth/google/callback`

**Microsoft:**
- Redirect URI: `https://api.docuforge.tech/v1/auth/oauth/microsoft/callback`

**GitHub:**
- Authorization callback URL: `https://api.docuforge.tech/v1/auth/oauth/github/callback`

**Update OAuth client settings in respective provider dashboards.**

---

#### Step 15: Set Up Monitoring

**Sentry:**
1. Create project in Sentry for each service:
   - `docuforge-api`
   - `docuforge-engine`
   - `docuforge-frontend`
2. Copy DSNs to respective `.env` files
3. Restart services

**Uptime Monitoring:**
- Use Uptime Robot or similar
- Monitor: `https://api.docuforge.tech/health`
- Alert on: Status code != 200, Response time > 1000ms

**Log Monitoring:**
```bash
# View logs in real-time
journalctl -u docuforge-api -u docuforge-engine -f

# Filter errors only
journalctl -u docuforge-api -p err -f
```

---

## Manual QA Checklist

### Pre-Launch Testing (Production Environment)

#### 1. Authentication & Authorization ✓

- [ ] **Register new account**
  - Navigate to `https://docuforge.tech/register`
  - Enter email + password
  - Verify email validation
  - Check account created in database
  - Verify JWT token issued (check localStorage in browser DevTools)

- [ ] **Login with credentials**
  - Go to `https://docuforge.tech/login`
  - Login with registered account
  - Verify redirect to dashboard
  - Check JWT stored in localStorage

- [ ] **OAuth login (Google)**
  - Click "Sign in with Google"
  - Complete OAuth flow
  - Verify redirect to `https://api.docuforge.tech/v1/auth/oauth/google/callback`
  - Verify account linked (check `oauth_accounts` table)
  - Verify token issued

- [ ] **OAuth login (Microsoft)** - Same flow as Google

- [ ] **OAuth login (GitHub)** - Same flow as Google

- [ ] **API Key creation**
  - Login to dashboard
  - Navigate to Settings → API Keys
  - Create new API key
  - Verify key prefix displayed (starts with `dfk_`)
  - Copy full key (only shown once)
  - Test API key in `curl`:
    ```bash
    curl -H "X-API-Key: YOUR_KEY" https://api.docuforge.tech/v1/templates
    ```

- [ ] **API Key revocation**
  - Revoke created API key
  - Verify requests with revoked key return 401

- [ ] **JWT expiry**
  - Wait for JWT to expire (or set short expiry in dev)
  - Verify redirect to login

- [ ] **Logout**
  - Click logout
  - Verify token cleared from localStorage
  - Verify redirect to login page

---

#### 2. Template Management ✓

- [ ] **Create template**
  - Dashboard → New Template
  - Enter name, description
  - Verify template appears in list
  - Check `templates` table

- [ ] **Edit template**
  - Open template in editor
  - Modify Typst code
  - Save (Ctrl+S or Cmd+S)
  - Verify version created in `template_versions` table
  - Verify `versionNumber` incremented

- [ ] **Template versioning**
  - Make 3 changes to template (3 versions)
  - Open version history
  - Verify 3 versions listed with timestamps
  - Click on old version
  - Verify code loaded from that version
  - Restore old version
  - Verify new version created as copy

- [ ] **Publish template**
  - Mark template as public
  - Copy public URL
  - Open in incognito window (logged out)
  - Verify template accessible
  - Verify can render with data

- [ ] **Delete template**
  - Delete a test template
  - Verify removed from list
  - Verify cascade delete of versions (check `template_versions` table)

---

#### 3. PDF Rendering ✓

- [ ] **Simple render (no data)**
  - Create template: `= Hello World\n\nTest document.`
  - Click "Render" or press Ctrl+R
  - Verify PDF preview loads in right panel
  - Verify PDF contains "Hello World"
  - Download PDF, verify it opens in PDF reader

- [ ] **Render with data**
  - Create template:
    ```typst
    #let d = sys.inputs
    = Invoice #d.id

    Customer: #d.customer
    Total: $#d.total
    ```
  - Add data in Data panel (JSON):
    ```json
    {
      "id": "INV-001",
      "customer": "John Doe",
      "total": 199.99
    }
    ```
  - Render
  - Verify PDF shows correct values

- [ ] **Render with multi-file template**
  - Create main file `main.typ`:
    ```typst
    #import "header.typ": make_header
    #make_header("My Report")

    Content here.
    ```
  - Create `header.typ`:
    ```typst
    #let make_header(title) = {
      align(center)[= #title]
    }
    ```
  - Render
  - Verify PDF generated with header

- [ ] **Render with asset (image)**
  - Upload image via Assets panel
  - Reference in template: `#image("logo.png")`
  - Render
  - Verify image appears in PDF

- [ ] **Render timeout**
  - Create infinite loop template:
    ```typst
    #while true {
      [Never ends]
    }
    ```
  - Click render
  - Verify timeout after 5 seconds (ENGINE_TIMEOUT_MS)
  - Verify error message displayed

- [ ] **Invalid Typst syntax**
  - Create template with syntax error: `#let x =` (incomplete)
  - Click render
  - Verify error message with line number
  - Verify no crash

- [ ] **Rate limiting (render endpoint)**
  - Send 15 render requests rapidly (as free user)
  - Verify 11th+ requests return 429 (free tier: 10 req/min)
  - Verify `X-RateLimit-*` headers present
  - Wait 1 minute
  - Verify requests succeed again

---

#### 4. Asset Storage (R2) ✓

- [ ] **Upload image**
  - Click "Upload Asset"
  - Select PNG/JPG (< 10MB)
  - Verify upload progress
  - Verify asset appears in list
  - Verify `assets` table entry created
  - Check R2 bucket via Cloudflare dashboard
  - Verify file exists at `r2Key` path

- [ ] **Upload oversized file**
  - Try to upload file > 10MB
  - Verify error: "File too large"

- [ ] **Download asset**
  - Click asset in list
  - Verify download starts
  - Verify file matches uploaded file (hash check)

- [ ] **Asset deduplication (by hash)**
  - Upload same image twice
  - Verify both entries in UI
  - Check R2 bucket
  - Verify only 1 file stored (deduplication by SHA-256 hash)

- [ ] **Delete asset**
  - Delete an asset
  - Verify removed from list
  - Verify cascade: templates using this asset show error (or remove reference)

- [ ] **Asset URL expiry**
  - Get presigned download URL from API
  - Wait 6 minutes (URLs expire in 5 min)
  - Try to access URL
  - Verify 403 Forbidden (expired)

---

#### 5. Billing & Plans ✓

- [ ] **Free plan limits**
  - Create new free account
  - Check usage: 500 renders/month
  - Make 500 render requests (via API key + script)
  - Verify 501st request returns:
    ```json
    {"error": "Monthly render limit exceeded. Upgrade your plan."}
    ```

- [ ] **Stripe checkout (Starter plan)**
  - Click "Upgrade to Starter"
  - Verify redirect to Stripe Checkout
  - **Use Stripe test card:** `4242 4242 4242 4242`, exp: any future date, CVC: any 3 digits
  - Complete checkout
  - Verify redirect to `https://docuforge.tech/settings?success=true`
  - Check database: `users.plan_tier` = `'starter'`, `plan_renders` = `10000`
  - Verify `stripe_customer_id` populated

- [ ] **Stripe checkout (Pro plan)** - Same as Starter

- [ ] **Subscription update**
  - Upgrade from Starter to Pro
  - Verify new limits: 50,000 renders/month
  - Check Stripe dashboard for subscription update event

- [ ] **Subscription cancellation**
  - Cancel subscription via Stripe Customer Portal
  - Verify webhook received: `customer.subscription.deleted`
  - Check database: `plan_tier` reverted to `'free'`, `plan_renders` = `500`

- [ ] **Invoice payment failure**
  - Trigger failed payment in Stripe
  - Verify webhook received: `invoice.payment_failed`
  - Verify account locked or downgraded (depends on your logic)
  - Verify email sent to user (if implemented)

- [ ] **Webhook signature verification**
  - Send fake webhook (no signature):
    ```bash
    curl -X POST https://api.docuforge.tech/v1/billing/webhook \
      -H "Content-Type: application/json" \
      -d '{"type":"customer.subscription.deleted"}'
    ```
  - Verify 400 Bad Request (invalid signature)

---

#### 6. AI Features (Gemini) ✓

- [ ] **Generate template from prompt**
  - Open AI drawer
  - Enter prompt: "Create an invoice template with company name, items table, and total"
  - Click "Generate"
  - Verify Typst code generated
  - Verify code inserted into editor
  - Render to verify it works

- [ ] **Generate from image**
  - Upload image (screenshot of a form)
  - Click "Generate from Image"
  - Verify Typst code generated matching image layout
  - Verify base64 image size validated (max 10MB)

- [ ] **AI rate limiting**
  - Make 10 AI requests rapidly
  - Verify rate limit applied
  - Verify error message

- [ ] **AI API key invalid**
  - Temporarily set `GEMINI_API_KEY` to invalid value
  - Restart API
  - Try to generate template
  - Verify error: "AI service unavailable"
  - Verify logged to Sentry

---

#### 7. Security & CORS ✓

- [ ] **CORS protection**
  - Open browser console on `https://evil.com`
  - Try to fetch API:
    ```javascript
    fetch('https://api.docuforge.tech/v1/templates', {
      headers: { 'Authorization': 'Bearer YOUR_JWT' }
    }).then(r => r.json()).then(console.log)
    ```
  - Verify CORS error: Origin not allowed

- [ ] **SQL injection protection**
  - Try to inject SQL in template name:
    - Name: `'; DROP TABLE users; --`
  - Verify template created with literal string (no SQL executed)
  - Verify `users` table still exists

- [ ] **XSS protection**
  - Create template with name: `<script>alert('XSS')</script>`
  - View template list
  - Verify script not executed (HTML escaped)

- [ ] **CSRF token (if implemented)**
  - Check for CSRF token in forms
  - Try to submit form without token
  - Verify rejected

- [ ] **Clickjacking protection**
  - Try to embed `https://api.docuforge.tech` in iframe:
    ```html
    <iframe src="https://api.docuforge.tech"></iframe>
    ```
  - Open in browser
  - Verify `X-Frame-Options: DENY` prevents embedding

---

#### 8. Performance & Load ✓

- [ ] **Cold start performance**
  - Restart services:
    ```bash
    sudo systemctl restart docuforge-engine docuforge-api
    ```
  - Wait 10 seconds
  - Make first render request
  - Verify responds in < 2 seconds (including engine warmup)

- [ ] **Concurrent renders**
  - Use `ab` (Apache Bench):
    ```bash
    ab -n 100 -c 10 -H "X-API-Key: YOUR_KEY" \
      -p render-payload.json -T application/json \
      https://api.docuforge.tech/v1/render
    ```
  - Verify 0% failed requests
  - Verify p95 latency < 500ms (for simple docs)

- [ ] **Large template rendering**
  - Create template with 50 pages of content (lorem ipsum)
  - Render
  - Verify completes in < 10 seconds
  - Verify PDF size reasonable (< 5MB)

- [ ] **Memory leak check**
  - Make 1000 consecutive render requests
  - Monitor memory:
    ```bash
    watch -n 1 'ps aux | grep docuforge'
    ```
  - Verify memory stable (no continuous growth)

---

#### 9. Error Handling & Observability ✓

- [ ] **Sentry error capture**
  - Force an error (e.g., invalid template ID)
  - Check Sentry dashboard
  - Verify error captured with:
    - Stack trace
    - User context
    - Request context
    - Breadcrumbs

- [ ] **Health endpoint degraded state**
  - Stop engine: `sudo systemctl stop docuforge-engine`
  - Check health: `curl https://api.docuforge.tech/health`
  - Verify response:
    ```json
    {
      "status": "degraded",
      "engine": {"status": "error", "error": "..."}
    }
    ```
  - Start engine: `sudo systemctl start docuforge-engine`
  - Verify health returns to "ok"

- [ ] **Database connection loss**
  - Simulate DB failure (rename DB file temporarily)
  - Make API request
  - Verify 503 Service Unavailable
  - Verify error logged to Sentry
  - Restore DB
  - Verify service recovers

- [ ] **Nginx timeout**
  - Create template with 65-second delay (> proxy_read_timeout)
  - Click render
  - Verify timeout error from Nginx
  - Verify graceful error message (not raw 504)

---

#### 10. Frontend E2E Flows ✓

- [ ] **Complete onboarding flow**
  1. Visit `https://docuforge.tech`
  2. Click "Sign Up"
  3. Register account
  4. Verify redirect to dashboard
  5. See quick start guide / tutorial
  6. Create first template
  7. Render first PDF
  8. Download PDF
  9. Create API key
  10. Test API key with `curl`

- [ ] **Mobile responsiveness**
  - Open `https://docuforge.tech` on mobile device (or Chrome DevTools mobile view)
  - Verify:
    - Login page responsive
    - Dashboard responsive
    - Editor responsive (Monaco editor usable)
    - Templates list responsive
    - Settings page responsive

- [ ] **Keyboard shortcuts**
  - Open editor
  - Test shortcuts:
    - `Ctrl+S` / `Cmd+S`: Save template
    - `Ctrl+R` / `Cmd+R`: Render PDF
    - `Ctrl+B` / `Cmd+B`: Toggle sidebar
    - `Ctrl+K`: Open command palette (if implemented)
  - Verify all shortcuts work

- [ ] **Accessibility (a11y)**
  - Run Lighthouse audit in Chrome DevTools
  - Verify accessibility score > 90
  - Test keyboard navigation (Tab, Enter, Esc)
  - Verify screen reader compatibility (if possible)

---

#### 11. API Integration Testing ✓

**Test via `curl` with API key:**

- [ ] **List templates**
  ```bash
  curl -H "X-API-Key: dfk_YOUR_KEY" \
    https://api.docuforge.tech/v1/templates
  ```
  - Verify returns array of templates

- [ ] **Get specific template**
  ```bash
  curl -H "X-API-Key: dfk_YOUR_KEY" \
    https://api.docuforge.tech/v1/templates/TEMPLATE_ID
  ```
  - Verify returns template details with versions

- [ ] **Create template via API**
  ```bash
  curl -X POST -H "X-API-Key: dfk_YOUR_KEY" \
    -H "Content-Type: application/json" \
    -d '{"name":"API Test","source":"= Test"}' \
    https://api.docuforge.tech/v1/templates
  ```
  - Verify template created

- [ ] **Render via API**
  ```bash
  curl -X POST -H "X-API-Key: dfk_YOUR_KEY" \
    -H "Content-Type: application/json" \
    -d '{"template":{"main":"main.typ","files":{"main.typ":"= Hello API"}},"data":{}}' \
    https://api.docuforge.tech/v1/render \
    --output test.pdf
  ```
  - Verify `test.pdf` created and opens correctly

- [ ] **Render with template ID**
  ```bash
  curl -X POST -H "X-API-Key: dfk_YOUR_KEY" \
    -H "Content-Type: application/json" \
    -d '{"templateId":"TEMPLATE_ID","data":{"key":"value"}}' \
    https://api.docuforge.tech/v1/render \
    --output test2.pdf
  ```
  - Verify PDF rendered with template

---

### Post-Launch Monitoring

- [ ] **Set up alerts**
  - Uptime monitor: Alert if health check fails for > 2 minutes
  - Sentry: Alert on new error types or >10 errors/hour
  - Disk space: Alert if > 80% full
  - Memory: Alert if > 90% used

- [ ] **Daily checks (first week)**
  - Check Sentry for errors
  - Check server logs: `journalctl -u docuforge-api --since today`
  - Check render success rate
  - Check Stripe webhook delivery rate
  - Check R2 storage usage

---

## Security Hardening

### Additional Security Measures (Post-Launch)

#### 1. Enable HTTP/2 & HTTP/3 (QUIC)

**Nginx HTTP/3 (optional but recommended):**
```bash
# Check if nginx compiled with QUIC support
nginx -V 2>&1 | grep quic

# If yes, add to server block:
listen 443 quic reuseport;
listen 443 ssl http2;
add_header Alt-Svc 'h3=":443"; ma=86400';
```

---

#### 2. Implement Content Security Policy (CSP)

**Add to Nginx for API:**
```nginx
add_header Content-Security-Policy "default-src 'none'; frame-ancestors 'none'" always;
```

**Add to Next.js for Frontend:**
```typescript
// frontend/next.config.ts
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.docuforge.tech;"
  }
];

export default {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  }
};
```

---

#### 3. Database Encryption at Rest

**For local SQLite:**
```bash
# Use SQLCipher (encrypted SQLite)
apt install sqlcipher

# Or encrypt the volume
cryptsetup luksFormat /dev/vdb
cryptsetup open /dev/vdb docuforge_data
mkfs.ext4 /dev/mapper/docuforge_data
mount /dev/mapper/docuforge_data /var/lib/docuforge
```

**For Turso:**
- Encryption at rest enabled by default

---

#### 4. Secrets Management

**Use HashiCorp Vault or similar:**
```bash
# Example: Store secrets in Vault
vault kv put secret/docuforge/api \
  jwt_secret=YOUR_SECRET \
  stripe_key=YOUR_KEY \
  gemini_key=YOUR_KEY

# Fetch in systemd service
ExecStartPre=/usr/local/bin/fetch-secrets.sh
```

**Or use systemd credentials:**
```bash
# Store secrets in systemd
systemd-creds encrypt - /etc/systemd/system/docuforge-api.service.d/jwt-secret.cred <<< "YOUR_SECRET"

# Reference in service file
LoadCredential=jwt_secret:/etc/systemd/system/docuforge-api.service.d/jwt-secret.cred
Environment=JWT_SECRET=%d/jwt_secret
```

---

#### 5. DDoS Protection

**Cloudflare (recommended, already in use):**
- Enable "Under Attack Mode" if needed
- Configure rate limiting rules in CF dashboard
- Enable Bot Fight Mode

**Nginx rate limiting (additional layer):**
```nginx
# In http block
limit_req_zone $binary_remote_addr zone=global_limit:10m rate=100r/s;
limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

# In server block
limit_req zone=global_limit burst=50 nodelay;
limit_conn conn_limit 10;
```

---

#### 6. Automated Backups

**Database backups:**
```bash
#!/bin/bash
# /usr/local/bin/backup-db.sh

BACKUP_DIR="/var/backups/docuforge"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup SQLite
cp /var/lib/docuforge/db/docuforge.db "$BACKUP_DIR/db_$DATE.db"

# Upload to S3/R2 (optional)
aws s3 cp "$BACKUP_DIR/db_$DATE.db" s3://docuforge-backups/

# Keep only last 30 days
find "$BACKUP_DIR" -name "db_*.db" -mtime +30 -delete
```

**Cron job:**
```bash
crontab -e
# Add:
0 2 * * * /usr/local/bin/backup-db.sh
```

---

#### 7. Penetration Testing

**Tools to run:**
- OWASP ZAP: `zap-cli quick-scan https://api.docuforge.tech`
- Nikto: `nikto -h https://api.docuforge.tech`
- Nmap: `nmap -sV YOUR_DROPLET_IP`
- SQLMap: Test all inputs for SQL injection

**Address any findings before going live.**

---

## Monitoring & Observability

### Metrics to Track

#### Application Metrics

- **Render throughput**: Renders/minute
- **Render latency**: p50, p95, p99
- **Error rate**: Errors/minute by type
- **Active users**: DAU, MAU
- **API key usage**: Requests by user/key
- **Plan distribution**: Free vs Starter vs Pro users

#### Infrastructure Metrics

- **CPU usage**: Average and peak
- **Memory usage**: RSS, heap
- **Disk I/O**: Read/write ops
- **Network I/O**: Bandwidth
- **Disk usage**: Free space on `/` and `/var/lib/docuforge`

#### Business Metrics

- **Signups**: New users/day
- **Conversions**: Free → Paid conversion rate
- **MRR**: Monthly recurring revenue
- **Churn rate**: Subscription cancellations
- **Render volume**: Total renders by plan tier

---

### Recommended Tools

1. **Sentry** - Error tracking (already integrated)
2. **Grafana Cloud** - Metrics + logs (free tier available)
   - Scrape Prometheus metrics from API/Engine
   - Visualize in Grafana dashboards
3. **Uptime Robot** - Uptime monitoring (free tier: 50 monitors)
4. **Stripe Dashboard** - Revenue and subscription metrics
5. **Cloudflare Analytics** - Traffic and performance

---

## Rollback Plan

### If Issues Found Post-Launch

#### Level 1: Quick Rollback (API/Engine)

**Rollback to previous version:**
```bash
cd /var/www/docuforge
git log --oneline -10
git checkout PREVIOUS_COMMIT_HASH

# Rebuild and restart
cd api && bun install
cd ../engine && cargo build --release

sudo systemctl restart docuforge-engine docuforge-api
```

**Time:** 10-15 minutes

---

#### Level 2: Full Rollback (Including Frontend)

**Frontend rollback in Cloudflare Pages:**
1. Go to Cloudflare Dashboard → Pages → docuforge
2. Click "View build" on previous deployment
3. Click "Rollback to this deployment"

**Time:** 2-3 minutes

---

#### Level 3: Emergency Database Restore

**Restore from backup:**
```bash
sudo systemctl stop docuforge-api
cp /var/backups/docuforge/db_20260208_020000.db /var/lib/docuforge/db/docuforge.db
sudo systemctl start docuforge-api
```

**Time:** 5 minutes

---

## Final Pre-Launch Checklist

### Infrastructure ✓

- [ ] Droplet provisioned and accessible
- [ ] Firewall configured (only CF IPs + SSH)
- [ ] Nginx installed and configured
- [ ] SSL certificates issued (Let's Encrypt)
- [ ] systemd services created and enabled
- [ ] Backups configured (daily cron job)
- [ ] Monitoring set up (Uptime Robot, Sentry)

### Configuration ✓

- [ ] All environment variables set (API, Engine, Frontend)
- [ ] JWT secret generated (32+ chars)
- [ ] R2 bucket created with custom domain
- [ ] Stripe webhooks configured
- [ ] OAuth redirect URIs updated
- [ ] CORS origins configured for production
- [ ] Cloudflare IPs added to Nginx config

### Code Changes ✓

- [ ] ENGINE_URL hardcoded fallbacks removed
- [ ] All tests passing (`make test`)
- [ ] Frontend builds successfully (`bun run build`)
- [ ] Engine builds successfully (`cargo build --release`)
- [ ] Git tagged with release version (`git tag v1.0.0`)

### Deployment ✓

- [ ] Engine deployed and running on droplet
- [ ] API deployed and running on droplet
- [ ] Frontend deployed to Cloudflare Pages
- [ ] Health checks returning "ok"
- [ ] Smoke test completed (register, render, download)

### Post-Deployment ✓

- [ ] Manual QA checklist completed (see above)
- [ ] Load testing completed (100 concurrent users)
- [ ] Security scan completed (OWASP ZAP)
- [ ] Documentation updated (API docs, user guides)
- [ ] Marketing site updated (if separate)
- [ ] Status page created (e.g., status.docuforge.tech)

---

## Success Criteria

**You're ready to launch when:**

1. ✅ All pre-launch blockers resolved
2. ✅ Manual QA checklist 100% passed
3. ✅ Health checks green on all services
4. ✅ Monitoring and alerts configured
5. ✅ Rollback plan tested
6. ✅ Team briefed on launch plan
7. ✅ Support channel ready (email, Discord, etc.)

---

## Post-Launch

### Week 1: Monitor Daily

- Check Sentry for errors every morning
- Review server logs for anomalies
- Monitor Stripe webhook delivery success rate
- Track signup and conversion metrics
- Respond to user feedback quickly

### Week 2-4: Stabilize & Optimize

- Analyze performance bottlenecks
- Optimize slow queries
- Tune rate limits based on real usage
- Add missing features based on user requests
- Plan for Redis migration (when multi-instance needed)

### Month 2+: Scale

- Add Redis for rate limiting and OAuth state
- Set up auto-scaling (if needed)
- Implement caching layers (Redis/CDN)
- Add advanced monitoring (APM)
- Plan for database migration (if SQLite becomes bottleneck)

---

## Support & Troubleshooting

### Common Issues

**Issue:** API returns 502 Bad Gateway
**Cause:** Engine not running
**Fix:** `sudo systemctl restart docuforge-engine`

**Issue:** Renders failing with timeout
**Cause:** Complex templates or slow engine
**Fix:** Increase `ENGINE_TIMEOUT_MS` in `.env`

**Issue:** Rate limit too aggressive
**Cause:** Default limits too low
**Fix:** Adjust in `api/src/middleware/rate-limit.ts`

**Issue:** OAuth callback fails
**Cause:** Redirect URI mismatch
**Fix:** Update in provider dashboard

**Issue:** Stripe webhooks not received
**Cause:** Webhook secret mismatch
**Fix:** Update `STRIPE_WEBHOOK_SECRET` in `.env`

---

## Conclusion

You're now ready to launch DocuForge to production! Follow this guide step-by-step, complete the QA checklist, and you'll have a secure, performant, and scalable system.

**Remember:**
- Launch is just the beginning
- Monitor closely in the first week
- Iterate based on user feedback
- Scale when needed (Redis, multi-instance)

**Good luck with your launch! 🚀**

---

**Questions or Issues?**
File an issue in the repository or contact the team.
