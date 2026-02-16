# DocuForge API Service — Build Specification

**Component:** API Gateway ("The Brain")
**Stack:** Bun + Hono + Drizzle ORM
**Database:** SQLite (Turso)
**Storage:** Cloudflare R2 (S3 Compatible)
**Deployment:** Fly.io (Docker) or Hetzner VPS ($5/mo)
**Version:** 1.0 — MVP for First Paying Customers

---

## 0. Context For The Agent

You are building the API layer for DocuForge — a PDF generation service. The Rust rendering engine (`docuforge-engine`) is **already built and running** on `http://127.0.0.1:3001`. It accepts a JSON payload with Typst source code + data + assets and returns raw PDF bytes. Your job is to build everything around it: authentication, template storage, asset management, billing, and the HTTP interface that developers will call.

### What The Rust Engine Expects

```
POST http://127.0.0.1:3001/render
Content-Type: application/json

{
  "template": {
    "main": "main.typ",
    "files": {
      "main.typ": "#set text(font: \"Inter\")\nHello, #sys.inputs.name!",
      "header.typ": "#let company = \"Acme\""
    }
  },
  "data": {
    "name": "World"
  },
  "assets": [
    { "name": "logo.png", "content": "<base64>" },
    { "name": "CustomFont.ttf", "url": "https://r2.../signed", "hash": "sha256..." }
  ],
  "options": {
    "timeout_ms": 5000
  }
}
```

**Engine Responses:**
- `200 OK` → `application/pdf` binary stream
- `400 Bad Request` → `{ "error": "compilation_failed", "message": "...", "span": { "file": "main.typ", "line": 5, "column": 12 } }`
- `408 Request Timeout` → `{ "error": "timeout" }`

### Design Principles

1. **Ship fast.** This is an MVP. Every feature must earn its place.
2. **Solo dev friendly.** No microservices. One process. One database. One deployment.
3. **API-first.** The dashboard is a consumer of the API, not a special snowflake.
4. **The engine is dumb.** All business logic lives here in the API layer.

---

## 1. Project Structure

```
docuforge-api/
├── package.json
├── tsconfig.json
├── drizzle.config.ts
├── .env.example
├── .env
├── bunfig.toml
├── Dockerfile
├── docker-compose.yml          # API + Engine together
│
├── src/
│   ├── index.ts                # Entry point — start server
│   ├── app.ts                  # Hono app factory (for testing)
│   │
│   ├── config/
│   │   └── env.ts              # Environment variable loading + validation
│   │
│   ├── db/
│   │   ├── client.ts           # Turso/SQLite connection
│   │   ├── schema.ts           # Drizzle schema (ALL tables)
│   │   └── migrate.ts          # Migration runner
│   │
│   ├── middleware/
│   │   ├── auth.ts             # API key + session auth
│   │   ├── rate-limit.ts       # In-memory rate limiter
│   │   ├── error-handler.ts    # Global error handler
│   │   └── logger.ts           # Request logging
│   │
│   ├── routes/
│   │   ├── index.ts            # Route aggregator
│   │   ├── render.ts           # POST /v1/render, POST /v1/render/preview
│   │   ├── templates.ts        # CRUD + publish + versioning
│   │   ├── assets.ts           # Upload URLs, registration, listing
│   │   ├── auth.ts             # Register, login, API key management
│   │   ├── billing.ts          # Checkout, webhook, usage
│   │   ├── ai.ts               # AI edit/generate endpoints
│   │   └── health.ts           # GET /health
│   │
│   ├── services/
│   │   ├── engine.ts           # HTTP client to Rust engine
│   │   ├── template.ts         # Template business logic
│   │   ├── asset.ts            # Asset resolution + R2 presigning
│   │   ├── usage.ts            # Credit tracking + plan enforcement
│   │   ├── stripe.ts           # Stripe checkout + webhooks
│   │   ├── ai.ts               # LLM integration
│   │   └── key-cache.ts        # In-memory LRU for API key validation
│   │
│   ├── lib/
│   │   ├── api-key.ts          # Key generation, hashing, prefix logic
│   │   ├── errors.ts           # Custom error classes
│   │   ├── id.ts               # ID generation (nanoid or cuid2)
│   │   └── validation.ts       # Zod schemas for all inputs
│   │
│   └── types/
│       └── index.ts            # Shared TypeScript types
│
├── tests/
│   ├── setup.ts                # Test database, mock engine, helpers
│   ├── helpers/
│   │   ├── db.ts               # In-memory SQLite for tests
│   │   ├── mock-engine.ts      # Fake Rust engine (returns dummy PDF)
│   │   ├── mock-stripe.ts      # Fake Stripe webhook events
│   │   ├── auth.ts             # Helper to create authenticated requests
│   │   └── fixtures.ts         # Reusable test data
│   │
│   ├── unit/
│   │   ├── api-key.test.ts
│   │   ├── key-cache.test.ts
│   │   ├── usage.test.ts
│   │   ├── asset-resolution.test.ts
│   │   ├── template-service.test.ts
│   │   ├── validation.test.ts
│   │   └── env.test.ts
│   │
│   ├── integration/
│   │   ├── health.test.ts
│   │   ├── auth-register.test.ts
│   │   ├── auth-login.test.ts
│   │   ├── auth-apikey.test.ts
│   │   ├── render.test.ts
│   │   ├── render-preview.test.ts
│   │   ├── render-with-template.test.ts
│   │   ├── render-billing-limit.test.ts
│   │   ├── templates-crud.test.ts
│   │   ├── templates-versioning.test.ts
│   │   ├── assets-upload.test.ts
│   │   ├── assets-resolution.test.ts
│   │   ├── billing-checkout.test.ts
│   │   ├── billing-webhook.test.ts
│   │   └── ai-edit.test.ts
│   │
│   └── e2e/
│       ├── full-render-flow.test.ts    # Register → Upload template → Render → Get PDF
│       ├── billing-flow.test.ts        # Free limit → Checkout → Upgrade → Render
│       └── versioning-flow.test.ts     # Create → Edit → Publish v2 → Render uses v2
│
├── scripts/
│   ├── seed.ts                 # Seed official templates
│   ├── generate-key.ts         # CLI tool to generate API key
│   └── migrate.ts              # Run migrations
│
└── templates/                  # Official pre-built Typst templates
    ├── invoice/
    │   ├── main.typ
    │   └── defaults.json
    ├── receipt/
    │   ├── main.typ
    │   └── defaults.json
    ├── shipping-label/
    │   ├── main.typ
    │   └── defaults.json
    ├── report/
    │   ├── main.typ
    │   └── defaults.json
    └── certificate/
        ├── main.typ
        └── defaults.json
```

