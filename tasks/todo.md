# Task Plan

## KAN-65 / KAN-66 / KAN-67 Plan (2026-06-16)

- [x] Read Jira requirements for KAN-65, KAN-66, and KAN-67.
- [x] Fetch and audit local/remote branches for existing KAN-65/66/67 or Claude work.
- [x] Preserve and account for existing uncommitted Claude template/design changes.
- [x] KAN-65: add engine `/render` image output and refactor API image render paths to use it.
- [x] KAN-66: improve blog structure with reusable code/code-group components and inline playground/rendered preview.
- [x] KAN-67: add active navbar underline behavior for nav routes, excluding individual blog posts.
- [x] Add focused regression coverage and run quality gates.
- [ ] Update Jira statuses/comments after verification.

## Local Redis + Email Logo Hardening Plan (2026-03-09)

- [x] Ensure local development boot flow provisions Redis reliably (compose + make target wiring).
- [x] Expose/document explicit local Redis config (`REDIS_URL`) in API env templates.
- [x] Add DocuForge logo block to transactional email HTML shell used by all templates.
- [x] Add/adjust regression tests for branded logo presence in generated email HTML.
- [x] Run targeted verification for email template rendering.
- [x] Document review outcomes in this file.

## Local Redis + Email Logo Hardening Review (2026-03-09)

- Added missing root-level Redis service to `docker-compose.yml` (persistent volume, healthcheck, host port `6379`).
- Updated `Makefile` local workflow:
  - `make env` now seeds both `api/.env` and `mcp-server/.env` when missing.
  - Added `make dev-redis` target (`docker compose up -d redis`).
  - `make dev` now depends on `dev-redis` so Redis is started automatically.
- Added explicit Redis configuration in env templates:
  - `api/.env`, `api/.env.example`, `api/.env.stag`, `api/.env.prod`.
- Branded transactional email HTML now includes the DocuForge logo image block in shared OTP + standard template shells (`api/src/services/email-templates.ts`).
- Added regression assertion for logo presence in generated HTML (`api/tests/unit/email-templates.test.ts`).
- Verification:
  - `cd api && bun test tests/unit/email-templates.test.ts` (pass)
  - `make env && docker compose config` (pass)
  - `make dev-redis` (pass; skips compose startup cleanly when local Redis is already listening)
  - `cd api && bun run email:test:matrix -- --dry-run --to=abdullah.baig416@gmail.com --locales=en --templates=email_verification` (pass)

## Config Consolidation + Plan Request Limits Plan (2026-03-08)

- [x] Add `api/src/config/config.ts` with typed default objects for plan quotas and per-plan request rate limits.
- [x] Refactor `api/src/config/env.ts` to consume defaults from `config.ts` for plan quota defaults instead of hardcoded literals.
- [x] Refactor `api/src/middleware/rate-limit.ts` to consume per-plan request limits from `config.ts` (remove hardcoded inline limiter map).
- [x] Add focused unit coverage for new config defaults and rate-limit wiring.
- [x] Reduce `.env` clutter by removing non-secret default limit knobs that now live in `config.ts`.
- [x] Run targeted API tests and document verification + review notes.

## Config Consolidation + Plan Request Limits Review (2026-03-08)

- Added centralized typed defaults in `api/src/config/config.ts` for:
  - monthly render quotas per plan
  - monthly AI credit quotas per plan
  - per-plan request-rate limits (`render`, `preview`, `ai`, `default`)
  - console session/auth mutation rate-limit windows and thresholds
- Refactored `api/src/config/env.ts` to use `config.ts` defaults for plan quotas and upload size, reducing literal sprawl in env schema.
- Refactored `api/src/middleware/rate-limit.ts` to consume plan request limits from `config.ts` and removed hardcoded inline limit tables.
- Added reusable AI quota accessor in env (`getPlanAiCreditLimit`) and wired `api/src/services/ai-usage.ts` to it.
- Added regression coverage:
  - `api/tests/unit/config.test.ts`
  - `api/tests/unit/rate-limit.test.ts` now validates configured limits via config accessors
  - `api/tests/unit/env-runtime.test.ts` now verifies AI quota reload + lookup
- Reduced `.env` noise:
  - removed default plan quota lines from `api/.env`, `api/.env.stag`, and `api/.env.prod`
  - converted plan quota lines in `api/.env.example` to optional commented overrides
- Verification:
  - `cd api && bun test tests/unit/config.test.ts tests/unit/rate-limit.test.ts tests/unit/env-runtime.test.ts` (pass)

## UX-Safe Abuse Protection + Resend Quota Plan (2026-03-07)

- [x] Remove hard user-facing rate-limiter middleware from cookie-session frontend routes (`/console/*` auth/templates/preview/AI paths).
- [x] Add non-UX-blocking abuse controls on auth mutation routes (monitoring, suspicious jitter, hard block only for extreme bursts).
- [x] Keep consumer API render plan nudging limits and attach upgrade metadata in 429 responses.
- [x] Shield Resend free-plan/provider quotas internally with bounded retries/backoff and generic failure behavior.
- [x] Update resend challenge contract to return `200` with `sent: boolean` so cooldown/max-sends do not surface as user-facing errors.
- [x] Wire sender-address profile mapping and locale-aware templates across auth + billing email flows.
- [x] Add/adjust API/frontend regression coverage and verify matrix template command output.

## UX-Safe Abuse Protection + Resend Quota Review (2026-03-07)

- Console cookie UX paths no longer hit hard throttling middleware; normal dashboard/auth user flows are no longer blocked by routine 429s.
- Added `consoleAuthAbuseProtection` on sensitive auth POST endpoints with Redis-backed counters and local fallback:
  - monitor-only logging at low anomaly thresholds
  - delay jitter for suspicious spikes
  - `403` block only for extreme abusive bursts
- Consumer render rate limits remain for plan nudging and now return structured upgrade metadata:
  - `scope`, `current_plan`, `suggested_plan`, `upgrade_url`
- Resend delivery path now handles provider/free-plan limits internally:
  - per-second/per-minute/per-day quota windows
  - retry/backoff + jitter for transient failures and 429/5xx provider responses
  - generic final error on exhaustion to avoid leaking provider details
