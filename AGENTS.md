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
- **Icon Consistency**: Use Phosphor icons as the default icon library on product surfaces unless explicitly overridden.
- **Session Security**: Keep auth flows persistent and secure: expose logout in authenticated surfaces, sanitize redirect targets, and verify security headers/caching behavior after auth changes.

# Communication Efficiency
- **Conserve Tokens**: Use only the tokens necessary to complete the task.
- **Structured Delivery**: Communicate in clear, structured, minimal formats (brief sections, short bullets, direct actions).