---

## 2. Dependencies

### Runtime

| Package | Purpose |
|---------|---------|
| `hono` | HTTP framework |
| `@hono/zod-validator` | Request validation |
| `drizzle-orm` | ORM |
| `@libsql/client` | Turso/SQLite driver |
| `drizzle-kit` | Migrations CLI |
| `zod` | Schema validation |
| `stripe` | Payment processing |
| `@aws-sdk/client-s3` | R2 presigned URLs (S3-compatible) |
| `@aws-sdk/s3-request-presigner` | Presigning |
| `nanoid` | ID generation |
| `jose` | JWT handling (lightweight) |
| `lru-cache` | API key caching |
| `openai` | AI integration (OpenAI SDK) |

### Dev/Test

| Package | Purpose |
|---------|---------|
| `bun:test` | Test runner (built into Bun) |
| `@types/bun` | Bun type definitions |
| `drizzle-kit` | Schema migration tool |

**NOTE:** Bun has a built-in test runner (`bun test`), built-in SQLite, built-in `.env` loading, and native fetch. Do NOT install dotenv, node-fetch, jest, vitest, or better-sqlite3. Bun handles all of this natively.

---

## 3. Configuration

### `.env.example`

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=file:./local.db
# For Turso production:
# DATABASE_URL=libsql://your-db.turso.io
# DATABASE_AUTH_TOKEN=your-token

# Rust Engine
ENGINE_URL=http://127.0.0.1:3001
ENGINE_TIMEOUT_MS=5000

# Cloudflare R2
R2_ENDPOINT=https://your-account.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your-key
R2_SECRET_ACCESS_KEY=your-secret
R2_BUCKET=docuforge-assets
R2_PUBLIC_URL=https://assets.docuforge.app

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...

# AI
OPENAI_API_KEY=sk-...
AI_MODEL=gpt-4o

# Auth
JWT_SECRET=your-256-bit-secret
JWT_EXPIRY=7d

# Limits
FREE_MONTHLY_LIMIT=500
STARTER_MONTHLY_LIMIT=10000
PRO_MONTHLY_LIMIT=50000
MAX_UPLOAD_SIZE_MB=10
```

### `src/config/env.ts`

Validate all environment variables at startup using Zod. If any required variable is missing, the process must exit with a clear error message listing exactly which variables are missing. Optional variables must have sensible defaults.

---

## 4. Database Schema

### `src/db/schema.ts`

Use Drizzle ORM with SQLite mode. Every table uses text IDs (nanoid). All timestamps are integers (Unix epoch milliseconds).

```
TABLE: users
├── id              TEXT PRIMARY KEY        (nanoid, prefix: "usr_")
├── email           TEXT UNIQUE NOT NULL
├── password_hash   TEXT NOT NULL
├── stripe_customer_id  TEXT
├── plan_tier       TEXT DEFAULT "free"     ("free" | "starter" | "pro")
├── plan_renders    INTEGER DEFAULT 500     (monthly limit based on plan)
├── created_at      INTEGER NOT NULL
└── updated_at      INTEGER NOT NULL

TABLE: api_keys
├── id              TEXT PRIMARY KEY        (nanoid, prefix: "key_")
├── user_id         TEXT NOT NULL → users.id
├── key_hash        TEXT UNIQUE NOT NULL    (SHA-256 of the raw key)
├── key_prefix      TEXT NOT NULL           ("docu_live_xxxxxx" — first 16 chars shown to user)
├── name            TEXT NOT NULL           (user-friendly label)
├── last_used_at    INTEGER
├── created_at      INTEGER NOT NULL
└── is_revoked      INTEGER DEFAULT 0       (0 = active, 1 = revoked)

TABLE: templates
├── id              TEXT PRIMARY KEY        (nanoid, prefix: "tpl_")
├── user_id         TEXT → users.id         (NULL = official system template)
├── name            TEXT NOT NULL
├── description     TEXT
├── live_version_id TEXT → template_versions.id
├── is_public       INTEGER DEFAULT 0       (1 = visible in gallery)
├── created_at      INTEGER NOT NULL
└── updated_at      INTEGER NOT NULL
CONSTRAINT: UNIQUE(user_id, name)

TABLE: template_versions
├── id              TEXT PRIMARY KEY        (nanoid, prefix: "ver_")
├── template_id     TEXT NOT NULL → templates.id
├── version_number  INTEGER NOT NULL
├── source          TEXT NOT NULL           (raw Typst source code)
├── files           TEXT                    (JSON: additional files map, nullable)
├── defaults        TEXT                    (JSON: default data for preview)
├── commit_message  TEXT
├── created_at      INTEGER NOT NULL
CONSTRAINT: UNIQUE(template_id, version_number)

