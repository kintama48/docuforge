# DocuForge Comprehensive QA Checklist

Last updated: February 17, 2026

## 1) How to use this

1. Complete the environment setup section first.
2. Run automated checks.
3. Run each manual test row and tick the checkbox.
4. Fill "Evidence" with a URL, screenshot path, or test run ID.
5. Do not launch until all P0 and P1 rows are checked.

## 2) Environment variables (full setup)

### API env vars (`api/.env`)

| Variable | Required | Example | Notes |
|---|---|---|---|
| `PORT` | No | `3000` | API listen port. |
| `NODE_ENV` | No | `production` | Must be `development`, `production`, or `test`. |
| `APP_URL` | No | `https://console.docuforge.app` | Console origin for CORS/OAuth redirects. |
| `API_URL` | No | `https://api.docuforge.app` | Public API base URL. |
| `DATABASE_URL` | Yes | `libsql://your-db.turso.io` | Required by env schema. |
| `DATABASE_AUTH_TOKEN` | Depends | `...` | Needed for remote Turso/libSQL auth. |
| `ENGINE_URL` | No | `http://127.0.0.1:3001` | Typst engine base URL. |
| `ENGINE_TIMEOUT_MS` | No | `5000` | Engine request timeout. |
| `REDIS_URL` | No | `redis://127.0.0.1:6379` | Redis URL for render queue. |
| `RENDER_QUEUE_ENABLED` | No | `true` | Enables `/v1/render/jobs` queue endpoints. |
| `RENDER_QUEUE_AUTO_START_WORKER` | No | `true` | Starts worker in API process for single-instance deploys. |
| `RENDER_QUEUE_NAME` | No | `docuforge-render` | Queue name namespace in Redis. |
| `RENDER_QUEUE_CONCURRENCY` | No | `2` | Worker concurrency. |
| `RENDER_QUEUE_ATTEMPTS` | No | `3` | Retry attempts per job. |
| `RENDER_QUEUE_BACKOFF_MS` | No | `2000` | Exponential retry base delay. |
| `RENDER_QUEUE_RESULT_TTL_SECONDS` | No | `3600` | Result retention window for polling/PDF fetch. |
| `R2_ENDPOINT` | Yes | `https://<acct>.r2.cloudflarestorage.com` | Cloudflare R2 endpoint. |
| `R2_ACCESS_KEY_ID` | Yes | `...` | R2 key id. |
| `R2_SECRET_ACCESS_KEY` | Yes | `...` | R2 secret key. |
| `R2_BUCKET` | Yes | `docuforge-assets` | Asset bucket. |
| `R2_PUBLIC_URL` | Yes | `https://assets.docuforge.app` | Public asset URL base. |
| `BILLING_ENABLED` | No | `false` | Turn billing on/off globally. |
| `BILLING_PROVIDER` | No | `none` | `none`, `paddle`, or `lemonsqueezy`. |
| `BILLING_SUCCESS_URL` | No | `https://console.docuforge.app/settings?upgraded=true` | Optional override for post-checkout redirect. |
| `BILLING_CANCEL_URL` | No | `https://console.docuforge.app/settings` | Optional cancel redirect. |
| `PADDLE_API_KEY` | Conditional | `pdl_live_...` | Required if `BILLING_PROVIDER=paddle` and enabled. |
| `PADDLE_API_URL` | No | `https://api.paddle.com` | Paddle API base URL. |
| `PADDLE_WEBHOOK_SECRET` | Conditional | `...` | Required if using Paddle. |
| `PADDLE_PRICE_ID_STARTER` | Conditional | `pri_...` | Required if using Paddle. |
| `PADDLE_PRICE_ID_PRO` | Conditional | `pri_...` | Required if using Paddle. |
| `LEMONSQUEEZY_API_KEY` | Conditional | `...` | Required if `BILLING_PROVIDER=lemonsqueezy` and enabled. |
| `LEMONSQUEEZY_API_URL` | No | `https://api.lemonsqueezy.com/v1` | Lemon Squeezy API base URL. |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Conditional | `...` | Required if using Lemon Squeezy. |
| `LEMONSQUEEZY_STORE_ID` | Conditional | `12345` | Required if using Lemon Squeezy. |
| `LEMONSQUEEZY_VARIANT_ID_STARTER` | Conditional | `12345` | Required if using Lemon Squeezy. |
| `LEMONSQUEEZY_VARIANT_ID_PRO` | Conditional | `67890` | Required if using Lemon Squeezy. |
| `AI_ENABLED` | No | `true` | AI feature toggle. |
| `GEMINI_API_KEY` | Yes | `...` | Required by current env schema. |
| `AI_MODEL` | No | `gemini-2.5-flash` | AI model id. |
| `SENTRY_DSN` | No | `https://...` | API Sentry DSN. |
| `SENTRY_ENVIRONMENT` | No | `production` | API Sentry environment label. |
| `SENTRY_TRACES_SAMPLE_RATE` | No | `0.1` | API traces sample rate (0-1). |
| `JWT_SECRET` | Yes | `>=32 chars` | Must be at least 32 characters. |
| `JWT_EXPIRY` | No | `7d` | JWT duration. |
| `OAUTH_GOOGLE_CLIENT_ID` | Optional | `...` | Required only if Google OAuth is enabled. |
| `OAUTH_GOOGLE_CLIENT_SECRET` | Optional | `...` | Required only if Google OAuth is enabled. |
| `OAUTH_MICROSOFT_CLIENT_ID` | Optional | `...` | Required only if Microsoft OAuth is enabled. |
| `OAUTH_MICROSOFT_CLIENT_SECRET` | Optional | `...` | Required only if Microsoft OAuth is enabled. |
| `OAUTH_GITHUB_CLIENT_ID` | Optional | `...` | Required only if GitHub OAuth is enabled. |
| `OAUTH_GITHUB_CLIENT_SECRET` | Optional | `...` | Required only if GitHub OAuth is enabled. |
| `WEBHOOK_TIMEOUT_MS` | No | `5000` | Outbound webhook timeout. |
| `WEBHOOK_MAX_PER_USER` | No | `10` | Webhook count limit per user. |
| `RAG_ENABLED` | No | `true` | RAG context feature toggle. |
| `RAG_TOP_K` | No | `5` | Number of chunks retrieved. |
| `RAG_EMBEDDING_MODEL` | No | `text-embedding-004` | Embedding model name. |
| `FREE_MONTHLY_LIMIT` | No | `500` | Plan limit. |
| `STARTER_MONTHLY_LIMIT` | No | `10000` | Plan limit. |
| `PRO_MONTHLY_LIMIT` | No | `50000` | Plan limit. |
| `MAX_UPLOAD_SIZE_MB` | No | `10` | Upload size limit. |