- Auth resend endpoints (`/console/auth/resend-verification`, `/console/auth/2fa/resend`) now return `200` with `sent: boolean` and timing fields, even during cooldown/maxed states.
- Frontend auth forms now respect resend cooldown timers and only show success copy when `sent === true`.
- Added template sender map + locale template matrix script (`api/scripts/send-email-template-matrix.ts`) and verified dry-run coverage across all locales/templates.
- Verification completed:
  - `cd api && npm test -- --runInBand tests/unit/rate-limit.test.ts tests/unit/abuse-protection.test.ts tests/unit/email-locale.test.ts tests/unit/email-sender.test.ts tests/unit/email-templates.test.ts` (pass)
  - `cd api && npm test -- tests/integration/auth-security.test.ts tests/integration/auth-login.test.ts tests/integration/console-consumer-split.test.ts tests/integration/auth-oauth.test.ts tests/integration/billing-checkout.test.ts` (pass)
  - `cd frontend && npx vitest run tests/unit/api.test.ts tests/integration/auth-security-flow.test.tsx` (pass)
  - `cd api && npm run email:test:matrix -- --dry-run --to=abdullah.baig416@gmail.com` (pass)

## Resend Email Templates + Auth Locale Wiring Plan (2026-03-05)

- [x] Add API email locale resolver (`x-docuforge-locale` -> cookie -> `Accept-Language` -> `en` fallback).
- [x] Add branded, localized OTP email template renderer for signup verification and login 2FA.
- [x] Wire auth routes to send template-based `subject + text + html` for all verification/resend flows.
- [x] Add API unit/integration tests for locale resolution, email rendering, and HTML payload presence.
- [x] Update frontend auth flows to keep resend cooldown behavior functional for login and register.
- [x] Move auth challenge/resend labels and error/status copy to i18n keys across all supported locales.
- [x] Run targeted verification and document results in review notes.

## Resend Email Templates + Auth Locale Wiring Review (2026-03-05)

- Added API locale resolution utility with explicit precedence: `x-docuforge-locale` -> `docuforge-locale` cookie -> `Accept-Language` -> `en`.
- Added centralized localized OTP email renderer returning `subject + text + html` for:
  - signup email verification
  - login 2FA verification
- Enabled Resend runtime usage in local/staging/production env files by setting `EMAIL_PROVIDER=resend` and explicit `EMAIL_FROM`.
- Updated auth routes to call template renderer for register/login resend flows so all transactional auth OTP emails now share one design system-compliant template path.
- Added API coverage:
  - `api/tests/unit/email-locale.test.ts`
  - `api/tests/unit/email-templates.test.ts`
  - `api/tests/integration/auth-security.test.ts` assertions for HTML + locale-aware rendering
- Updated frontend auth UX:
  - cooldown timer enforcement for register resend (login already had cooldown)
  - i18n keys for challenge/resend/error/status labels across all supported locales
  - locale propagation header on API requests (`X-Docuforge-Locale`)
- Verification:
  - `cd api && bun test tests/unit/email-locale.test.ts tests/unit/email-templates.test.ts tests/integration/auth-security.test.ts` (pass)
  - `cd frontend && bun run test:run tests/integration/auth-security-flow.test.tsx` (pass)
  - `cd frontend && ./node_modules/.bin/eslint src/components/auth/LoginForm.tsx src/components/auth/RegisterForm.tsx src/lib/i18n.tsx src/lib/api.ts tests/integration/auth-security-flow.test.tsx` (pass)
  - `cd frontend && bun run lint` fails due pre-existing/generated `.open-next` artifacts not introduced by this change.

## Consumer Docs + Refresh Hardening Plan (2026-03-05)

- [x] Remove console-only/auth-session endpoints from public API docs output and keep docs focused on consumer API usage.
- [x] Fix refresh rotation race so a single refresh token can only be rotated once under concurrency.
- [x] Add active refresh-token cleanup execution and prune policy for expired and stale revoked rows.
- [x] Add regression tests for concurrency rotation and refresh-token pruning semantics.
- [x] Re-run focused verification for touched API/frontend paths.

## Console vs Consumer API Split Plan (Current)

- [x] Update API routing to hard-split dashboard (`/console/*`) and consumer (`/v1/*`) surfaces.
- [x] Enforce cookie-only auth for `/console/*` and reject bearer/API-key auth on console routes.
- [x] Ensure all token-issuing auth flows set HttpOnly session cookie consistently.
- [x] Add balanced strict console rate limits (session-wide + auth-mutation specific).
- [x] Add explicit route-boundary guards for mixed routers (`render`, `billing`).
- [x] Update frontend API compatibility mapping and direct auth fetch paths to `/console/*`.
- [x] Update backend/frontend tests and add regressions for split, cookie-only auth, and rate limits.
- [x] Run quality gates (targeted + full test suites, lint) and perform final review pass.

## Console vs Consumer API Split Review (Current)

- API boundary is now hard-cut: dashboard endpoints are mounted under `/console/*`; consumer endpoints remain under `/v1/*`. Legacy `/v1/auth/*`, `/v1/templates`, and `/v1/render/preview*` now return `404`.
- Console auth is cookie-session only: `/console/*` rejects bearer/API-key-only auth and requires a valid `HttpOnly` session cookie.
- Session cookie issuance is normalized for auth flows including `/console/auth/verify-email` and `/console/auth/2fa/verify`.
- Added strict console rate limits:
  - `consoleSessionRateLimit`: `120/min` keyed by session cookie hash with IP fallback.
  - `consoleAuthMutationRateLimit`: `12/5min` keyed by auth fingerprint (`ip + device fingerprint`).
- Frontend compatibility kept with central `/v1/* -> /console/*` remap for dashboard APIs in `frontend/src/lib/api.ts`, plus direct path updates for OAuth/logout callsites.
- Added/updated regressions for boundary split, cookie-only enforcement, cookie issuance, and limiter behavior.
- Verification completed:
  - API targeted suites: `bun test tests/unit/auth-middleware.test.ts tests/unit/rate-limit.test.ts ...` (pass).
  - API full suite: `bun test` (pass: `355 pass, 5 skip, 0 fail`).
  - Frontend lint: `bun run lint` (pass).
  - Frontend full tests: `bun run test:run` (pass: `82 files, 292 tests`).

