# DocuForge QA + Next Steps

## Next steps to make it functional (local or staging)
- Create `api/.env` (copy from `api/.env.example`) and set real values for:
  - `DATABASE_URL`, `ENGINE_URL`
  - `R2_*` (assets), `STRIPE_*` (billing), `OPENAI_API_KEY` (AI)
  - `JWT_SECRET` (>= 32 chars), `APP_URL`, `API_URL`
  - `OAUTH_*` for Google/Microsoft/GitHub
- Run database setup:
  - `cd api && bun run db:migrate`
  - `cd api && bun run db:seed`
- Start the stack:
  - `make dev` (engine + api + frontend) or `make docker-up`
- Verify health:
  - `curl http://localhost:3001/health`
  - `curl http://localhost:3000/health`
- Configure OAuth providers:
  - Google/Microsoft/GitHub callback URLs must point to:
    - `http://localhost:3000/v1/auth/oauth/<provider>/callback`
  - `APP_URL` must match the frontend base:
    - `http://localhost:5173`
- Confirm the frontend points to the API:
  - `NEXT_PUBLIC_API_URL=http://localhost:3000`
  - `NEXT_PUBLIC_APP_URL=http://localhost:5173`
- Test user (seeded):
  - `abdullah.baig416@gmail.com`
  - `123123123`

## Manual QA checklist (flows)
### Acquisition + SEO
- [ ] Landing page loads with hero, animations, and CTA buttons.
- [ ] Rust/Typst engine messaging appears in the hero and landing sections.
- [ ] Nav anchors work (`#features`, `#workflow`, `#templates`, `#pricing`).
- [ ] Pricing page shows Free/Starter/Pro/Enterprise (Enterprise CTA = contact).
- [ ] Docs page loads and code blocks render correctly.
- [ ] `lang` and `dir` are correct per locale (Arabic is `rtl`).
- [ ] Hreflang + canonical tags are present and correct.
- [ ] OpenGraph/Twitter meta renders localized title/description.
- [ ] Dark mode auto-detection works; manual toggle persists.

### Localization
- [ ] Locale routing works for: `en`, `fr`, `de`, `it`, `es`, `ar`, `zh`.
- [ ] Currency/price labels look correct per locale.
- [ ] Long German strings do not overflow buttons or nav.
- [ ] Arabic RTL layout mirrors correctly (spacing + ordering).
- [ ] Chinese text renders without tofu (font coverage).

### Auth + OAuth
- [ ] Register with email + password succeeds.
- [ ] Register with existing email shows proper error.
- [ ] Login with valid credentials works (JWT stored).
- [ ] Login with invalid credentials shows error.
- [ ] OAuth: Google login + new user creation.
- [ ] OAuth: Microsoft login + new user creation.
- [ ] OAuth: GitHub login + new user creation.
- [ ] OAuth failure states route back to `/login?error=...`.

### Onboarding
- [ ] Template picker loads and selects a starter.
- [ ] API key reveal shows raw key and copy works.
- [ ] Quick start step renders the curl snippet.

### Dashboard
- [ ] Templates list loads.
- [ ] Create template works and appears in grid.
- [ ] Template card shows latest version + official badge.
- [ ] Usage card shows render stats.
- [ ] Official template gallery loads and can be forked.

### Editor
- [ ] Template files load into Monaco.
- [ ] Live render preview updates on edit.
- [ ] Diagnostics panel highlights errors with line numbers.
- [ ] File explorer add/rename/delete works.
- [ ] JSON data editor validates input.
- [ ] Publish flow creates a new version.
- [ ] Version history shows previous versions and revert works.
- [ ] PDF download works.
- [ ] Command palette opens and runs actions.

### Assets
- [ ] Upload asset works and appears in list.
- [ ] Delete asset removes it from list.
- [ ] Large upload rejects with correct error.

### API keys + settings
- [ ] Create API key returns a raw key once.
- [ ] Revoke API key works and removes from list.
- [ ] Profile and plan section render.

### Billing
- [ ] Upgrade button redirects to Stripe checkout.
- [ ] Cancel returns to dashboard with error message.
- [ ] Success returns to dashboard with updated plan.

### Security + abuse
- [ ] Invalid JWT returns 401 and frontend redirects to login.
- [ ] Rate limit / abuse responses show safe errors.
- [ ] XSS payloads in template names or metadata are escaped.
- [ ] CSRF on auth routes is blocked (or not applicable).
- [ ] File uploads validate type + size; no path traversal.

### Performance + reliability
- [ ] Preview render latency is stable under rapid edits.
- [ ] API downtime shows a clear error state.
- [ ] Web app recovers after refresh (auth persisted).

## How to flag issues
- Severity: `blocker`, `high`, `medium`, `low`
- Include: steps, expected, actual, screenshot, console logs, API response body.
- Note environment: OS, browser, locale, account used, and time.
