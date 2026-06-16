# Instruction Update Policy
- Whenever the user asks the agent to follow something or quit something, update this `AGENTS.md` so the instruction persists for future agents.

# Workflow Orchestration

## 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately - don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

## 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

## 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

## 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness
- After implementing any notable feature/update, run an explicit quality check, add comprehensive regression tests for the new behavior, and perform a code review pass before finalizing.

## 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "Is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes - don't over-engineer
- Challenge your own work before presenting it

## 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests - then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## 7. Assertions & Automated Tests (Assertion-First)
- Add high-quality assertions to any non-trivial code path
  - Validate preconditions (inputs, invariants, assumptions)
  - Validate postconditions (outputs, state transitions)
  - Assert unreachable states (`default`/`else` should be intentional)
  - Prefer explicit failure with clear messages over silent fallthrough
- Prefer assertions over tests when assertions can prove correctness locally
  - If an invariant can be enforced at runtime, assert it instead of writing a test that re-checks it
  - Use tests primarily for behavior across boundaries: I/O, integrations, concurrency, complex flows
- Add automated tests when assertions are insufficient
  - Cross-module behavior and contracts
  - Regression coverage for past bugs
  - Edge cases involving time, randomness, external systems, serialization, permissions
- Never add tests that merely duplicate what strong assertions already guarantee

## 8. Repo-Wide Assertion Hardening Policy
- For core stacks (`api`, `frontend`, `mcp-server`, `engine`, `load-test`), enforce typed fail-fast assertions in runtime/source code.
- Runtime/source code must not introduce TypeScript non-null assertions (`!`), `as any`, or `as unknown as`.
- Production Rust code must not introduce `panic!`, `unwrap()`, or `expect()` in non-test paths; return typed errors instead.
- Keep assertion enforcement strict and blocking in CI for runtime/source files; tests may use pragmatic patterns when needed.

# Task Management
1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections
7. **Assertion-First Coverage**: Add assertions everywhere they can enforce correctness; add tests only where needed

# Core Principles
- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
- **Proof Over Hope**: Enforce correctness with assertions; use tests where assertions can't reach.
- **API Boundary Contract**: Dashboard API must live under `/console/*` with cookie-session-only auth, while consumer API remains under `/v1/*`.
- **Console UX Protection**: Do not hard-rate-limit normal `/console/*` cookie-session UX paths with user-facing 429s; use abuse/bot protection and internal safeguards instead.
- **Frontend Deploy Target**: Prefer deploying `frontend/` to Cloudflare Workers (OpenNext) over Cloudflare Pages unless the user explicitly says otherwise.
- **Early-Stage Infra Override**: Until DocuForge exceeds five paying users, keep infra spend at zero by running `frontend`, `api`, `engine`, and local Redis on the same free DigitalOcean droplet behind nginx, with Cloudflare as authoritative DNS/proxy and `www` + `api` pointing to the droplet. Revisit Workers or split services only after that threshold.
- **Transactional Email Standard**: Use Resend for user-facing transactional emails and keep localized, branded HTML+text templates in API code.
- **Billing Provider Policy**: Remove Stripe-specific runtime/env integration; support Paddle and Lemon Squeezy with a provider switch.
- **Transactional Sender Map**: Use `noreply@docuforge.app` for one-way auth/security emails, `hello@docuforge.app` for welcome/onboarding emails, `billing@docuforge.app` for billing events, and `support@docuforge.app` for user support correspondence.
- **Icon Consistency**: Use Phosphor icons as the default icon library on product surfaces unless explicitly overridden.
- **Session Security**: Keep auth flows persistent and secure: expose logout in authenticated surfaces, sanitize redirect targets, and verify security headers/caching behavior after auth changes.
- **PDF Import Strategy**: For PDF import, do not add OCR-first complexity unless explicitly requested. Use deterministic converter output plus user input, then run in-house LLM/RAG best-effort reconstruction with a clear user review step.
- **Consumer-Only API Docs**: Public API documentation should only include consumer-facing `/v1/*` endpoints; do not document `/console/*` routes or console-only endpoints.
- **Config Hygiene**: Keep `.env` focused on secrets/deployment-specific values; move non-secret default knobs (especially plan quotas and request limits) into typed `config.ts` objects.
- **Unified Env File**: Use root `.env` as the canonical environment file for local prod-like orchestration and production compose runs.
- **Local Redis Requirement**: Keep Redis in the default local-dev startup path (`make dev` / compose) when Redis-backed features are active.
- **Email Branding Requirement**: Transactional email HTML must include the DocuForge logo mark, not just text branding.

# Code Modification Tool

- **Use Graphify for code changes.** From 2026-06-15 onward, all code modifications in this repo should be made through Graphify rather than direct Edit/Write. If Graphify is currently in use by another process, continue working with available tools and switch to Graphify as soon as it frees up — do not block waiting on it.

# Local Dev Environment

- **Use the Mac for development + testing.** The Digital Ocean droplet (`ssh do_droplet`) is for **deployments only** — do not use it for dev work, ad-hoc renders, or testing. All local rendering / template iteration / verification should happen on the Mac.

# Communication Efficiency
- **Conserve Tokens**: Use only the tokens necessary to complete the task.
- **Structured Delivery**: Communicate in clear, structured, minimal formats (brief sections, short bullets, direct actions).
