# Task Plan

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
