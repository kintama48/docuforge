# Low-Code to No-Code PDF Editor Migration Blueprint

Last updated: February 26, 2026

## 1) Goal

Move DocuForge from a block-config low-code experience to a true no-code visual PDF editor without breaking existing templates, render APIs, or production reliability.

## 2) Current State (as implemented)

Today, the platform has a solid low-code foundation:
- `low_code_spec` exists and is validated in backend/frontend schemas.
- Low-code compiles to Typst (`compileLowCodeSpec`) before rendering.
- Render endpoints accept either `source` (Typst) or `low_code_spec`.
- Template versions persist `low_code_spec` and source versions.
- Editor mode is currently `code` or `low-code`.

Representative code paths:
- `api/src/lib/low-code.ts`
- `api/src/routes/render.ts`
- `api/src/services/template.ts`
- `frontend/src/lib/low-code.ts`
- `frontend/src/views/editor/EditorPage.tsx`
- `frontend/src/components/editor/LowCodeBlocksEditor.tsx`

## 3) What "No-Code" Means for DocuForge

A no-code editor for this product should let users:
- Design document structure visually (canvas/layout), not by typing JSON or Typst.
- Bind fields with UI pickers, not manual `{{path}}` entry.
- Control typography/colors/spacing from inspector panels.
- Manage repeating sections (tables/lists) from UI controls.
- Preview final PDF fidelity in near real time.

No-code does not mean removing code mode. Advanced Typst mode should remain available.

## 4) Migration Principles

- Backward compatible first: existing Typst + low-code templates keep working.
- Single render contract: final render still flows through current engine contract.
- Incremental rollout: introduce capabilities behind feature flags.
- Deterministic output: same spec + data must always produce same PDF.
- Safe failure: every migration step needs fallback to existing low-code/code paths.

## 5) Target Architecture

### 5.1 Canonical document model

Introduce `NoCodeSpec v2` as canonical UI state for visual editing.

Suggested shape (high level):
- `meta`: page size, margins, defaults.
- `theme`: type scale, color tokens, spacing scale.
- `layout`: sections/frames with positioning rules.
- `elements`: text, image, table, divider, badge, signature, etc.
- `bindings`: structured data bindings with typed selectors.
- `rules`: visibility/formatting conditions.

### 5.2 Intermediate representation and compiler

Compilation pipeline:
1. `NoCodeSpec v2` -> `Render IR` (normalized layout tree)
2. `Render IR` -> Typst source
3. Existing engine renders Typst -> PDF

Why this path:
- Reuses proven Typst render infrastructure.
- Limits migration risk.
- Allows side-by-side output comparison versus current low-code compiler.

### 5.3 Data and schema services

Add schema intelligence to no-code UI:
- Field discovery from sample data.
- Type inference (`string`, `number`, `date`, `array`, etc.).
- Binding guards (invalid path, type mismatch) before render.

### 5.4 Collaboration and persistence

Persist `NoCodeSpec v2` in template versions while preserving current fields:
- Keep `source` and `low_code_spec` for compatibility.
- Add `no_code_spec` JSON and `editor_format` discriminator.
- Keep migration metadata (`migrated_from`, `migrator_version`).

## 6) Phased Delivery Plan

## Phase 0: Foundations and observability (1-2 weeks)

Deliverables:
- Add metrics for low-code usage patterns (block edits, render errors, preview latency).
- Add feature flags for no-code surface and compiler path.
- Define acceptance baselines (render latency, error budget, conversion).

Exit criteria:
- Baselines captured in production-like traffic.
- Flags available for internal and cohort rollout.

## Phase 1: Spec and compiler backbone (2-4 weeks)

Deliverables:
- `NoCodeSpec v2` schema with strict validation.
- Compiler `v2 -> Typst` with assertion-heavy normalization.
- Adapter: `low_code_spec v1 -> NoCodeSpec v2` for existing templates.

Exit criteria:
- Golden test corpus: v1 templates compile and render correctly via adapter.
- Snapshot/regression suite for `v2 -> Typst` stability.

## Phase 2: No-code editor MVP (4-6 weeks)

Deliverables:
- Visual layout editor for core elements (header, text, divider, table).
- Inspector panel for style/layout controls.
- Binding picker UI from discovered schema.
- Real-time preview using existing render endpoint.

