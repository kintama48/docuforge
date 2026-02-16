# DocuForge Caching & Compression Strategy

## Current State (Audit)

**Caching:** None. No `Cache-Control`, `ETag`, `Last-Modified`, or `Vary` headers on any API response. Frontend relies on Next.js defaults for static assets only.

**Compression:** None. No gzip/brotli middleware in the API (Hono), engine (Axum), or frontend.

**Impact:** Every request hits the origin server at full payload size, regardless of whether the content has changed.

---

## Architecture Overview

```
User Browser
  ↓
Cloudflare (CDN + edge cache + compression)
  ↓ ← Cache-Control + ETag headers determine behavior
  ├── www.docuforge.app (Cloudflare Pages — marketing)
  │     → Compression: automatic (Cloudflare)
  │     → Caching: long edge TTL for public HTML + immutable assets
  │
  ├── console.docuforge.app (Cloudflare Pages — app/console)
  │     → Compression: automatic (Cloudflare)
  │     → Caching: bypass HTML, cache immutable assets
  │
  └── api.docuforge.app (VPS — Bun + Hono)
        → Compression: Hono compress() middleware
        → Caching: Cache-Control + ETag per endpoint
        ↓
        Engine (Rust — internal, not exposed)
```

---

## Step 1: API Compression (Hono)

### What to do

Add Hono's built-in `compress` middleware in `api/src/app.ts`. This handles `Accept-Encoding` negotiation and compresses responses with gzip or deflate.

```ts
// api/src/app.ts
import { compress } from 'hono/compress';

// Add BEFORE route mounting, AFTER CORS
app.use('*', compress());
```

Hono's `compress()` supports gzip and deflate. For Brotli, Cloudflare handles it at the edge (see Step 4), so you don't need it at the origin.

### What this covers

