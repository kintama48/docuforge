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