TABLE: assets
├── id              TEXT PRIMARY KEY        (nanoid, prefix: "ast_")
├── user_id         TEXT NOT NULL → users.id
├── name            TEXT NOT NULL           (original filename: "logo.png")
├── r2_key          TEXT NOT NULL           ("usr_xxx/assets/ast_xxx.png")
├── mime_type       TEXT NOT NULL
├── size_bytes      INTEGER NOT NULL
├── hash            TEXT NOT NULL           (SHA-256 of file content)
├── created_at      INTEGER NOT NULL
CONSTRAINT: UNIQUE(user_id, name)

TABLE: render_logs
├── id              TEXT PRIMARY KEY        (nanoid, prefix: "log_")
├── user_id         TEXT NOT NULL → users.id
├── template_id     TEXT                    (NULL for preview renders)
├── template_version_id  TEXT              (NULL for preview renders)
├── status          TEXT NOT NULL           ("success" | "error")
├── duration_ms     INTEGER NOT NULL
├── error_message   TEXT
├── created_at      INTEGER NOT NULL
```

### Indexes

```sql
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash) WHERE is_revoked = 0;
CREATE INDEX idx_render_logs_usage ON render_logs(user_id, created_at) WHERE status = 'success';
CREATE INDEX idx_templates_user ON templates(user_id);
CREATE INDEX idx_template_versions_template ON template_versions(template_id);
CREATE INDEX idx_assets_user ON assets(user_id);
```

---

## 5. API Endpoints

### 5.1 Health

```
GET /health
```

**Auth:** None
**Response (200):**
```json
{
  "status": "ok",
  "engine": "healthy",
  "version": "1.0.0",
  "uptime": 3600
}
```

**Logic:**
1. Ping `GET ENGINE_URL/health`
2. If engine is down, return `{ "status": "degraded", "engine": "unreachable" }` with status 200 (API itself is healthy)

---

### 5.2 Authentication

#### Register

```
POST /v1/auth/register
Content-Type: application/json

{
  "email": "dev@example.com",
  "password": "securepassword123"
}
```

**Auth:** None
**Validation:**
- `email`: Valid email format, max 255 chars
- `password`: Min 8 chars, max 128 chars

**Logic:**
1. Check email uniqueness
2. Hash password with `Bun.password.hash()` (uses Argon2 by default)
3. Generate user ID (`usr_` + nanoid)
4. Insert user with `plan_tier: "free"`, `plan_renders: 500`
5. Generate first API key automatically
6. Return JWT + API key (raw, shown only once)

**Response (201):**
```json
{
  "user": {
    "id": "usr_abc123",
    "email": "dev@example.com",
    "plan": "free"
  },
  "token": "eyJ...",
  "api_key": {
    "raw_key": "docu_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "prefix": "docu_live_xxxxxx",
    "name": "Default",
    "note": "Save this key — it will not be shown again."
  }
}
```

**Errors:**
- `409 Conflict`: Email already registered

---

#### Login

```
POST /v1/auth/login
Content-Type: application/json

{
  "email": "dev@example.com",
  "password": "securepassword123"
}
```

**Auth:** None
**Logic:**
1. Find user by email
2. Verify password with `Bun.password.verify()`
3. Generate JWT

**Response (200):**
```json
{
  "token": "eyJ...",
  "user": {
    "id": "usr_abc123",
    "email": "dev@example.com",
    "plan": "pro"
  }
}
```

**Errors:**
- `401 Unauthorized`: Invalid email or password (do NOT say which one)

---

#### Create API Key

```
POST /v1/auth/keys
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "name": "Production Server"
}
```

**Logic:**
1. Generate 32 random bytes → hex encode → prefix with `docu_live_`
2. SHA-256 hash the raw key for storage
3. Store hash + prefix (first 16 chars) + name
4. Return raw key (only time it's visible)

**Response (201):**
```json
{
  "raw_key": "docu_live_a1b2c3d4e5f6...",
  "prefix": "docu_live_a1b2c3",
  "name": "Production Server"
}
```

---

#### List API Keys

```
GET /v1/auth/keys
Authorization: Bearer <jwt>
```

**Response (200):**
```json
{
  "keys": [
    {
      "id": "key_abc",
      "prefix": "docu_live_a1b2c3",
      "name": "Production Server",
      "last_used_at": 1706140800000,
      "created_at": 1706054400000
    }
  ]
}
```

Note: NEVER return the key hash or raw key.

---

#### Revoke API Key

```
DELETE /v1/auth/keys/:id
Authorization: Bearer <jwt>
```

**Logic:**
1. Verify key belongs to authenticated user
2. Set `is_revoked = 1`
3. Evict from in-memory cache

**Response (200):**
```json
{ "message": "Key revoked" }
```

---

### 5.3 Rendering (The Money Maker)

#### Production Render

```
POST /v1/render
X-API-Key: docu_live_xxxxxxxx
Content-Type: application/json

{
  "template_id": "tpl_invoice",
  "data": {
    "invoice_id": "INV-001",
    "customer": "Acme Corp",
    "items": [
      { "description": "Widget", "qty": 5, "price": 9.99 }
    ]
  }
}
```

**Auth:** API Key (X-API-Key header)
**Validation:**
- `template_id`: Required, string
- `data`: Optional, object (max 1MB when serialized)

**Logic (Critical Path — Keep Tight):**
1. **Authenticate** — Look up `key_hash` (check LRU cache first, then DB)
2. **Credit Check** — Count `render_logs` for this user where `created_at` >= start of current billing month AND `status = 'success'`. If count >= `plan_renders`, return `402`
3. **Resolve Template** — Fetch template + live version. If template belongs to another user, return `404`
4. **Resolve Assets** — Fetch all assets for this `user_id`. Generate presigned R2 URLs. Build assets array
5. **Build Engine Payload:**
   ```json
   {
     "template": {
       "main": "main.typ",
       "files": {
         "main.typ": "<source from live version>",
         ...additional files from version
       }
     },
     "data": { ...user provided data },
     "assets": [ ...resolved assets with presigned URLs ],
     "options": { "timeout_ms": 5000 }
   }
   ```
6. **Call Engine** — `POST ENGINE_URL/render` with timeout
7. **Log Result** — Insert into `render_logs` (success or error)
8. **Update Key** — Set `last_used_at` on the API key (async, don't block response)
9. **Return PDF** — Stream binary response with correct headers

**Success Response (200):**
```
Content-Type: application/pdf
Content-Disposition: inline; filename="document.pdf"
X-Render-Duration: 35
X-Render-Id: log_xyz789