- All JSON responses (templates, usage, webhooks, auth, errors)
- PDF responses (already binary, minimal compression gain — but doesn't hurt)
- Compresses only when client sends `Accept-Encoding: gzip`

### Skip compression for

Nothing to skip — the middleware auto-detects content types and only compresses when beneficial.

---

## Step 2: Cache-Control Headers (API)

Create a new middleware file `api/src/middleware/cache.ts` with per-endpoint cache policies.

### Cache Policy Matrix

| Endpoint | Method | Auth | Cacheable? | Cache-Control | Rationale |
|----------|--------|------|------------|---------------|-----------|
| `GET /health` | GET | No | Yes | `public, max-age=10` | Health checks, short TTL |
| `GET /v1/templates` | GET | Yes | Conditional | `private, max-age=60, stale-while-revalidate=30` | Template list changes infrequently |
| `GET /v1/templates/:id` | GET | Yes | Conditional | `private, max-age=300, stale-while-revalidate=60` | Individual template rarely changes |
| `GET /v1/usage` | GET | Yes | No | `no-store` | Always needs fresh data |
| `GET /v1/webhooks` | GET | Yes | No | `no-store` | Config data, must be fresh |
| `POST /v1/render` | POST | Yes | No | `no-store` | Every render is unique |
| `POST /v1/render/preview` | POST | Yes | No | `no-store` | Every preview is unique |
| `POST /v1/ai/*` | POST | Yes | No | `no-store` | AI responses are non-deterministic |
| `POST /v1/auth/*` | POST | No | No | `no-store` | Auth responses must not be cached |
| `GET /v1/assets/:id` | GET | Yes | Yes | `private, max-age=86400, immutable` | Assets are content-addressed (hash) |
| `POST /v1/billing/*` | POST | Yes | No | `no-store` | Financial data |

### Implementation

```ts
// api/src/middleware/cache.ts
import { createMiddleware } from 'hono/factory';

export function cacheControl(directive: string) {
  return createMiddleware(async (c, next) => {
    await next();
    // Only set cache headers on successful responses
    if (c.res.status >= 200 && c.res.status < 300) {
      c.header('Cache-Control', directive);
    }
  });
}

// Presets
export const noCache = cacheControl('no-store');
export const shortCache = cacheControl('private, max-age=60, stale-while-revalidate=30');
export const mediumCache = cacheControl('private, max-age=300, stale-while-revalidate=60');
export const longCache = cacheControl('private, max-age=86400, immutable');
export const publicShortCache = cacheControl('public, max-age=10');
```

Apply to routes:

```ts
// api/src/routes/templates.ts
templates.get('/', jwtAuth, shortCache, async (c) => { ... });
templates.get('/:id', jwtAuth, mediumCache, async (c) => { ... });

// api/src/routes/assets.ts
assets.get('/:id/download', jwtAuth, longCache, async (c) => { ... });

// api/src/routes/health.ts
health.get('/health', publicShortCache, async (c) => { ... });
```

### Important: `Vary` Header

All authenticated endpoints must include `Vary: Authorization, X-API-Key` so caches don't serve user A's data to user B:

```ts
// Add globally in app.ts or in the cache middleware
c.header('Vary', 'Authorization, X-API-Key, Accept-Encoding');
```

---

## Step 3: ETags

### What are ETags

ETags let the client say "I have version X, has it changed?" The server either returns `304 Not Modified` (no body) or the new version. This saves bandwidth on unchanged resources.

### Implementation

Create `api/src/middleware/etag.ts`:

```ts
import { createMiddleware } from 'hono/factory';

export const etag = createMiddleware(async (c, next) => {
  await next();

  // Only ETag successful GET responses
  if (c.req.method !== 'GET' || c.res.status !== 200) return;

  const body = await c.res.clone().text();
  const hash = new Bun.CryptoHasher('md5').update(body).digest('hex');
  const etagValue = `"${hash}"`;

  c.header('ETag', etagValue);

  // Check If-None-Match
  const ifNoneMatch = c.req.header('If-None-Match');
  if (ifNoneMatch === etagValue) {
    c.res = new Response(null, { status: 304, headers: c.res.headers });
  }
});
```

### Where to apply ETags

| Endpoint | ETag? | Why |
|----------|-------|-----|
| `GET /v1/templates` | Yes | List doesn't change often, saves bandwidth |
| `GET /v1/templates/:id` | Yes | Template detail is stable |
| `GET /v1/usage` | No | Changes on every render |
| `GET /v1/webhooks` | No | Config data, low traffic |
| `GET /v1/assets/:id` | Yes (use asset hash) | Already content-addressed |

For assets, use the existing `hash` field from the database as the ETag instead of computing one:

```ts
c.header('ETag', `"${asset.hash}"`);
```

---

## Step 4: Cloudflare Configuration

### 4a. Enable Compression (Automatic)

Cloudflare compresses responses automatically if:
- The origin doesn't already send `Content-Encoding`
- The response is a compressible content type (HTML, JSON, JS, CSS, etc.)
- The client sends `Accept-Encoding: gzip` or `br`

**Action:** In Cloudflare Dashboard → Speed → Optimization → Content Optimization:
- Enable **Brotli** (on by default)
- This gives you Brotli at the edge even though the origin only does gzip

With this setup:
- Origin → Cloudflare: gzip (Hono compress)
- Cloudflare → Browser: Brotli (better ratio, Cloudflare re-compresses)

### 4b. Cache Rules

Go to **Cloudflare Dashboard → Caching → Cache Rules** and create these rules:

#### Rule 1: API — No Cache (Default)

```
If: Hostname equals "api.docuforge.app"
Then: Cache eligibility = Bypass cache
```

This ensures API responses are NOT cached at the edge by default. The origin's `Cache-Control` headers handle browser caching. You don't want Cloudflare serving stale authenticated responses.

#### Rule 2: API — Cache Public Health Endpoint

```
If: Hostname equals "api.docuforge.app" AND URI Path equals "/health"
Then:
  Cache eligibility = Eligible for cache
  Edge TTL = 10 seconds
  Browser TTL = Respect origin
```

#### Rule 3: Marketing — Long Cache for Public HTML

```
If: Hostname equals "www.docuforge.app" AND URI Path does not match "/_next/*"
Then:
  Cache eligibility = Eligible for cache
  Edge TTL = 7 days
  Browser TTL = 0 (must-revalidate)
```

All public, unauthenticated pages live on `www.docuforge.app`. Cloudflare Pages will purge on deploy, so a long edge TTL is safe.

#### Rule 4: Marketing — Long Cache for Hashed Assets

```
If: Hostname equals "www.docuforge.app" AND URI Path matches "/_next/static/*"
Then:
  Cache eligibility = Eligible for cache
  Edge TTL = 1 year
  Browser TTL = 1 year
```

Next.js hashed assets (`/_next/static/chunks/abc123.js`) are immutable — the hash changes when content changes.

#### Rule 5: Marketing — Cache OG Images

```
If: Hostname equals "www.docuforge.app" AND URI Path matches "/og/*"
Then:
  Cache eligibility = Eligible for cache
  Edge TTL = 1 hour
  Browser TTL = 1 hour
```

OG images are generated server-side and change rarely.

#### Rule 6: Console — Bypass HTML

```
If: Hostname equals "console.docuforge.app" AND URI Path does not match "/_next/*"
Then:
  Cache eligibility = Bypass cache
```

The console is authenticated and should never be cached at the edge.

#### Rule 7: Console — Long Cache for Hashed Assets

```
If: Hostname equals "console.docuforge.app" AND URI Path matches "/_next/static/*"
Then:
  Cache eligibility = Eligible for cache
  Edge TTL = 1 year
  Browser TTL = 1 year
```

### 4c. Browser TTL (Global Default)

**Cloudflare Dashboard → Caching → Configuration → Browser Cache TTL:**

Set to **"Respect Existing Headers"**. This lets your origin Cache-Control headers control browser behavior, and Cloudflare doesn't override them.

### 4d. Tiered Cache

**Cloudflare Dashboard → Caching → Tiered Cache:**

Enable **Smart Tiered Cache Topology** (free). This reduces origin hits by letting Cloudflare PoPs share cache between each other.

---

## Step 5: Smart Cache Eviction

### Template Updates → Purge Cache

When a user updates a template (publishes a new version), the cached `GET /v1/templates/:id` response is stale. Options:

**Option A: Short TTL + stale-while-revalidate (recommended)**

The `max-age=300, stale-while-revalidate=60` on template endpoints means:
- For 5 minutes, the browser uses the cached version
- After 5 minutes, it serves stale data while fetching fresh data in the background
- Maximum staleness: 6 minutes

This is acceptable for template metadata. The actual template _content_ (source code) is fetched on editor open, which is always fresh.

**Option B: Cloudflare API purge on mutation (if you need instant)**

Call Cloudflare's purge API from your template update handler:

```ts
// Only if you enable edge caching for API responses
await fetch(`https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${CF_API_TOKEN}` },
  body: JSON.stringify({
    files: [`https://api.docuforge.app/v1/templates/${templateId}`]
  })
});
```

**For now, stick with Option A.** You're not caching API responses at the Cloudflare edge (Rule 1 bypasses), so browser cache with short TTL + stale-while-revalidate is sufficient.

### Asset Immutability

Assets use content-addressed storage (hash in filename/ETag). When a user replaces an asset, it gets a new hash → new URL → no stale cache.

### PDF Renders

Renders are never cached (`no-store`). Each render is unique per data input.

---

## Step 6: Frontend Caching

### Next.js Static Export (Cloudflare Pages)

Cloudflare Pages automatically handles:
- Hashed JS/CSS chunks → immutable, long cache (www + console)
- HTML pages → long edge cache on `www.docuforge.app`, bypassed on `console.docuforge.app`
- Brotli compression → automatic

Console should not be indexed. Add `X-Robots-Tag: noindex, nofollow` on console responses and serve a `robots.txt` that disallows crawling on `console.docuforge.app`.

### API Client (Frontend → API)

Add cache hints to your frontend fetch calls:

```ts
// For template list (cache for 60s)
fetch(`${API_URL}/v1/templates`, {
  headers: { Authorization: `Bearer ${token}` },
  next: { revalidate: 60 },  // Next.js 16 data cache
});

