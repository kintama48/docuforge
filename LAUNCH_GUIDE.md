# DocuForge Launch Guide

Last updated: February 17, 2026

## 1. Launch readiness status

Current status: **Ready to launch with one controlled caveat**.

Validated today:
- Frontend production build passes (`bun run build`)
- Frontend tests pass (`222/222`)
- API tests pass (`282 pass, 0 fail`)
- Webhook database schema is now included in startup/test migrations
- OG image routes are fixed for Next.js 16 route-handler typing

Controlled caveat:
- Real-engine pipeline tests are still skipped in default local test runs unless explicitly enabled with `ENGINE_PIPELINE_TESTS=1` and a reachable `ENGINE_URL`.

## 2. Pre-launch checklist (must pass)

Run from repo root in order:

```bash
cd api && bun test
cd ../frontend && bun run test:run
cd ../frontend && bun run build
```

If you want real-engine verification before launch:

```bash
cd api
ENGINE_PIPELINE_TESTS=1 ENGINE_URL=https://<engine-host> bun test tests/integration/render-engine-pipeline.test.ts
```

## 3. Deployment runbook

1. Apply DB migrations in production.
2. Start Redis on the API instance (`redis://127.0.0.1:6379`).
3. Deploy API.
4. If `RENDER_QUEUE_AUTO_START_WORKER=false`, run `cd api && bun run worker` as a separate process.
5. Deploy frontend.
4. Run smoke tests:
   - Login/Register
   - Open editor
   - Render preview
   - Publish template version
   - Queue render job (`POST /v1/render/jobs` with `Idempotency-Key`)
   - Poll queue job (`GET /v1/render/jobs/:jobId`)
   - Download queue PDF (`GET /v1/render/jobs/:jobId/pdf`)
   - Billing webhook path (`/v1/billing/webhook`)

## 4. Launch-day monitoring

Watch for first 60 minutes:
- API 5xx rate and latency
- Render failure rate and timeout errors
- Billing webhook 4xx/5xx
- Frontend runtime errors in browser logs/Sentry

## 5. Rollback criteria and action

Rollback immediately if any occur:
- Sustained API 5xx over normal baseline
- Render endpoint consistently failing for valid templates
- Billing webhook processing broken for new events

Rollback action:
1. Revert API and frontend to last known good release.
2. Keep migrated schema (safe additive changes).
3. Re-run smoke tests on rolled-back version.

## 6. Final go/no-go

Go if:
- Checklist in section 2 is green
- Smoke tests in section 3 pass
- Monitoring in first 15 minutes is stable

If any fail: hold launch and fix before retry.

## 7. Comprehensive QA doc

Use `/Users/abdullah/WebstormProjects/docuforge/QA_CHECKLIST.md` for full test coverage:
- Tick-box QA tables (automated + manual + security + sign-off)
- Full environment variable setup reference for API and frontend