<binary PDF bytes>
```

**Error Responses:**
- `400 Bad Request`: Template compilation error (forward engine error)
- `402 Payment Required`: Monthly limit exceeded
- `404 Not Found`: Template not found or not owned by user
- `408 Request Timeout`: Engine timeout
- `503 Service Unavailable`: Engine unreachable

**402 Response Body:**
```json
{
  "error": "limit_exceeded",
  "message": "Monthly render limit reached (500/500)",
  "usage": {
    "used": 500,
    "limit": 500,
    "plan": "free",
    "resets_at": "2024-02-01T00:00:00Z"
  },
  "upgrade_url": "https://www.docuforge.app/pricing"
}
```

---

#### Preview Render

```
POST /v1/render/preview
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "source": "#set page(paper: \"a4\")\nHello, World!",
  "files": {
    "header.typ": "#let x = 1"
  },
  "data": {
    "name": "Test"
  }
}
```

**Auth:** JWT (dashboard users only)
**Logic:** Same as production render except:
- Uses raw `source` instead of resolving a template
- Does NOT count against monthly credits
- Rate limited: 30 requests/minute per user
- Still logged (for debugging) but with `template_id: null`

**Validation:**
- `source`: Required, string, max 100KB
- `files`: Optional, object, each value max 100KB
- `data`: Optional, object

---

### 5.4 Template Management

#### List Templates

```
GET /v1/templates
Authorization: Bearer <jwt>

Query params:
  ?page=1
  &limit=20
  &include_official=true