### Frontend env vars (`frontend/.env.local`)

| Variable | Required | Example | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | `https://api.docuforge.app` | Frontend API base URL. |
| `NEXT_PUBLIC_BILLING_ENABLED` | No | `false` | Frontend toggle for upgrade/manage UX. |
| `NEXT_PUBLIC_BILLING_PROVIDER` | No | `none` | `none`, `paddle`, or `lemonsqueezy`. |
| `NEXT_PUBLIC_BILLING_PORTAL_URL` | Optional | `https://vendor-portal.example.com` | Enables "Manage billing" button. |
| `NEXT_PUBLIC_APP_NAME` | No | `DocuForge` | UI display name. |
| `NEXT_PUBLIC_APP_URL` | Recommended | `https://console.docuforge.app` | Console base URL. |
| `NEXT_PUBLIC_MARKETING_URL` | Recommended | `https://www.docuforge.app` | Used by middleware/layout host routing. |
| `NEXT_PUBLIC_CONSOLE_URL` | Recommended | `https://console.docuforge.app` | Used by middleware/layout host routing. |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional | `https://...` | Enables frontend Sentry. |
| `VITE_API_URL` | Legacy fallback | `...` | Compatibility fallback in `src/config/env.ts`. |
| `VITE_APP_NAME` | Legacy fallback | `...` | Compatibility fallback. |
| `VITE_APP_URL` | Legacy fallback | `...` | Compatibility fallback. |

### Minimal examples

`api/.env`:

```bash
PORT=3000
NODE_ENV=development
APP_URL=http://localhost:5173
API_URL=http://localhost:3000
DATABASE_URL=file:./local.db
ENGINE_URL=http://127.0.0.1:3001
REDIS_URL=redis://127.0.0.1:6379
RENDER_QUEUE_ENABLED=true
R2_ENDPOINT=https://placeholder.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=placeholder-key
R2_SECRET_ACCESS_KEY=placeholder-secret
R2_BUCKET=docuforge-assets
R2_PUBLIC_URL=https://assets.example.com
BILLING_ENABLED=false
BILLING_PROVIDER=none
PADDLE_API_KEY=
PADDLE_WEBHOOK_SECRET=
PADDLE_PRICE_ID_STARTER=
PADDLE_PRICE_ID_PRO=
LEMONSQUEEZY_API_KEY=
LEMONSQUEEZY_WEBHOOK_SECRET=
LEMONSQUEEZY_STORE_ID=
LEMONSQUEEZY_VARIANT_ID_STARTER=
LEMONSQUEEZY_VARIANT_ID_PRO=
GEMINI_API_KEY=placeholder-gemini-key
JWT_SECRET=development-secret-key-change-in-production-32chars
```

`frontend/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_BILLING_ENABLED=false
NEXT_PUBLIC_BILLING_PROVIDER=none
NEXT_PUBLIC_BILLING_PORTAL_URL=
NEXT_PUBLIC_APP_URL=http://localhost:5173
NEXT_PUBLIC_MARKETING_URL=http://localhost:5173
NEXT_PUBLIC_CONSOLE_URL=http://localhost:5173
```