- [x] Phase 1: Implement a custom workflow-landscape hero on landing page (`frontend/src/app/home-client.tsx`) aligned to DocuForge's template-to-PDF workflow.
- [x] Phase 2: Tune Phosphor icon consistency globally (size/weight/stroke behavior) across frontend.
- [x] Phase 3: Run eslint/test suites, fix failures, and add targeted assertions/tests where they improve correctness.
- [x] Phase 4: Review backend/frontend/engine for bottlenecks and edge cases with emphasis on queue logic; implement refinements.
- [x] Phase 5: Re-run verification and summarize findings/results.

# Review

- Landing hero now uses a DocuForge-specific workflow landscape (template source -> render queue -> PDF output) with layered motion/shape treatment.
- Phosphor icon consistency is now global via `IconContext.Provider` defaults and shared `.phosphor-icon` styling.
- Frontend lint is clean; frontend Vitest suite is fully passing.
- API validation and routing now correctly support `low_code_spec` workflows across template create/publish and render preview.
- API database schema and test migrations now persist `low_code_spec` in `template_versions` (fixed multiple integration/e2e failures).
- Render queue logic was hardened with runtime assertions for user/template/idempotency inputs and queue payload shape, plus safer queued PDF decoding.
- Added queue unit coverage for deterministic + guarded idempotency hashing.
- Billing provider switching checks were made explicit (`stripe`/`paddle`/`lemonsqueezy`) and auth metadata update logging is explicit.
- Backend bottleneck improvement: RAG vector-store initialization is now once-per-process to avoid repeated heavy startup work per app instance.
- Verification completed:
  - `frontend`: `bun run lint`, `bun run test:run` (pass)
  - `api`: `bun test tests/unit`, `bun test tests/integration`, `bun test` (pass; pipeline tests skipped by design)
  - `engine`: `cargo test` (pass)

## Follow-up Correction Plan (Brand + Hero + CTA Contrast)

- [x] Restore DocuForge logo usage in marketing header/footer and remove temporary placeholder badge treatment.
- [x] Rework landing hero to a cleaner workflow landscape with the requested moodboard direction (ivory/matcha/celtic blue).
- [x] Fix CTA/button text visibility regressions using shared, contrast-safe button classes.
- [x] Re-run frontend verification (`bun run lint`, `bun run test:run`).

## Follow-up Correction Review

- Header/footer now render a consistent DocuForge lockup component using the brand logo asset and styled wordmark.
- Hero was rebuilt with a product-specific workflow composition and softer matcha-inspired palette while preserving messaging/structure.
- Added reusable `btn-primary`, `btn-secondary`, `btn-light`, and `btn-dark-outline` classes with explicit text color and `-webkit-text-fill-color` to prevent invisible labels.
- Frontend verification remains clean:
  - `bun run lint` passed.
  - `bun run test:run` passed (72 files, 250 tests).

## Follow-up Security + Session Plan

- [x] Add explicit logout controls in authenticated shell surfaces.
- [x] Sanitize all frontend redirect parameters (`login`, `oauth`, callback navigation) to internal paths only.
- [x] Sanitize backend OAuth redirect state and exchange redirect payload.
- [x] Add global API security headers and preserve CORS `Vary: Origin` while appending auth/compression vary keys.
- [x] Add regression tests for redirect sanitization, logout control presence, and security headers.
- [x] Re-run frontend/api verification suites.

## Follow-up Security + Session Review

- Added visible logout action in authenticated UI:
  - `frontend/src/components/layout/TopBar.tsx`
  - `frontend/src/components/layout/MobileNav.tsx`
- Added redirect sanitization utility and applied it across auth entry points:
  - `frontend/src/lib/redirect.ts`
  - `frontend/src/hooks/use-auth.ts`
  - `frontend/src/components/auth/OAuthButtons.tsx`
  - `frontend/src/app/oauth/callback/page.tsx`
- Hardened backend OAuth redirect handling:
  - `api/src/services/oauth.ts` now sanitizes redirect paths before state storage.
  - `api/src/routes/auth.ts` re-sanitizes redirect before returning exchange payload.