```

**Response (200):**
```json
{
  "templates": [
    {
      "id": "tpl_invoice",
      "name": "Standard Invoice",
      "description": "VAT-compliant invoice template",
      "is_official": true,
      "live_version": {
        "id": "ver_abc",
        "version_number": 3,
        "commit_message": "Updated logo size",
        "created_at": 1706140800000
      },
      "created_at": 1706054400000,
      "updated_at": 1706140800000
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 8
  }
}
```

---

#### Get Template (with version history)

```
GET /v1/templates/:id
Authorization: Bearer <jwt>
```

**Response (200):**
```json
{
  "template": {
    "id": "tpl_invoice",
    "name": "Standard Invoice",
    "live_version": {
      "id": "ver_abc",
      "version_number": 3,
      "source": "#set page(paper: \"a4\")...",
      "files": null,
      "defaults": { "invoice_id": "INV-001" },
      "commit_message": "Updated logo size"
    },
    "versions": [
      { "id": "ver_abc", "version_number": 3, "commit_message": "Updated logo size", "created_at": 1706140800000 },
      { "id": "ver_def", "version_number": 2, "commit_message": "Added footer", "created_at": 1706054400000 },
      { "id": "ver_ghi", "version_number": 1, "commit_message": "Initial version", "created_at": 1705968000000 }
    ]
  }
}
```

---

#### Create Template

```
POST /v1/templates
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "name": "My Invoice",
  "description": "Custom invoice for my SaaS",
  "source": "#set page(paper: \"a4\")\nInvoice \\##sys.inputs.id",
  "files": {
    "utils.typ": "#let fmt(x) = [$#x]"
  },
  "defaults": {
    "id": "INV-001",
    "total": 99.99
  },
  "commit_message": "Initial version"
}
```

**Logic:**
1. Validate name uniqueness for this user
2. Create `template` row
3. Create `template_versions` row (version_number = 1)
4. Set `live_version_id` to the new version
5. Return template with version

**Response (201):**
```json
{
  "template": {
    "id": "tpl_xyz",
    "name": "My Invoice",
    "live_version": {
      "id": "ver_abc",
      "version_number": 1,
      "source": "...",
      "commit_message": "Initial version"
    }
  }
}
```

---

#### Update Template (Publish New Version)

```
POST /v1/templates/:id/publish
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "source": "#set page(paper: \"a4\")\nUpdated invoice...",
  "files": {
    "utils.typ": "#let fmt(x) = [USD $#x]"
  },
  "defaults": { "id": "INV-002" },
  "commit_message": "Changed currency format"
}
```

**Logic:**
1. Verify template ownership
2. Get latest version_number, increment by 1
3. Insert new `template_versions` row
4. Update `templates.live_version_id` to new version
5. Update `templates.updated_at`

**Response (200):**
```json
{
  "version": {
    "id": "ver_new",
    "version_number": 4,
    "commit_message": "Changed currency format",
    "created_at": 1706227200000
  }
}
```

---

#### Fork Template (Copy an official or public template)

```
POST /v1/templates/:id/fork
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "name": "My Custom Invoice"
}
```

**Logic:**
1. Fetch source template + live version
2. Create new template owned by current user
3. Create version 1 with copied source
4. Return new template

---

#### Delete Template

```
DELETE /v1/templates/:id
Authorization: Bearer <jwt>
```

**Logic:**
1. Verify ownership (cannot delete official templates)
2. Delete all versions (cascade)
3. Delete template row

---

### 5.5 Asset Management

#### Request Upload URL

```
POST /v1/assets/upload-url
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "filename": "logo.png",
  "content_type": "image/png",
  "size_bytes": 45000
}
```

**Validation:**
- `filename`: Required, must end with allowed extension
- `content_type`: Must match extension
- `size_bytes`: Max 5MB for images, 10MB for fonts
- Allowed types: `.png`, `.jpg`, `.jpeg`, `.svg`, `.ttf`, `.otf`, `.woff2`

**Logic:**
1. Generate asset ID and R2 key: `{user_id}/assets/{asset_id}.{ext}`
2. Generate presigned PUT URL (expires in 10 minutes)
3. Return URL + asset ID

**Response (200):**
```json
{
  "upload_url": "https://r2.cloudflarestorage.com/docuforge-assets/usr_abc/assets/ast_xyz.png?X-Amz-...",
  "asset_id": "ast_xyz",
  "expires_in": 600
}
```

---

#### Confirm Upload

```
POST /v1/assets
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "asset_id": "ast_xyz",
  "name": "logo.png",
  "hash": "sha256-abc123def456..."
}
```

**Logic:**
1. Verify the file exists in R2 (HEAD request)
2. Register asset in database
3. If asset with same `name` exists for user, update it (replace old file)

**Response (201):**
```json
{
  "asset": {
    "id": "ast_xyz",
    "name": "logo.png",
    "mime_type": "image/png",
    "size_bytes": 45000,
    "hash": "sha256-abc123def456"
  }
}
```

---

#### List Assets

```
GET /v1/assets
Authorization: Bearer <jwt>
```

**Response (200):**
```json
{
  "assets": [
    {
      "id": "ast_xyz",
      "name": "logo.png",
      "mime_type": "image/png",
      "size_bytes": 45000,
      "created_at": 1706140800000
    },
    {
      "id": "ast_abc",
      "name": "BrandFont.ttf",
      "mime_type": "font/ttf",
      "size_bytes": 2500000,
      "created_at": 1706054400000
    }
  ]
}
```

---

#### Delete Asset

```
DELETE /v1/assets/:id
Authorization: Bearer <jwt>
```

**Logic:**
1. Verify ownership
2. Delete from R2
3. Delete from database

---

### 5.6 Billing

#### Get Usage

```
GET /v1/usage
X-API-Key: docu_live_xxx   (or Authorization: Bearer <jwt>)
```

**Response (200):**
```json
{
  "plan": "free",
  "renders": {
    "used": 342,
    "limit": 500,
    "remaining": 158
  },
  "period": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-02-01T00:00:00Z"
  }
}
```

---

#### Create Checkout Session

```
POST /v1/billing/checkout
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "plan": "starter"
}
```

**Logic:**
1. Create or retrieve Stripe customer
2. Create Stripe Checkout session with appropriate price ID
3. Return checkout URL

**Response (200):**
```json
{
  "checkout_url": "https://checkout.stripe.com/c/pay/cs_test_..."
}
```

---

#### Stripe Webhook

```
POST /v1/billing/webhook
Stripe-Signature: t=...,v1=...
Content-Type: application/json
```

**Logic:** Handle these events:
- `checkout.session.completed` → Update `plan_tier`, `plan_renders`, `stripe_customer_id`
- `customer.subscription.updated` → Update `plan_tier`, `plan_renders`
- `customer.subscription.deleted` → Downgrade to free

**CRITICAL:** Verify webhook signature using `STRIPE_WEBHOOK_SECRET`. Reject unsigned requests.

---

### 5.7 AI Integration

#### AI Edit

```
POST /v1/ai/edit
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "prompt": "Add a footer with page numbers",
  "current_code": "#set page(paper: \"a4\")\nHello World",
  "asset_names": ["logo.png", "BrandFont.ttf"]
}
```

**Logic:**
1. Check rate limit (free: 5/hour, starter: 20/hour, pro: 50/hour)
2. Build system prompt: "You are a Typst expert. The user has these assets available: [logo.png, BrandFont.ttf]. Modify the code based on the user's request. Return ONLY the modified Typst code, no explanation."
3. Call OpenAI API
4. Return modified code

**Response (200):**
```json
{
  "code": "#set page(paper: \"a4\", footer: context [\n  #h(1fr) #counter(page).display() #h(1fr)\n])\nHello World",
  "tokens_used": 450
}
```

---

## 6. Middleware Specifications

### 6.1 Auth Middleware

Two modes — applied per-route:

**API Key Mode** (for `/v1/render`, `/v1/usage`):
1. Extract `X-API-Key` header
2. SHA-256 hash the key
3. Check LRU cache (TTL: 60 seconds, max 1000 entries)
4. If cache miss, query DB (WHERE `key_hash` = hash AND `is_revoked` = 0)
5. If valid, attach `user_id` to request context
6. If invalid, return `401 Unauthorized`

**JWT Mode** (for dashboard endpoints):
1. Extract `Authorization: Bearer <token>` header
2. Verify JWT signature with `JWT_SECRET`
3. Extract `user_id` from claims
4. Attach to request context

### 6.2 Rate Limiter

In-memory, per-user, sliding window.

| Endpoint Group | Free | Starter | Pro |
|----------------|------|---------|-----|
| `/v1/render` | 10/min | 60/min | 200/min |
| `/v1/render/preview` | 30/min | 30/min | 30/min |
| `/v1/ai/*` | 5/hour | 20/hour | 50/hour |
| All others | 60/min | 60/min | 60/min |

Return `429 Too Many Requests` with `Retry-After` header.

### 6.3 Error Handler

All errors must follow this format:
```json
{
  "error": "machine_readable_code",
  "message": "Human-readable description",
  "details": {}
}
```

Map all error codes:
| Code | HTTP Status |
|------|-------------|
| `validation_error` | 422 |
| `unauthorized` | 401 |
| `forbidden` | 403 |
| `not_found` | 404 |
| `conflict` | 409 |
| `limit_exceeded` | 402 |
| `rate_limited` | 429 |
| `compilation_failed` | 400 |
| `engine_timeout` | 408 |
| `engine_unavailable` | 503 |
| `internal_error` | 500 |

### 6.4 Request Logger

Log every request as structured JSON:
```json
{
  "method": "POST",
  "path": "/v1/render",
  "status": 200,
  "duration_ms": 48,
  "user_id": "usr_abc",
  "request_id": "req_xyz",
  "ip": "1.2.3.4"
}
```

**NEVER log:** Request body, response body, API keys, JWT tokens, user data payloads.

---

## 7. Service Layer Details

### 7.1 Engine Client (`services/engine.ts`)

Responsible for communicating with the Rust engine.

**Functions:**
- `renderPdf(payload: EnginePayload): Promise<Buffer | EngineError>`
- `checkHealth(): Promise<boolean>`

**Behavior:**
- Use native `fetch()` (Bun built-in)
- Set timeout via `AbortController` with `ENGINE_TIMEOUT_MS`
- If engine returns non-200, parse error body and throw typed error
- If engine is unreachable (ECONNREFUSED), throw `EngineUnavailableError`
- Retry logic: Do NOT retry. Renders are not idempotent (they consume credits). Fail fast.

### 7.2 Asset Resolution (`services/asset.ts`)

Resolves all user assets into the format the engine expects.

**Function:** `resolveUserAssets(userId: string): Promise<EngineAsset[]>`

**Logic:**
1. Query all assets for `user_id`
2. For each asset, generate a presigned GET URL (expires in 5 minutes)
3. Return array of `{ name, url, hash }`

**Caching:** Presigned URLs can be cached for 4 minutes (they expire at 5).

### 7.3 Usage Service (`services/usage.ts`)

**Functions:**
- `checkCredits(userId: string): Promise<{ allowed: boolean, used: number, limit: number }>`
- `logRender(params: RenderLogParams): Promise<void>`

**Credit Calculation:**
1. Get `plan_renders` from user record
2. Count `render_logs` WHERE `user_id` = user AND `status` = 'success' AND `created_at` >= first day of current UTC month
3. If count >= limit, return `{ allowed: false }`

**Performance:** This runs on every render request. Use an indexed query. Consider caching the count with a short TTL (5 seconds) in hot path.

### 7.4 Key Cache (`services/key-cache.ts`)

LRU cache that maps `key_hash → { user_id, plan_tier }`.

**Configuration:**
- Max entries: 1000
- TTL: 60 seconds
- On key revocation: explicitly evict

---

## 8. Test Specification

### 8.1 Test Philosophy

- **Every endpoint has at least one happy path and one error path test**
- **Business logic services have thorough unit tests**
- **E2E tests cover the critical user journeys**
- **Tests use an in-memory SQLite database and a mock engine**

### 8.2 Test Setup (`tests/setup.ts`)

Create helpers that:
1. Spin up in-memory SQLite with the full schema
2. Start a mock HTTP server on a random port that mimics the Rust engine
3. Create the Hono app instance pointed at mock engine
4. Provide factory functions: `createTestUser()`, `createTestApiKey()`, `createTestTemplate()`

### 8.3 Mock Engine (`tests/helpers/mock-engine.ts`)

A minimal HTTP server that:
- `POST /render` → Returns a hardcoded valid PDF (28-byte minimal PDF or fixture file)
- Can be configured to return errors (400, 408) for specific test cases
- Records all received payloads for assertion

### 8.4 Unit Tests

#### `api-key.test.ts`
| Test | Description |
|------|-------------|
| `generates key with correct prefix` | Starts with `docu_live_` |
| `generates unique keys` | 1000 keys, no duplicates |
| `hash is deterministic` | Same input = same hash |
| `hash is not reversible` | Hash !== raw key |
| `prefix extracts correctly` | First 16 chars of raw key |

#### `key-cache.test.ts`
| Test | Description |
|------|-------------|
| `cache hit returns user` | Previously stored key found |
| `cache miss returns null` | Unknown key not found |
| `cache expires after TTL` | Entry gone after 60s |
| `cache evicts on revoke` | Manual eviction works |
| `cache respects max size` | LRU eviction at 1000 |

#### `usage.test.ts`
| Test | Description |
|------|-------------|
| `fresh user has full credits` | 0 used, 500 limit |
| `counts only success renders` | Error renders don't count |
| `counts only current month` | Last month's renders ignored |
| `rejects when at limit` | Exactly at limit = rejected |
| `rejects when over limit` | Over limit = rejected |
| `different plans have different limits` | Free=500, Starter=10K, Pro=50K |

#### `asset-resolution.test.ts`
| Test | Description |
|------|-------------|
| `resolves user assets to engine format` | Correct structure returned |
| `generates presigned URLs` | URLs contain signature params |
| `returns empty for user with no assets` | Empty array, no error |
| `includes hash for cache matching` | Hash present in output |

#### `template-service.test.ts`
| Test | Description |
|------|-------------|
| `creates template with version 1` | Both records created |
| `publish increments version` | v1 → v2 |
| `publish updates live pointer` | live_version_id changes |
| `enforces unique name per user` | Duplicate name rejected |
| `different users can have same name` | No cross-user conflict |
| `fork copies source correctly` | Source matches original |
| `delete cascades to versions` | Versions removed |

#### `validation.test.ts`
| Test | Description |
|------|-------------|
| `valid render request passes` | No errors |
| `missing template_id rejected` | Validation error |
| `data over 1MB rejected` | Size limit enforced |
| `valid register request passes` | No errors |
| `short password rejected` | Min 8 chars |
| `invalid email rejected` | Proper format required |
| `valid asset upload passes` | No errors |
| `disallowed file type rejected` | Only allowed extensions |
| `oversized file rejected` | Max size enforced |

#### `env.test.ts`
| Test | Description |
|------|-------------|
| `loads all required vars` | No missing vars |
| `defaults applied for optional` | PORT defaults to 3000 |
| `throws on missing required` | Clear error message |

### 8.5 Integration Tests

Each test creates a fresh database and makes real HTTP requests to the Hono app.

#### `health.test.ts`
| Test | Description |
|------|-------------|
| `returns 200 with status ok` | Basic health check |
| `reports engine status` | Shows engine healthy/unreachable |

#### `auth-register.test.ts`
| Test | Description |
|------|-------------|
| `registers new user` | 201, returns token + API key |
| `returns API key only once` | Key is in registration response |
| `rejects duplicate email` | 409 Conflict |
| `rejects weak password` | 422 Validation Error |
| `rejects invalid email` | 422 Validation Error |
| `creates user as free tier` | plan_tier = "free" |

#### `auth-login.test.ts`
| Test | Description |
|------|-------------|
| `logs in with correct credentials` | 200, returns token |
| `rejects wrong password` | 401 |
| `rejects unknown email` | 401 (same message as wrong password) |

#### `auth-apikey.test.ts`
| Test | Description |
|------|-------------|
| `creates new API key` | 201, returns raw key |
| `lists keys without raw values` | Only prefix shown |
| `revokes key` | 200, key no longer works |
| `revoked key returns 401` | Immediate effect |

#### `render.test.ts`
| Test | Description |
|------|-------------|
| `renders PDF with valid template` | 200, PDF bytes returned |
| `response has correct content type` | application/pdf |
| `response has duration header` | X-Render-Duration present |
| `rejects without API key` | 401 |
| `rejects with revoked key` | 401 |
| `rejects with invalid key` | 401 |
| `returns 404 for missing template` | Template not found |
| `returns 404 for other user's template` | Access denied as 404 |
| `forwards engine compilation errors` | 400 with error details |
| `returns 503 when engine down` | Engine unavailable |
| `logs successful render` | render_logs entry created |
| `logs failed render` | Error logged too |
| `updates key last_used_at` | Timestamp updated |

#### `render-preview.test.ts`
| Test | Description |
|------|-------------|
| `renders from raw source` | 200, PDF bytes |
| `requires JWT auth (not API key)` | 401 with API key |
| `does not count against credits` | Usage unchanged |
| `rejects source over 100KB` | 422 |

#### `render-billing-limit.test.ts`
| Test | Description |
|------|-------------|
| `allows render under limit` | 200 |
| `rejects render at limit` | 402 with usage details |
| `rejects render over limit` | 402 |
| `upgrade increases limit` | Pro user has higher limit |
| `usage resets monthly` | New month = fresh credits |
| `error renders don't count` | Only successes counted |
| `402 includes upgrade URL` | Response body has link |

#### `templates-crud.test.ts`
| Test | Description |
|------|-------------|
| `creates template` | 201 |
| `lists user templates` | Returns owned templates |
| `includes official templates when requested` | Query param works |
| `gets template with source` | Full source in response |
| `rejects duplicate name` | 409 |
| `deletes template` | 200 |
| `cannot delete official template` | 403 |
| `deleted template returns 404` | Properly removed |

#### `templates-versioning.test.ts`
| Test | Description |
|------|-------------|
| `publish creates new version` | version_number incremented |
| `live version updates on publish` | live_version_id changes |
| `old versions preserved` | Full history accessible |
| `render uses live version` | PDF reflects latest source |
| `fork creates owned copy` | New template with v1 |

#### `assets-upload.test.ts`
| Test | Description |
|------|-------------|
| `returns presigned URL` | 200 with upload_url |
| `rejects disallowed file type` | 422 |
| `rejects oversized file` | 422 |
| `confirms upload creates asset` | Asset in DB after confirm |
| `lists user assets` | Returns all assets |
| `deletes asset` | Removed from DB |
| `duplicate name replaces old` | Only one asset with that name |

#### `assets-resolution.test.ts`
| Test | Description |
|------|-------------|
| `render payload includes user assets` | Mock engine receives assets |
| `asset URLs are presigned` | Signature params present |
| `render works without assets` | Empty array, no error |

#### `billing-checkout.test.ts`
| Test | Description |
|------|-------------|
| `creates checkout session` | Returns Stripe URL |
| `rejects invalid plan` | 422 |

#### `billing-webhook.test.ts`
| Test | Description |
|------|-------------|
| `checkout.session.completed upgrades plan` | plan_tier updated |
| `subscription.deleted downgrades to free` | plan_tier = "free" |
| `rejects unsigned webhook` | 400 |

#### `ai-edit.test.ts`
| Test | Description |
|------|-------------|
| `returns modified code` | 200 with new source |
| `rate limited when exceeded` | 429 |
| `includes asset context in prompt` | Mock LLM receives asset list |

### 8.6 End-to-End Tests

These test complete user journeys across multiple endpoints.

#### `full-render-flow.test.ts`
```
1. POST /v1/auth/register → Get API key
2. POST /v1/templates → Create "My Invoice" template
3. POST /v1/render with template_id + data → Get PDF
4. Verify PDF bytes are valid
5. GET /v1/usage → Verify 1 render counted
```

#### `billing-flow.test.ts`
```
1. Register as free user
2. Render 500 PDFs (simulate)
3. POST /v1/render → Expect 402
4. Simulate Stripe webhook (checkout.session.completed, plan=starter)
5. Verify plan_tier updated
6. POST /v1/render → Expect 200 (limit is now 10K)
```

#### `versioning-flow.test.ts`
```
1. Create template with source "Hello v1"
2. Render → Verify engine receives "Hello v1"
3. Publish new version with source "Hello v2"
4. Render → Verify engine receives "Hello v2"
5. GET /v1/templates/:id → Verify both versions in history
```

### 8.7 Test Commands

```bash
# Run all tests
bun test

# Run specific test file
bun test tests/unit/usage.test.ts

# Run tests matching pattern
bun test --grep "render"

# Run with verbose output
bun test --verbose

# Run only unit tests
bun test tests/unit/

# Run only integration tests
bun test tests/integration/

# Run only e2e tests
bun test tests/e2e/
```

---

## 9. Official Templates

The agent must create 5 production-quality Typst templates. These are stored in the `templates/` directory and seeded into the database on first deploy.

### Template Requirements

Each template must:
- Use `sys.inputs` for all dynamic data
- Include a `defaults.json` with realistic sample data
- Be beautiful and professional (not a plain text dump)
- Handle edge cases (long text wrapping, empty arrays, missing optional fields)
- Use Inter or Roboto fonts (bundled with the engine)

### Template List

| Template | Key Data Fields | Page Size |
|----------|----------------|-----------|
| **Invoice** | company info, customer, line items, tax, total, due date | A4 |
| **Receipt** | store info, items, payment method, date/time | 80mm thermal |
| **Shipping Label** | from address, to address, tracking barcode, weight | 4×6 inch |
| **Report** | title, author, date, sections with content | A4 |
| **Certificate** | recipient name, title, date, issuer, description | A4 landscape |

---

## 10. Docker & Deployment

### `docker-compose.yml`

```yaml
version: "3.8"
services:
  api:
    build:
      context: ./docuforge-api
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - ENGINE_URL=http://engine:3001
      - DATABASE_URL=file:/data/docuforge.db
    volumes:
      - db-data:/data
    depends_on:
      engine:
        condition: service_healthy

  engine:
    build:
      context: ./docuforge-engine
      dockerfile: docker/Dockerfile
    expose:
      - "3001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 5s
      timeout: 3s
      retries: 3

volumes:
  db-data:
```

### API Dockerfile

```dockerfile
FROM oven/bun:1 AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

FROM base AS build
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
# Run any build steps here if needed

FROM base AS runtime
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/src ./src
COPY --from=build /app/templates ./templates
COPY --from=build /app/package.json ./
COPY --from=build /app/drizzle.config.ts ./
COPY --from=build /app/tsconfig.json ./

# Non-root user
RUN adduser --disabled-password --gecos "" docuforge
USER docuforge

EXPOSE 3000
CMD ["bun", "run", "src/index.ts"]
```

---

## 11. Implementation Order

The agent must build in this exact sequence. Each step must pass its tests before proceeding.

### Phase 1: Foundation
1. **Project scaffold** — package.json, tsconfig, bunfig, directory structure
2. **Config module** — env loading + validation
3. **Database** — schema, client, migration runner
4. **Error classes** — all custom error types
5. **ID generation** — nanoid with prefixes
6. **Validation schemas** — all Zod schemas

### Phase 2: Auth
7. **API key utilities** — generate, hash, prefix
8. **Auth middleware** — API key + JWT dual mode
9. **Key cache** — LRU implementation
10. **Auth routes** — register, login, key CRUD
11. **Auth tests** — all unit + integration

### Phase 3: Core Rendering
12. **Engine client** — HTTP client to Rust engine
13. **Usage service** — credit checking + logging
14. **Asset service** — resolution logic
15. **Render route** — production + preview endpoints
16. **Render tests** — all unit + integration

### Phase 4: Templates
17. **Template service** — CRUD + versioning logic
18. **Template routes** — all endpoints
19. **Template tests** — all unit + integration
20. **Official templates** — 5 Typst templates + seed script

### Phase 5: Assets & Billing
21. **Asset routes** — upload URL, confirm, list, delete
22. **Stripe service** — checkout + webhook handling
23. **Billing routes** — checkout + webhook endpoints
24. **Billing tests** — all unit + integration

### Phase 6: AI & Polish
25. **AI service** — LLM gateway with rate limiting
26. **AI routes** — edit + generate endpoints
27. **Request logger middleware** — structured JSON logging
28. **Rate limiter middleware** — per-user, per-route
29. **E2E tests** — all 3 journey tests
30. **Docker setup** — Dockerfile + docker-compose

---

## 12. Verification Checklist

Before this phase is complete:

- [ ] `bun test` — all tests pass
- [ ] `bun run src/index.ts` — server starts without errors
- [ ] Register a user via curl → get API key
- [ ] Create a template via curl
- [ ] Render a PDF via curl with template_id + data → valid PDF
- [ ] Render a preview via curl with raw source → valid PDF
- [ ] Hit the 500 free limit → get 402
- [ ] Revoke an API key → subsequent requests return 401
- [ ] Health endpoint shows engine status
- [ ] Docker compose brings up both services
- [ ] docker-compose logs show structured JSON
- [ ] All 5 official templates render correctly

---

## 13. Curl Validation Commands

### Register
```bash
curl -X POST http://localhost:3000/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}' | jq
```

### Render with Template
```bash
curl -X POST http://localhost:3000/v1/render \
  -H "X-API-Key: docu_live_YOUR_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{"template_id":"tpl_invoice","data":{"invoice_id":"INV-001","items":[{"description":"Widget","price":9.99}],"total":9.99}}' \
  -o invoice.pdf
```

### Preview
```bash
curl -X POST http://localhost:3000/v1/render/preview \
  -H "Authorization: Bearer YOUR_JWT_HERE" \
  -H "Content-Type: application/json" \
  -d '{"source":"Hello, World!"}' \
  -o preview.pdf
```

### Check Usage
```bash
curl http://localhost:3000/v1/usage \
  -H "X-API-Key: docu_live_YOUR_KEY_HERE" | jq
```

### Health
```bash
curl http://localhost:3000/health | jq
```