# DocuForge Launch Guide

Last updated: February 16, 2026

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
ENGINE_PIPELINE_TESTS=1 ENGINE_URL=https://<engine-host> bun test tests/pipeline/engine.integration.test.ts
```

## 3. Deployment runbook

1. Apply DB migrations in production.
2. Deploy API.
3. Deploy frontend.
4. Run smoke tests:
   - Login/Register
   - Open editor
   - Render preview
   - Publish template version
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
