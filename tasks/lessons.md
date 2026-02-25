# Lessons

- Read and apply `/Users/abdullah/WebstormProjects/docuforge/AGENTS.md` rules before implementation work.
- Follow requested sequencing strictly: complete UI changes first, then do deep code-quality/backend/queue refinements.
- Do not replace brand assets with temporary badges in user-facing surfaces; keep official logo lockup unless explicitly told to rebrand.
- After any theme/hero overhaul, immediately run a contrast pass on all primary/secondary CTAs and enforce shared button primitives to avoid invisible labels.
- When the user asks for targeted visual tweaks, avoid broad theme token changes; isolate updates to the requested component first.
- For marketing pages, reduce dense paragraphs and prioritize visual hierarchy (icons, cards, flow visuals) before adding more copy.
- On large desktop screens, widen container constraints and de-crowd navigation before introducing extra menu items.
- Never use `--ink` as a background color token for “dark sections”; in dark theme `--ink` flips light and causes invisible text. Use inverse tokens (`--inverse-bg`, `--inverse-ink`, `--inverse-line`) for contrast-safe sections.
- Keep settings/dashboard surfaces on shared theme tokens only; avoid mixed hardcoded dark palettes in light mode to prevent inconsistent page blocks.
- On authenticated surfaces, always expose a clear logout control and verify auth/session paths are hardened against open redirects.
- For webhook destinations, validate beyond URL syntax: reject localhost/private-network targets and embedded URL credentials to reduce SSRF risk.
- For in-memory auth/OAuth state stores, enforce TTL cleanup plus hard size caps to prevent silent memory growth under abandoned flows.
- Browser auth mutation endpoints should validate trusted `Origin` where possible; allow no-origin clients but block explicit cross-origin browser posts.
- Do not ship benchmark sections with hardcoded placeholder metrics; source benchmark UI from a validated report artifact and keep a reproducible runner script in-repo.
- Visual adjustments must stay scoped: avoid global icon-size shifts when the user asks for local layout polish.
- For security marketing copy, lead with customer outcomes and risk reduction; avoid exposing low-level headers/protocol internals in hero/value-prop sections.
- For every new feature request, implement end-to-end across the full stack (backend + frontend + integrations) and include automated tests that validate the complete flow before considering the task done.