- Added API-wide defensive headers and fixed `Vary` header merging:
  - `api/src/app.ts` now sets `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and production HTTPS `Strict-Transport-Security`.
  - `Vary` now preserves existing values (including `Origin`) and appends auth/compression keys.
- Added regression coverage:
  - `frontend/tests/unit/redirect.test.ts`
  - `frontend/tests/component/layout/TopBar.test.tsx`
  - `frontend/tests/unit/security-regressions.test.ts` updates
  - `api/tests/unit/oauth.test.ts` updates
  - `api/tests/unit/security-regressions.test.ts` updates
  - `api/tests/integration/health.test.ts` header assertions
- Verification:
  - Frontend: `bun run lint`, `bun run test:run` passed (75 files, 257 tests).
  - API (targeted security suites): `bun test tests/unit/oauth.test.ts tests/unit/security-regressions.test.ts tests/integration/health.test.ts` passed.

## Follow-up Security Audit Plan (Round 2)

- [x] Harden webhook target validation against localhost/private-network SSRF targets.
- [x] Bound and prune OAuth state memory store to avoid unbounded growth under abandoned flows.
- [x] Enforce trusted browser `Origin` on auth mutation surfaces (`register`, `login`, `oauth/exchange`).
- [x] Add regression tests for the new controls and run the full API test suite.

## Follow-up Security Audit Review (Round 2)

- Added webhook URL guard utility and applied it to webhook create/update:
  - `api/src/lib/webhook-url.ts`
  - `api/src/routes/webhooks.ts`
  - Blocks embedded credentials, localhost/internal hostnames, and private/reserved IPv4/IPv6 ranges.
- Hardened OAuth state storage:
  - `api/src/services/oauth.ts`
  - Added TTL pruning, interval cleanup, and bounded state-store size with oldest-entry eviction.
- Added trusted-origin enforcement for browser auth mutations:
  - `api/src/routes/auth.ts`
  - Rejects cross-origin browser requests on `POST /v1/auth/register`, `POST /v1/auth/login`, and `POST /v1/auth/oauth/exchange`.
- Added/updated tests:
  - `api/tests/unit/webhook-url.test.ts`
  - `api/tests/unit/oauth.test.ts`
  - `api/tests/integration/auth-login.test.ts`
  - `api/tests/integration/auth-register.test.ts`
  - `api/tests/integration/auth-oauth.test.ts`
  - `api/tests/unit/security-regressions.test.ts`
- Verification:
  - Targeted suites passed (`51 pass, 0 fail`).
  - Full API suite passed (`322 pass, 4 skip, 0 fail`).

## Benchmark Module Plan (Competitor Data Pipeline)

- [x] Replace hardcoded benchmark constants with a typed benchmark data module consumed by Home and Compare.
- [x] Add reproducible benchmark runner to measure DocuForge and configured competitor tools and emit normalized JSON.
- [x] Add schema assertions and unit tests to prevent invalid benchmark payloads from rendering.
- [x] Verify lint/test/build and execute a smoke benchmark run.

## Benchmark Module Review

- Added canonical benchmark dataset file:
  - `frontend/src/data/benchmarks/latest.json`
- Added typed benchmark module with runtime assertions and UI-friendly transforms:
  - `frontend/src/lib/benchmark-report.ts`
  - Exposes `getHomeBenchmarkModel()` and `getCompareBenchmarkModel()`.
- Wired benchmark UI sections to module output:
  - `frontend/src/app/home-client.tsx`
  - `frontend/src/app/compare/compare-showcase.tsx`
- Added reproducible benchmark harness and adapter:
  - `frontend/scripts/benchmarks/run-competitor-benchmarks.ts`
  - `frontend/scripts/benchmarks/adapters/puppeteer-worker.mjs`
  - `frontend/scripts/benchmarks/README.md`
  - package scripts: `bench:competitors`, `bench:competitors:strict`.
- Added coverage:
  - `frontend/tests/unit/benchmark-report.test.ts`
- Verification:
  - `frontend` lint passed for touched files.
  - `vitest` passed (`benchmark-report.test.ts`, `content-hub.test.ts`).
  - `next build` passed.
  - Benchmark smoke run passed to temp output (`/tmp/docuforge-bench-smoke.json`) with tool-availability diagnostics.
- Full benchmark run now writes measured `DocuForge + Puppeteer` values into `frontend/src/data/benchmarks/latest.json`; missing tools are explicitly marked unavailable.
- Benchmark harness now builds and runs the release engine binary (`target/release/docuforge-engine`) before measurements to avoid `cargo run` overhead in cold-start numbers.

## Playground Rendering Bug Plan (2026-02-26)

- [x] Confirm root cause and patch preview containment in Playground so iframe paint cannot overlap adjacent sections/footer.
- [x] Add/update component test coverage to lock in bounded preview container behavior.
- [x] Run targeted frontend tests for Playground and document the verification result.

## Playground Rendering Bug Review (2026-02-26)

- Added a hard-clipped preview frame wrapper around the playground PDF iframe using `overflow-hidden`, `isolate`, and `contain: paint` to prevent cross-section paint bleed.
- Added a regression assertion in `frontend/tests/component/PlaygroundClient.test.tsx` that requires the bounded preview frame wrapper to exist.
- Verification: `cd frontend && bun run test:run tests/component/PlaygroundClient.test.tsx` passed (`1 file`, `4 tests`).

## Low-Code -> No-Code Migration Doc Plan (2026-02-26)

- [x] Document current-state constraints in the existing low-code stack and what must remain backward compatible.
- [x] Define target no-code architecture (document model, layout engine, schema/versioning, collaboration, rendering contract).
- [x] Provide a phased rollout plan with milestones, risk controls, and measurable success criteria.
- [x] Add operator-focused verification and rollback strategy for safe migration.

## Low-Code -> No-Code Migration Doc Review (2026-02-26)

- Added blueprint document: `docs/low-code-to-no-code-editor-migration.md`.
- Document covers:
  - Current-state analysis grounded in existing code paths.
  - Target no-code architecture with `NoCodeSpec v2` and compiler pipeline.
  - Multi-phase delivery plan, migration/compatibility policy, and rollout guardrails.
  - Verification strategy (goldens, shadow renders, SLO checks) and rollback controls.
- Verification:
  - Confirmed document file exists and renders with expected sections (`wc -l` + `sed` spot-check).

## Feature Implementation Plan (2026-02-27)

- [x] Add JPEG/PNG image rendering support (API + backend conversion service) with multi-page export support.
- [x] Add editor-side image export UX to request image renders and download single-image or ZIP output.
- [x] Ship no-code integration starters for Make, Bubble, Coda, FlutterFlow, and n8n (render PDF/image actions and webhook-trigger setup docs/artifacts).
- [x] Implement PDF import flow (upload/analyze/create-draft) using converter output + user prompt + in-house LLM/RAG best-effort.
- [x] Add AI-credit metering for PDF import and expose AI usage in usage endpoints/UI.
- [x] Add/expand automated tests for new image rendering and PDF import behaviors.

## Feature Implementation Review (2026-02-27)

- Added image rendering endpoints and conversion pipeline:
  - `POST /v1/render/image`
  - `POST /v1/render/preview/image`
  - service: `api/src/services/image-render.ts` (PNG/JPEG, page selection, ZIP for multi-page).
- Added editor image export UX with configurable format/quality/DPI and direct download handling:
  - `frontend/src/components/editor/ImageExportDialog.tsx`
  - `frontend/src/views/editor/EditorPage.tsx`
  - `frontend/src/hooks/use-render.ts`
- Added no-code integration starters and docs for Make, Bubble, Coda, FlutterFlow, and n8n:
  - `plugins/n8n/*`
  - `plugins/make/*`
  - `plugins/bubble/*`
  - `plugins/coda/*`
  - `plugins/flutterflow/*`
  - `docs/integrations/n8n-make-starters.md`
- Implemented no-OCR PDF import flow using converter output + user prompt + in-house LLM/RAG best effort:
  - analysis/create routes: `api/src/routes/templates.ts`
  - converter ingestion: `api/src/services/pdf-import.ts`
  - AI generation path: `api/src/services/ai.ts`
  - dashboard flow: `frontend/src/components/dashboard/CreateTemplateDialog.tsx`
- Added AI credit metering for PDF import and surfaced usage:
  - `api/src/services/ai-usage.ts`
  - `api/src/routes/billing.ts`
  - `frontend/src/components/dashboard/UsageCard.tsx`
- Added regression/integration coverage:
  - `api/tests/integration/render-image.test.ts`
  - `api/tests/integration/template-import.test.ts`
  - `frontend/tests/component/CreateTemplateDialog.test.tsx`
  - `frontend/tests/component/editor/EditorToolbar.test.tsx`
- Verification:
  - `cd api && bun test tests/integration/render-image.test.ts tests/integration/template-import.test.ts tests/integration/render-preview.test.ts tests/integration/templates-routes.test.ts tests/integration/render-billing-limit.test.ts` (`30 pass, 0 fail`)
  - `cd frontend && bun run test:run tests/integration/editor-render.test.tsx tests/component/editor/EditorToolbar.test.tsx tests/component/CreateTemplateDialog.test.tsx` (`13 pass, 0 fail`)

## Codebase Hardening + KISS Pass (Current)

- [x] Audit API/frontend/engine/mcp hotspots for security, bottlenecks, and over-complex paths.
- [x] Remove env access bypasses in auth/error middleware and enforce validated config usage.
- [x] Harden long-lived timers to avoid process pinning (`unref`) in rate limiting and OAuth exchange stores.
- [x] Tighten render queue validation and preserve root-cause errors instead of masking enqueue failures.
- [x] Reduce playground module sprawl by extracting presets/helpers into a dedicated module.
- [x] Run targeted lint/tests for touched areas and verify no behavior regressions.

## Codebase Hardening + KISS Review (Current)

- Security consistency improved in API middleware:
  - `api/src/middleware/auth.ts` now uses validated `env.JWT_EXPIRY`.
  - `api/src/middleware/error-handler.ts` now uses validated `env.NODE_ENV`.
- Runtime hygiene improved:
  - `api/src/middleware/rate-limit.ts` cleanup timer now calls `unref()`.
  - `api/src/services/oauth-exchange.ts` cleanup timer now calls `unref()`.
- Queue path hardened:
  - `api/src/services/render-queue.ts` now validates `templateId` before enqueue.
  - enqueue race fallback preserves original error if no duplicate job is found.
- Public preview trace ID generation moved from `Math.random()` to `randomUUID()`:
  - `api/src/routes/render.ts`.
- Complexity reduced in playground:
  - extracted preset data + low-code helpers into `frontend/src/app/playground/playground-presets.ts`.
  - `frontend/src/app/playground/playground-client.tsx` now focuses on orchestration/UI behavior.
- Verification:
  - `frontend`: `npm run lint -- src/app/playground/playground-client.tsx src/app/playground/playground-presets.ts` (pass)
  - `api`: `bun test tests/unit/security-regressions.test.ts tests/unit/render-queue.test.ts tests/integration/render-public-preview.test.ts` (pass)

## Repositioning + Moat Messaging Plan (2026-03-01)

- [x] Update landing-page narrative hierarchy to lead with deterministic document infrastructure + synchronous critical-path value.
- [x] Rewrite English landing copy in `frontend/src/lib/i18n.tsx` to demote Typst to a subtle engine detail and elevate Rust/synchronous/value-contract messaging.
- [x] Update landing hardcoded section copy in `frontend/src/app/home-client.tsx` for category framing, defensible proof language, and benchmark context disclosure.
- [x] Update SEO metadata in `frontend/src/lib/marketing-metadata.ts` to remove Typst-first framing across locales.
- [x] Reframe top-level compare showcase copy in `frontend/src/app/compare/compare-showcase.tsx` toward category education (deterministic vs browser-driven pipelines).
- [x] Adjust content-hub compare collection and compare spec subtitles in `frontend/src/lib/content-hub.ts` to align with the new positioning spine.
- [x] Tighten security marketing bullets in `frontend/src/lib/security-mcp-content.ts` to keep claims practical/defensible (no absolute retention guarantees).
- [x] Run targeted frontend verification and capture outcomes.

## Repositioning + Moat Messaging Review (2026-03-01)

- Landing messaging now leads with deterministic document infrastructure and synchronous critical-path outcomes.
- English landing hero/features/workflow/footer copy in `frontend/src/lib/i18n.tsx` is no longer Typst-led; Rust + synchronous + versioned-contract language is now primary.
- Home page hardcoded narrative in `frontend/src/app/home-client.tsx` now:
  - reframes migration section to production-failure framing,
  - includes benchmark scenario + methodology disclosure,
  - keeps Typst mention subtle (`Powered by Typst under the hood.`).
- Landing metadata in `frontend/src/lib/marketing-metadata.ts` now uses deterministic infrastructure framing across locales and removes Typst-native positioning from titles/OG alt.
- Localized landing hero headlines in `frontend/src/lib/i18n.tsx` were updated so top-level pages no longer lead with Typst phrasing.
- Compare index messaging in `frontend/src/app/compare/compare-showcase.tsx` now uses category education framing instead of competitor-forward headline language.
- Content-hub compare descriptors in `frontend/src/lib/content-hub.ts` now align with deterministic-pipeline positioning.
- Security value bullets in `frontend/src/lib/security-mcp-content.ts` were tightened to practical, defensible claims.
- Verification:
  - `cd frontend && bun run lint src/app/home-client.tsx src/lib/i18n.tsx src/lib/marketing-metadata.ts src/app/compare/compare-showcase.tsx src/lib/content-hub.ts src/lib/security-mcp-content.ts src/lib/benchmark-report.ts` (pass)
  - `cd frontend && bun run test:run tests/unit/benchmark-report.test.ts tests/unit/content-hub.test.ts` (pass)
  - `cd frontend && bun run build` (pass)

## Post-Implementation Quality + Test Expansion + Review Plan (2026-03-01)

- [x] Add comprehensive regression tests for new positioning metadata/copy/model behavior.
- [x] Run expanded frontend quality gates (lint + targeted tests + full frontend test suite + build).
- [x] Perform code review pass on all newly implemented positioning changes and document findings.

## Post-Implementation Quality + Test Expansion + Review (2026-03-01)

- Added regression coverage:
  - `frontend/tests/unit/marketing-metadata.test.ts` (new): validates deterministic-infrastructure framing across locales and reality-based English metadata claims.
  - `frontend/tests/unit/i18n.test.tsx` updates: validates English critical-path hero headline and ensures localized hero headlines do not lead with Typst wording.
  - `frontend/tests/unit/content-hub.test.ts` updates: validates compare collection/category messaging is deterministic-pipeline-first.
  - `frontend/tests/unit/benchmark-report.test.ts` updates: validates benchmark scenario + methodology fields exposed by home benchmark model.
- Quality gates executed:
  - `cd frontend && bun run lint` (pass)
  - `cd frontend && bun run test:run tests/unit/marketing-metadata.test.ts tests/unit/i18n.test.tsx tests/unit/content-hub.test.ts tests/unit/benchmark-report.test.ts` (pass)
  - `cd frontend && bun run build` (pass)
  - `cd frontend && bun run test:run` (fails in existing Playground tests: `tests/component/PlaygroundClient.test.tsx`, 2 failures)
- Code review findings captured in delivery notes with severity ordering:
  - P1: full frontend suite is currently red due two existing `PlaygroundClient` test failures (`tests/component/PlaygroundClient.test.tsx`).
  - P2: non-English landing copy still carries Typst-heavy subtitle/engine-stat language even though headlines were updated to deterministic-infrastructure framing (`frontend/src/lib/i18n.tsx`).

## Localization + Playground Stability Plan (2026-03-01, Follow-up)

- [x] Normalize non-English landing subtitle/body copy (hero/features/workflow/cta/footer) to match deterministic-infrastructure positioning while keeping Typst as an engine detail.
- [x] Fix the two failing Playground component tests so full frontend suite is green.
- [x] Add/extend regression tests for localization narrative guardrails.
- [x] Re-run full frontend quality gates (`lint`, full `test:run`, `build`) and record outcomes.

## Localization + Playground Stability Review (2026-03-01, Follow-up)

- Updated non-English landing narrative blocks in `frontend/src/lib/i18n.tsx` for `fr`, `de`, `it`, `es`, `ar`, and `zh`:
  - Hero subtitle now leads with synchronous production rendering + versioned contracts + practical controls.
  - Hero engine body keeps a single subtle Typst-under-the-hood mention.
  - Features/workflow/CTA/footer copy now matches deterministic infrastructure framing and no longer leads with Typst.
- Hardened Playground tests to remove flaky network assumptions:
  - `frontend/tests/component/PlaygroundClient.test.tsx` now uses deterministic `fetch` mocks scoped to public preview/session paths.
  - Restored passing assertions for preview iframe render and low-code block mutation payload flow.
- Expanded localization regression coverage:
  - `frontend/tests/unit/i18n.test.tsx` now verifies non-English landing copy keeps Typst only in engine detail while hero/feature/workflow/footer lead narrative stays Typst-free.
- Verification:
  - `cd frontend && bun run lint` (pass)
  - `cd frontend && bun run test:run` (pass: `81 files`, `287 tests`)
  - `cd frontend && bun run build` (pass)

## Refresh Token Auth Plan (2026-03-05)

- [x] Add backend refresh-token persistence + rotation support (schema, migrations, service helpers).
- [x] Issue refresh tokens on successful auth flows, add `POST /auth/refresh`, and revoke refresh token on logout.
- [x] Set authenticated browser session target to 3 days via refresh-token TTL config.
- [x] Add frontend auto-refresh behavior (retry once on 401, keep auth store synchronized, avoid refresh loops).
- [x] Add/adjust API + frontend auth typings/tests for refresh flow and cookie behavior.
- [x] Run focused verification and document review results.

## Refresh Token Auth Review (2026-03-05)

- Added persistent refresh-session storage with hashed tokens and rotation metadata:
  - `api/src/db/schema.ts`
  - `api/src/db/migrate.ts`
  - `api/src/db/client.ts`
  - `api/src/services/refresh-token.ts`
- Auth flow now issues refresh tokens on successful login/session creation and rotates them on refresh:
  - `api/src/routes/auth.ts`
  - `api/src/middleware/auth.ts`
  - `api/src/config/env.ts`
- Browser session target is now explicitly 3 days via `AUTH_REFRESH_TOKEN_MAX_AGE_SECONDS` default (`259200`).
- Frontend API client now auto-refreshes once on 401 and retries the original request once:
  - `frontend/src/lib/api.ts`
- Test coverage updated:
  - New integration suite: `api/tests/integration/auth-refresh.test.ts`
  - Updated integration suites: `api/tests/integration/auth-login.test.ts`, `api/tests/integration/auth-oauth.test.ts`
  - Updated frontend unit suite: `frontend/tests/unit/api.test.ts`
- Verification:
  - `cd api && bun test tests/integration/auth-login.test.ts tests/integration/auth-refresh.test.ts tests/integration/auth-security.test.ts tests/integration/auth-oauth.test.ts` (pass)
  - `cd api && bun test tests/unit/security-regressions.test.ts` (pass)
  - `cd frontend && bun run test:run tests/unit/api.test.ts` (pass)
  - `cd frontend && bun run lint src/lib/api.ts tests/unit/api.test.ts` (pass)

## Repo-Wide Assertion Hardening Plan (2026-03-05)

- [x] Persist assertion policy updates in `AGENTS.md` and keep this plan section current.
- [x] Add assertion helper modules in `api`, `frontend`, `mcp-server`, `engine`, and `load-test`.
- [x] Refactor assertion hotspots (non-null assertions, unsafe casts, panic-style runtime paths) in scope files.
- [x] Add centralized assertion policy checker and wire `make assertions-check`.
- [x] Add/adjust CI workflows for core stacks to enforce assertion policy + lint/type/test gates.
- [x] Add regression tests for assertion helper behavior and refactored invariant paths.
- [x] Run verification gates:
  - [x] `make assertions-check`
  - [x] `cd api && bun test`
  - [x] `cd frontend && bun run lint && bun run test:run`
  - [x] `cd mcp-server && bun run typecheck && bun test`
  - [x] `cd engine && cargo clippy --lib --bins -- -D warnings -D clippy::unwrap_used -D clippy::expect_used -D clippy::panic && cargo test`

## Repo-Wide Assertion Hardening Review (2026-03-05)

- Before/after violation counts:
  - Before: TS non-null assertions `29`, unsafe TS casts `8`, Rust panic/unwrap/expect hotspots in production paths.
  - After: TS non-null assertions `0`, `as any` `0`, `as unknown as` `0`, Rust `panic!/unwrap/expect` policy violations `0` in enforced runtime/source scope.
- Files touched by category:
  - Assertion helpers:
    - `api/src/lib/assert.ts`
    - `frontend/src/lib/assert.ts`
    - `mcp-server/src/lib/assert.ts`
    - `engine/src/assertions.rs` (+ `engine/src/lib.rs`)
    - `load-test/lib/assert.mjs`
  - Runtime refactors:
    - API: `api/src/services/template.ts`, `api/src/routes/assets.ts`, `api/src/middleware/rate-limit.ts`, `api/src/middleware/auth.ts`, `api/src/middleware/error-handler.ts`, `api/src/lib/low-code.ts`, `api/src/services/image-render.ts`, `api/src/services/pdf-import.ts`
    - Frontend: `frontend/src/lib/benchmark-report.ts`, `frontend/src/stores/editor.ts`, `frontend/src/lib/template-fields.ts`, `frontend/src/lib/low-code.ts`, auth-form and editor hotspots
    - MCP: `mcp-server/src/mcp/server.ts`, `mcp-server/src/index.ts`, `mcp-server/src/services/docuforge-client.ts`
    - Engine: `engine/src/main.rs`, `engine/src/cache/asset_cache.rs`, `engine/src/cache/template_cache.rs`, `engine/src/engine/compiler.rs`
    - Load-test: `load-test/lib/config.mjs`, `load-test/lib/summary-to-benchmark.mjs`, `load-test/scripts/export-benchmark-report.mjs`
  - Enforcement/CI:
    - `scripts/assertions-check.mjs`
    - `Makefile` (`assertions-check` target)
    - `.github/workflows/core-assertions.yml`
    - `frontend/eslint.config.mjs` (strict runtime rules)
  - Tests:
    - `api/tests/unit/assert.test.ts`, `frontend/tests/unit/assert.test.ts`, `mcp-server/tests/unit/assert.test.ts`, `load-test/tests/assert.test.ts`
    - assertion-related integration/e2e updates in API auth/rate-limit/render/import flows
- Verification outcomes:
  - `make assertions-check` -> pass (`assertions-check: ok`)
  - `cd api && bun test` -> pass (`355 pass, 5 skip, 0 fail`)
  - `cd frontend && bun run lint && bun run test:run` -> pass (`82 files, 292 tests`)
  - `cd mcp-server && bun run typecheck && bun test` -> pass (`19 tests`)
  - `cd engine && cargo clippy --lib --bins -- -D warnings -D clippy::unwrap_used -D clippy::expect_used -D clippy::panic && cargo test` -> pass
  - Additional: `cd load-test && bun test` -> pass (`12 tests`)
- Residual risks:
  - Assertion policy checker is regex-based; keep CI + review discipline for edge syntactic forms that may evade pattern checks.
  - Test-environment fallbacks were added for missing native PDF/image tooling; production behavior remains strict and should still be validated in deployment environments with toolchain parity.

## Consumer Docs + Refresh Hardening Review (2026-03-05)

- Public docs page no longer advertises login/register or console-only dashboard endpoints.
  - Updated `frontend/src/app/docs/page.tsx` to:
    - filter sidebar navigation to consumer-facing sections;
    - replace auth snippet with API-key-only usage;
    - remove templates/assets/ai/usage endpoint sections from rendering;
    - switch quick-start snippet to `POST /v1/render`;
    - replace 401 messaging with API-key wording.
- Refresh token rotation is now atomic and race-safe:
  - `api/src/services/refresh-token.ts`
  - Rotation now uses a transaction with conditional `UPDATE ... RETURNING` and only inserts a successor token when one source token row was successfully revoked.
- Refresh-token cleanup now runs actively and prunes both categories:
  - `api/src/services/refresh-token.ts`
  - Prunes expired tokens and stale revoked tokens via throttled opportunistic cleanup triggered on issue/rotate/revoke operations.
- Added regressions:
  - `api/tests/integration/auth-refresh.test.ts`: concurrent refresh requests now assert only one succeeds.
  - `api/tests/unit/refresh-token.test.ts`: validates expired + stale revoked pruning behavior.
- Verification:
  - `cd api && bun test tests/integration/auth-refresh.test.ts tests/unit/refresh-token.test.ts`
  - `cd frontend && bun run test:run tests/unit/api.test.ts`

## Transactional Email Sender Matrix + Template Sweep Plan (2026-03-06)

- [x] Expand API transactional templates to cover OTP, welcome, billing lifecycle, and support acknowledgement across all supported locales.
- [x] Enforce sender-profile routing (`noreply`, `hello`, `billing`, `support`) across auth and billing flows.
- [x] Add a matrix test-send command to deliver every template in every locale to a target inbox for visual QA.
- [x] Update frontend contact surfaces to map users to the correct inboxes for support, hello, and billing flows.
- [x] Add/refresh unit+integration tests for template rendering and route-triggered emails.
- [x] Run targeted verification and document outcomes.

## Transactional Email Sender Matrix + Template Sweep Review (2026-03-06)

- Expanded API transactional template catalog and branded renderers:
  - `api/src/services/email-templates.ts`
  - Added localized templates for `email_verification`, `login_2fa`, `welcome_first_message`, `billing_subscription_started`, `billing_plan_changed`, `billing_subscription_canceled`, `support_acknowledgement`.
- Added sender-profile routing by template:
  - `api/src/services/email-sender.ts`
  - Template-to-sender map now enforces: `noreply`, `hello`, `billing`, `support`.
- Wired auth flows:
  - `api/src/routes/auth.ts`
  - OTP emails send from `noreply`.
  - Welcome email sends from `hello` on:
    - direct registration when verification is disabled,
    - first successful email verification,
    - first-time OAuth user creation.
- Wired billing flows:
  - `api/src/routes/billing.ts`
  - `checkout.session.completed` -> subscription-started email from `billing`.
  - `customer.subscription.updated` -> plan-change email from `billing` (when paid->paid plan changes).
  - `customer.subscription.deleted` -> cancellation email from `billing`.
  - Checkout now stores locale in Stripe metadata so billing email locale can be resolved.
- Added one-command matrix sender:
  - `api/scripts/send-email-template-matrix.ts`
  - `api/package.json` script: `email:test:matrix`
  - Supports `--to`, `--locales`, `--templates`, `--dry-run`.
- Updated env/setup sender vars:
  - `api/.env`, `api/.env.prod`, `api/.env.stag`, `api/.env.example`, `api/src/config/env.ts`, `api/tests/setup.ts`.
- Updated frontend contact surfaces:
  - `frontend/src/app/privacy/page.tsx` -> `support@docuforge.app`
  - `frontend/src/app/terms/page.tsx` -> `support@docuforge.app`
  - `frontend/src/app/content-policy/page.tsx` -> `support@docuforge.app`
  - `frontend/src/components/settings/PlanSection.tsx` adds billing contact `billing@docuforge.app`.
- Added/updated tests:
  - `api/tests/unit/email-templates.test.ts`
  - `api/tests/unit/email-sender.test.ts`
  - `api/tests/integration/auth-security.test.ts`
  - `api/tests/integration/auth-oauth.test.ts`
  - `api/tests/integration/billing-checkout.test.ts`
  - `frontend/tests/component/PlanSection.test.tsx`
- Verification:
  - `cd api && bun test tests/unit/email-locale.test.ts tests/unit/email-templates.test.ts tests/unit/email-sender.test.ts tests/integration/auth-security.test.ts tests/integration/auth-oauth.test.ts tests/integration/billing-checkout.test.ts` (pass)
  - `cd frontend && bun run test:run tests/component/PlanSection.test.tsx` (pass)
  - `cd api && bun run email:test:matrix -- --dry-run --to=abdullah.baig416@gmail.com` (pass; 49-template matrix preview)

## Single-Droplet Deployment Plan (2026-03-10)

- [x] Inspect production/runtime requirements for `frontend`, `api`, `engine`, and Redis in the current repo.
- [x] Persist the temporary zero-cost single-droplet deployment policy in `AGENTS.md`.
- [x] Capture the deployment-size lesson in `tasks/lessons.md`.
- [x] Prepare repo-specific deployment guidance for one free DigitalOcean droplet with Docker Compose, nginx, and Cloudflare DNS.

## Single-Droplet Deployment Review (2026-03-10)

- Recommended topology for the temporary low-cost phase is five services on one droplet:
  - `nginx` on 80/443
  - `frontend` on 5173
  - `api` on 3000
  - `engine` on 3001
  - `redis` on 6379
- The repo already supports this direction with:
  - `frontend/Dockerfile`
  - `api/Dockerfile`
  - `engine/docker/Dockerfile`
  - root `docker-compose.yml`
  - `DOCKER-RUNBOOK.md` production nginx/compose guidance
- Queue/workers do not need separate processes on the droplet for this phase:
  - keep `RENDER_QUEUE_AUTO_START_WORKER=true` in the API process
  - keep Redis enabled because render/webhook queue features are active in this repo
- Domain plan for this phase:
  - `www.docuforge.app` -> nginx -> frontend
  - `api.docuforge.app` -> nginx -> api
  - frontend app/marketing URLs should both use `https://www.docuforge.app`
- Verification basis:
  - inspected runtime/build commands in `frontend/package.json`, `api/package.json`, `engine/Makefile`
  - inspected env requirements in `frontend/.env.example` and `api/.env.example`
  - inspected container topology in root `docker-compose.yml` and `DOCKER-RUNBOOK.md`

## Docker Runbook Remediation Plan (2026-03-10)

- [x] Re-audit `DOCKER-RUNBOOK.md` against the current repo and identify stale vs still-open findings.
- [x] Implement the missing Docker production artifacts (`docker-compose.prod.yml`, `nginx/nginx.conf`) and any missing ignore files.
- [x] Harden existing Dockerfiles/Make targets/compose files to resolve the runbook’s actionable findings.
- [x] Add a concise review index for all relevant Docker setup files and update the runbook to point to the authoritative artifacts.
- [x] Verify the resulting Docker configuration for syntax and consistency, then document the review outcome.

## Docker Runbook Remediation Review (2026-03-10)

- Replaced the stale audit-style `DOCKER-RUNBOOK.md` with an authoritative runbook that:
  - lists the real Docker review index;
  - documents the current dev/prod compose split;
  - records the audit findings as resolved with file-level references;
  - points operators at `docker-compose.prod.yml`, `nginx/nginx.conf`, `.env.prod.example`, and the Docker CI workflow.
- Added the missing production deployment artifacts:
  - `docker-compose.prod.yml`
  - `nginx/nginx.conf`
  - `nginx/ssl/.gitkeep`
  - `.env.prod.example`
- Hardened container build/runtime files:
  - `frontend/Dockerfile`: non-root runtime, health check, and build-time `NEXT_PUBLIC_*` args/env
  - `api/Dockerfile`: Bun-based health check instead of `curl`
  - `engine/docker/Dockerfile`: stable Rust channel instead of stale fixed 1.75 image
  - `mcp-server/Dockerfile`: multi-stage build, non-root runtime, health check
  - `api/.dockerignore`
  - `mcp-server/.dockerignore`
  - `frontend/.dockerignore`
- Simplified operator entry points:
  - removed `api/docker-compose.yml` to eliminate compose ambiguity
  - updated `Makefile` so `docker-down` is non-destructive and added explicit prod helper targets
  - ignored real `.env.prod` in root `.gitignore`
- Added Docker CI/image tagging:
  - `.github/workflows/docker-images.yml`
  - GHCR tags now cover default-branch `latest`, branch/PR refs, commit SHA, and semver tags
- Verification:
  - `python3` YAML parse for `docker-compose.yml`, `docker-compose.prod.yml`, `.github/workflows/docker-images.yml` -> pass
  - file existence checks for `nginx/nginx.conf`, `docker-compose.prod.yml`, `.env.prod.example`, `api/.dockerignore`, `mcp-server/.dockerignore`, `.github/workflows/docker-images.yml` -> pass
  - `git diff --check` -> pass
  - compose env coverage check: every `${VAR}` in `docker-compose.prod.yml` exists in `.env.prod.example` -> pass
  - `make help` -> pass
- Constraint:
  - Docker/Compose binaries are not installed in this workspace, so I could not run `docker compose config` or container build smoke tests here.

## Docker Runbook Cleanup Plan (2026-03-10)

- [x] Re-check the current Docker files against the old runbook issue list.
- [x] Remove the now-stale audit/issues section from `DOCKER-RUNBOOK.md`.
- [x] Preserve only current-state operator guidance plus validation notes in the runbook.

## Docker Runbook Cleanup Review (2026-03-10)

- Re-audited the current Docker files against the old runbook issue list and found the listed items structurally resolved in repo.
- Removed the `Resolved Audit Findings` section from `DOCKER-RUNBOOK.md` and renumbered the runbook so it now reads as an operator document rather than an audit log.
- Kept the runbook’s current-state review index, deployment commands, and validation checklist so unresolved runtime verification still has a clear place in the docs.
- Additional hardening during this pass:
  - root `.gitignore` now ignores real `nginx/ssl/*` cert material while keeping `nginx/ssl/.gitkeep`
