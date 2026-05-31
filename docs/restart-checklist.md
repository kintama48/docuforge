# DocuForge Restart Checklist

Concrete steps to get `dev` back to a shippable prod state. Local dev setup is deferred — prod only for now.

## 1. State of the world

- Branch: `dev`. Tip: `51d9d75 fix for ci check`.
- Committed `.env*` files contain real values — explicitly accepted (private repo, single operator).
- `origin` remote URL still has a GitHub PAT embedded:
  `https://ab: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@github.com/kintama48/docuforge`
  Codex scrubbed this before; it came back. Only real "leak" since shell history / curl errors / CI logs expose it.
- Codex's CORS work lived on `codex/abaig/cors`. Ported onto `dev` in this pass (see §2).

## 2. CORS — done

Ported from `codex/abaig/cors`. Files now on `dev`:

- `api/src/lib/browser-origins.ts` (new) — `getTrustedBrowserOrigins()` + `getTrustedPublicPreviewOrigins()`. Reads `APP_URL` + CSV `APP_ALLOWED_ORIGINS`. Normalizes/dedupes; rejects creds, paths, empty.
- `api/src/config/env.ts` — added `APP_ALLOWED_ORIGINS: z.string().optional()`.
- `api/src/app.ts` — CORS middleware now reads `getTrustedBrowserOrigins()`.
- `api/src/routes/auth.ts` — `assertTrustedBrowserOrigin` reads the helper. Local Set removed.
- `api/src/services/public-preview.ts` — `assertTrustedPublicPreviewOrigin` reads the helper. Local Set removed.
- `api/.env.prod` — `APP_ALLOWED_ORIGINS=https://docuforge.app,https://www.docuforge.app`.
- `api/.env.stag` — `APP_ALLOWED_ORIGINS=https://stag.docuforge.app,https://www.stag.docuforge.app`.

Verification: `bun test tests/integration/render-public-preview.test.ts tests/integration/auth-login.test.ts` — 13/13 pass. `bunx tsc --noEmit` — no new errors.

## 3. Concrete restart steps (in order)

1. **Revoke + scrub PAT.**
   - Revoke `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` at https://github.com/settings/tokens.
   - `git remote set-url origin https://github.com/kintama48/docuforge.git`
   - Re-auth with `gh auth login` (don't re-embed a token in the URL).

2. **Replace placeholder secrets in `api/.env.prod`** (the API boots but these surfaces will 4xx until real values land):
   - `JWT_SECRET` — currently the literal `your-256-bit-secret-change-this-in-production`. Generate 32+ bytes, e.g. `openssl rand -base64 48`.
   - `GEMINI_API_KEY` — currently `your-gemini-api-key`. AI/PDF-import will 401.
   - `PADDLE_*` / `LEMONSQUEEZY_*` IDs — currently `pri_dev_...` etc. Billing webhooks will 4xx. Fill them or accept billing being non-functional.

3. **Deploy.** `docker-compose.prod.yml` + `nginx/nginx.conf` are in place per the `DOCKER-RUNBOOK.md`. The CORS fix only needs an API restart to pick up the new env.

4. **Smoke test.** From `https://docuforge.app` (marketing) hit a public preview endpoint, from `https://console.docuforge.app` hit `/console/auth/login`. Both should now succeed; before this pass marketing was blocked.

## 4. Deferred (not required to ship)

- **`main` / `codex/abaig/cors` remote refs still carry the postcss payload.** Codex prepared local cleanup commits (`3f80607`, `2408849`) but couldn't push them last time. After step §3.1 re-auths, optionally: `git push origin main codex/abaig/cors`. Not needed for `dev` to ship.
- **`AUTH_COOKIE_DOMAIN`** unset in prod. Fine for the current setup (browser auto-sends cookie on credentialed XHR to `api.docuforge.app`). If you ever want shared sessions across `console` + `www`, set `AUTH_COOKIE_DOMAIN=.docuforge.app` and switch `AUTH_COOKIE_SAME_SITE` from `strict` to `lax`.
- **Local dev env.** Port collision (`api/.env` `PORT=3000` vs Next dev), legacy `APP_URL=http://localhost:5173` default, no `frontend/.env.local`. Address when you actually need local dev.
- **Other rotation candidates from your notes** (DATABASE_AUTH_TOKEN, R2, OAUTH_*_CLIENT_SECRET, RESEND_API_KEY, MCP_SERVER_TOKEN, DOCUFORGE_API_KEY): defer unless you have evidence any reached an untrusted surface. Rotating `JWT_SECRET` invalidates all sessions *and* existing API keys (`api/src/lib/api-key.ts:12`).
