# DocuForge Localization + SEO Architecture (Lean)

## Goals
- Improve non-English conversion and organic traffic.
- Keep docs/content maintainable without giant TypeScript blobs.
- Avoid runtime complexity and hidden translation fallbacks.

## Architecture
1. **Content as Markdown/MDX, not giant TS objects**
   - Move `docs-content.ts` into filesystem content:
     - `content/docs/{locale}/{slug}.mdx`
     - `content/blog/{locale}/{slug}.mdx`
     - `content/templates/{locale}/{slug}.mdx`
   - Keep only typed metadata loaders in TypeScript.

2. **Single source of truth per locale**
   - One file per page per locale.
   - No mixed inline strings inside React components.
   - Strict build-time checks for missing required keys.

3. **Deterministic locale routing**
   - Route shape: `/{locale}/...`
   - Generate static params for supported locales.
   - Enforce canonical + hreflang tags for each localized route.

4. **Lean fallback policy**
   - Fallback only to default locale (`en`) at build time.
   - Emit warning report for missing pages/keys.
   - No hidden runtime fallback chains.

5. **SEO primitives**
   - Locale-specific title, description, OG image text.
   - Locale-aware XML sitemap entries.
   - Keep slug parity across locales where possible.

## Rollout (Low Risk)
1. Migrate docs pages first (highest SEO intent).
2. Migrate blog + comparison pages next.
3. Keep legacy TS content behind temporary loader adapter.
4. Remove adapter after parity and snapshot checks pass.

## Validation Gates
- Build fails on missing required locale metadata.
- Snapshot test: all routes render for each supported locale.
- Link checker: no broken internal links per locale.
- Search console check: hreflang coverage and indexation.