// For user usage (never cache)
fetch(`${API_URL}/v1/usage`, {
  headers: { Authorization: `Bearer ${token}` },
  cache: 'no-store',
});

// For template detail (cache for 5 min)
fetch(`${API_URL}/v1/templates/${id}`, {
  headers: { Authorization: `Bearer ${token}` },
  next: { revalidate: 300 },
});
```

Note: Since the frontend is a Cloudflare Pages static SPA (client-side rendering), `next/cache` revalidation applies only to server components. For client-side fetches via React Query or SWR, configure `staleTime` and `gcTime` instead.

---

## Step 7: Engine (Internal — No Changes Needed)

The Rust engine is internal (not exposed to the internet). It sits behind the API on `127.0.0.1:3001`. No caching or compression needed here because:
- It only serves the API, not end users
- Every render request has unique input data
- Network is localhost (zero latency, no compression benefit)

---

## Implementation Checklist

### API (do these in code)

- [ ] Add `compress()` middleware in `app.ts`
- [ ] Create `api/src/middleware/cache.ts` with Cache-Control presets
- [ ] Apply `noCache` to: render, preview, AI, auth, billing, usage, webhooks
- [ ] Apply `shortCache` to: `GET /v1/templates`
- [ ] Apply `mediumCache` to: `GET /v1/templates/:id`
- [ ] Apply `longCache` to: `GET /v1/assets/:id/download`
- [ ] Apply `publicShortCache` to: `GET /health`
- [ ] Add `Vary: Authorization, X-API-Key, Accept-Encoding` globally
- [ ] Create `api/src/middleware/etag.ts`
- [ ] Apply ETags to: `GET /v1/templates`, `GET /v1/templates/:id`
- [ ] Use asset `hash` as ETag for `GET /v1/assets/:id`

### Cloudflare Dashboard

- [ ] Verify Brotli is enabled (Speed → Optimization)
- [ ] Set Browser Cache TTL to "Respect Existing Headers"
- [ ] Enable Smart Tiered Cache
- [ ] Create Cache Rule 1: API bypass (default)
- [ ] Create Cache Rule 2: Health endpoint cache
- [ ] Create Cache Rule 3: www HTML long cache (7 days)
- [ ] Create Cache Rule 4: www `/_next/static/*` long cache
- [ ] Create Cache Rule 5: www `/og/*` image cache
- [ ] Create Cache Rule 6: console HTML bypass
- [ ] Create Cache Rule 7: console `/_next/static/*` long cache

### DNS Setup (prerequisite)

- [ ] `www.docuforge.app` → Cloudflare Pages (CNAME)
- [ ] `console.docuforge.app` → Cloudflare Pages (CNAME)
- [ ] `api.docuforge.app` → VPS IP (A record, orange cloud / proxied)

The orange cloud (proxied) on the API subdomain is required for Cloudflare's compression and cache rules to take effect.

---

## Expected Impact

| Metric | Before | After |
|--------|--------|-------|
| JSON response size | Raw (~2-10 KB) | Gzip: ~0.5-2 KB, Brotli: ~0.4-1.5 KB |
| Template list bandwidth | Full response every time | 304 Not Modified on repeat visits |
| Static asset caching | Next.js defaults only | 1-year edge + browser cache |
| HTML page caching | No edge cache | 5-min edge cache, instant loads |
| Origin server load | Every request hits origin | Health checks cached, templates cached client-side |
| TTFB for returning users | Full round trip | 304 responses (~50ms vs ~200ms) |