Exit criteria:
- Internal users create production-like invoice/report templates with no raw JSON editing.
- Error rate not worse than low-code baseline.

## Phase 3: Migration UX and production rollout (3-4 weeks)

Deliverables:
- "Upgrade template" flow (v1 -> v2) with non-destructive copy.
- Dual-mode template editing (No-code + Advanced Typst).
- One-click rollback to previous version.
- Cohort rollout (internal -> beta customers -> broad availability).

Exit criteria:
- >=80% of new templates for beta cohort created in no-code.
- P95 preview latency within agreed SLO delta.

## Phase 4: Advanced capabilities (ongoing)

Deliverables:
- Conditional visibility and computed fields.
- Reusable component library (header/footer/sections).
- Multi-page smart flow improvements and print-safe constraints.
- Collaboration primitives (draft review, comments, optional locking).

Exit criteria:
- No-code feature parity with top requested low-code patterns.
- Reduced support tickets related to template authoring complexity.

## 7) Backward Compatibility Strategy

Compatibility matrix:
- Existing Typst templates: unchanged.
- Existing `low_code_spec` templates: editable in current low-code UI; optionally upgradable to v2.
- New no-code templates: stored as `no_code_spec`, compiled through v2 compiler.

Rules:
- No forced migration.
- Migration creates new version only (never mutates historical versions).
- Rendering always supports `source` and `low_code_spec` while v2 rolls out.

## 8) Data Model and API Changes

Suggested additive changes:
- Template version fields:
  - `no_code_spec` (JSON, nullable)
  - `editor_format` (`code` | `low_code_v1` | `no_code_v2`)
  - `migration_meta` (JSON)

Suggested API additions:
- `POST /v1/templates/:id/migrate-to-no-code`
- `POST /v1/templates/:id/validate-no-code`
- `POST /v1/render/preview` accepts `no_code_spec` (additive)

Keep existing contracts active during rollout.

## 9) Verification and Quality Gates

## 9.1 Compiler correctness
- Golden file tests: fixed inputs compare rendered text/layout snapshots.
- Property tests for binding paths and list/table expansions.
- Strict assertions for invalid element states before compilation.

## 9.2 Render reliability
- Shadow rendering (sample traffic): compare old path vs new compiler outputs.
- Alert on compile failures, P95 latency drift, and template-specific regressions.

## 9.3 Product quality
- Task completion benchmark: "create invoice with line items" time-to-complete.
- Editing error frequency and publish success rate by mode.
- Migration success rate and rollback frequency.

## 10) Rollout and Risk Controls

Feature flags:
- `no_code_editor_enabled`
- `no_code_compiler_enabled`
- `no_code_migration_enabled`

Risk controls:
- Cohort-based rollout by account/user IDs.
- Fast kill-switch to existing low-code flow.
- Versioned compiler (`compiler_version`) on saved templates.
- SLO guardrails for render latency and failure rate.

## 11) Biggest Risks and Mitigations

- Layout complexity explosion:
  - Mitigate with constrained layout primitives first; delay freeform absolute positioning.
- Migration fidelity gaps:
  - Mitigate with preview diff tooling + manual approve step before publish.
- User confusion across three modes:
  - Mitigate with explicit mode labels, upgrade wizard, and contextual guidance.
- Performance regressions:
  - Mitigate with compile caching and pre-validation before render calls.

## 12) Recommended First Milestone (Pragmatic)

Implement this first:
- `NoCodeSpec v2` schema + adapter from current `low_code_spec`.
- Minimal no-code canvas for current four block types.
- Existing render endpoint support via `no_code_spec -> Typst` compiler.

This yields user-visible no-code progress quickly while minimizing backend risk.

## 13) Success Criteria (90-day)

- >=50% of newly created templates use no-code mode.
- Publish success rate in no-code >= low-code baseline.
- No increase in overall render failure SLO.
- >=30% reduction in template-authoring support requests.

## 14) Decision Log Needed Before Build

Decisions to lock before implementation starts:
- Layout model scope for v2 (constrained flow vs freeform canvas).
- Whether no-code source of truth is IR-like or UX-first schema.
- Migration policy from Typst-only templates (import support now vs later).
- Which advanced controls stay exclusive to Typst mode.