## 3) Automated QA checklist

| Done | Priority | Check | Command | Expected |
|---|---|---|---|---|
| [ ] | P0 | API unit/integration/e2e | `cd api && bun test` | Pass with `0 fail`. |
| [ ] | P0 | Frontend unit/integration | `cd frontend && bun run test:run` | Pass with `0 fail`. |
| [ ] | P0 | Frontend production build | `cd frontend && bun run build` | Build completes with no TS/runtime errors. |
| [ ] | P1 | Real engine pipeline | `cd api && ENGINE_PIPELINE_TESTS=1 ENGINE_URL=<engine> bun test tests/integration/render-engine-pipeline.test.ts` | Pipeline tests pass against real engine. |

## 4) Manual functional QA checklist

| Done | Priority | Area | Test case | Expected result | Evidence |
|---|---|---|---|---|---|
| [ ] | P0 | Auth | Register with email/password | Account is created, redirected to onboarding/dashboard. | |
| [ ] | P0 | Auth | Login with valid credentials | Session starts, protected routes accessible. | |
| [ ] | P0 | Auth | Login failure path | Invalid creds show safe error message (no stack traces). | |
| [ ] | P0 | Editor | Open an existing template | Editor loads template source/files/defaults correctly. | |
| [ ] | P0 | Editor | Render preview | PDF preview appears and status bar updates duration. | |
| [ ] | P0 | Editor | Publish new version | Version increments and appears in history. | |
| [ ] | P0 | Versioning | Revert to prior version | Selected version content restores and can be rendered. | |
| [ ] | P0 | API keys | Create API key | Key appears and can be copied once in reveal dialog. | |
| [ ] | P0 | API keys | Revoke API key | Key becomes unusable for `/v1/render`. | |
| [ ] | P0 | Billing | Upgrade flow to Starter/Pro | Checkout link opens and subscription state updates on return/webhook. | |
| [ ] | P0 | Render queue | Queue render job with `Idempotency-Key` | `POST /v1/render/jobs` returns `202` with `job_id`. | |
| [ ] | P0 | Render queue | Repeat same idempotency key | Same `job_id` is returned (idempotent behavior). | |
| [ ] | P0 | Render queue | Poll queued job | `GET /v1/render/jobs/:jobId` transitions to `completed` or `failed`. | |
| [ ] | P0 | Render queue | Fetch queued PDF | `GET /v1/render/jobs/:jobId/pdf` returns PDF after completion. | |
| [ ] | P0 | Billing | Billing webhook event | `/v1/billing/webhook` returns success for valid provider signature. | |
| [ ] | P1 | Billing | Invalid webhook signature | Endpoint rejects with 4xx. | |
| [ ] | P1 | Assets | Upload file asset | Asset appears in list and can be inserted in document. | |
| [ ] | P1 | Assets | Delete file asset | Asset disappears and can no longer be resolved. | |
| [ ] | P1 | AI | Prompt rewrite/generate | Response returns and applies to editor content. | |
| [ ] | P1 | AI | Rate-limit messaging | User sees retry/credits messaging when limit is hit. | |
| [ ] | P1 | Localization | Switch locale (`en`, `fr`, `de`, etc.) | Localized routes/text load and locale cookie persists. | |
| [ ] | P1 | SEO/OG | Open `/og/<locale>` routes | OG image endpoints respond successfully. | |
| [ ] | P1 | Routing | Marketing vs console host redirect behavior | Middleware sends correct 308 redirects by host/path. | |
| [ ] | P1 | Settings | Billing portal link button | Opens configured portal or shows "not configured" toast. | |

## 5) Security and regression checklist

| Done | Priority | Check | Expected result | Evidence |
|---|---|---|---|---|
| [ ] | P0 | JWT secret policy | `JWT_SECRET` is set and length >= 32 chars. | |
| [ ] | P0 | CORS origins | API only allows configured app origins in production. | |
| [ ] | P0 | Secrets hygiene | No secrets committed; no placeholders in production env. | |
| [ ] | P1 | Error handling | Production errors hide internals in client responses. | |
| [ ] | P1 | Rate limiting | Render endpoints enforce limits and return structured 402/429 responses. | |
| [ ] | P1 | Upload limits | Files over `MAX_UPLOAD_SIZE_MB` are rejected cleanly. | |

## 6) Launch sign-off

| Done | Owner | Gate | Notes |
|---|---|---|---|
| [ ] | Engineering | All P0 checks complete | |
| [ ] | Product | Critical user journeys approved | |
| [ ] | Ops | Monitoring and alerts armed | |
| [ ] | Engineering | Rollback command/version verified | |
| [ ] | Team | Go/No-Go decision recorded | |
