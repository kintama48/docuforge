# DocuForge Launch TL;DR

**Status:** Ready to deploy — all code complete, 282 tests passing
**Domain:** `docuforge.app`

---

## Deployment Order (3-4 hours)

### 1. Cloudflare Setup (30 min)

**DNS records** for `docuforge.app`:
- `A` → `api` → `DROPLET_IP` (proxied)
- `CNAME` → `www` → `docuforge.pages.dev` (proxied)
- `CNAME` → `console` → `docuforge.pages.dev` (proxied)
- `CNAME` → `@` → `www.docuforge.app` (proxied)

**R2 bucket:**
1. Create bucket `docuforge-assets` (private, no public access)
2. Create R2 API token (Object Read & Write)
3. Save Access Key ID + Secret Access Key
4. Add CORS rule: allow PUT from `https://console.docuforge.app`

**SSL:** Create Origin Certificate (*.docuforge.app), set mode to Full (strict)

**Cache rules:** 7 rules (see LAUNCH_GUIDE.md → Deploy Frontend)

### 2. Droplet Setup (45 min)

```bash
apt update && apt upgrade -y
apt install -y curl git build-essential nginx
curl -fsSL https://bun.sh/install | bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
useradd -m -s /bin/bash docuforge
```

Firewall: SSH + CF IPs only
SSL: Install Cloudflare Origin Certificate
Nginx: Reverse proxy to localhost:3000

### 3. Deploy Backend (60 min)

```bash
git clone REPO /var/www/docuforge
cd api && bun install --production
cd ../engine && make fonts && cargo build --release
```

Set up `.env` files (see LAUNCH_GUIDE.md for full template).
Create systemd services. Start engine first, then API.

### 4. Deploy Frontend (15 min)

Cloudflare Pages → connect repo → build: `bun run build`, output: `.next`, root: `frontend`
Add custom domains: `console.docuforge.app`, `www.docuforge.app`

### 5. Post-Deploy (30 min)

- Stripe webhook: `https://api.docuforge.app/v1/billing/webhook`
- OAuth redirects: `https://api.docuforge.app/v1/auth/oauth/{provider}/callback`
- Sentry DSNs (optional)
- Uptime Robot → `https://api.docuforge.app/health`

---

## Key Environment Variables

```bash
# API (.env) — required
DATABASE_URL=file:/var/lib/docuforge/db/docuforge.db
JWT_SECRET=$(openssl rand -base64 48)
R2_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=docuforge-assets
R2_PUBLIC_URL=https://ACCOUNT_ID.r2.cloudflarestorage.com
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
GEMINI_API_KEY=...
APP_URL=https://console.docuforge.app
API_URL=https://api.docuforge.app
```

---

## Smoke Tests

```bash
curl https://api.docuforge.app/health
# → {"status":"ok","engine":"healthy"}
```

Then: register, create template, render PDF, upload asset, test API key.

---

## Full docs: `LAUNCH_GUIDE.md`
