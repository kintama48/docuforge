# Public Preview Security + Cloudflare WAF Runbook

## Purpose
This runbook hardens DocuForge public preview traffic so anonymous users can generate watermarked previews safely without JWT auth.

Public endpoints in scope:
- `POST /v1/render/public/session`
- `POST /v1/render/public/preview`

## Security model
Public preview is intentionally open, but constrained:
- Short-lived session IDs are required before preview renders.
- Sessions are bound to client fingerprint (IP + user agent).
- Per-session quotas and per-minute limits are enforced server-side.
- Preview output is always watermarked by the backend.
- No user assets are resolved and no auxiliary template files are accepted.
- Source size is capped and responses are non-cacheable.

## Server-side controls (already implemented)
Configure in `api/.env`:
- `PUBLIC_PREVIEW_SESSION_TTL_SECONDS`
- `PUBLIC_PREVIEW_MAX_RENDERS_PER_SESSION`
- `PUBLIC_PREVIEW_MAX_SESSIONS`
- `PUBLIC_PREVIEW_IP_RATE_LIMIT_PER_MINUTE`
- `PUBLIC_PREVIEW_SESSION_RATE_LIMIT_PER_MINUTE`
- `PUBLIC_PREVIEW_SESSION_CREATE_RATE_LIMIT_PER_MINUTE`
- `PUBLIC_PREVIEW_ALLOWED_ORIGINS`
- `PUBLIC_PREVIEW_WATERMARK_LABEL`

Recommended production baseline:
- Session TTL: `900` (15 min)
- Max renders per session: `12`
- Session creation limit: `6/min/IP`
- Preview limit: `20/min/IP`
- Preview limit per session: `8/min/session`

## Cloudflare WAF configuration
Apply these rules to the API zone in this order.

### 1) Method restriction
Rule: block non-POST requests to public preview endpoints.

Expression:
```txt
(http.request.uri.path in {"/v1/render/public/session" "/v1/render/public/preview"} and http.request.method ne "POST")
```
Action: `Block`

### 2) High-risk bot challenge on public preview
Rule: challenge suspicious automated traffic targeting preview endpoints.

Expression:
```txt
(http.request.uri.path in {"/v1/render/public/session" "/v1/render/public/preview"} and cf.bot_management.score lt 30)
```
Action: `Managed Challenge`

### 3) Strict origin allowlist at edge (browser flows)
Rule: challenge traffic with unexpected `Origin` headers.

Expression (edit domains):
```txt
(http.request.uri.path in {"/v1/render/public/session" "/v1/render/public/preview"}
 and len(http.request.headers["origin"]) gt 0
 and not lower(http.request.headers["origin"][0]) in {"https://docuforge.app" "https://www.docuforge.app"})
```
Action: `Block`

### 4) Rate limiting rules
Create Cloudflare rate-limit rules in addition to app-level limits:
- Rule A: `/v1/render/public/session`
  - Threshold: `10 requests / 1 minute / IP`
  - Action: `Managed Challenge` (upgrade to `Block` if abused)
- Rule B: `/v1/render/public/preview`
  - Threshold: `30 requests / 1 minute / IP`
  - Action: `Managed Challenge`
- Rule C: `/v1/render/public/preview`
  - Threshold: `120 requests / 10 minutes / IP`
  - Action: `Block` (cooldown 10 min)

### 5) DDoS + bot posture
- Enable Cloudflare DDoS managed protection (HTTP).
- Enable Super Bot Fight Mode (or Bot Management in enterprise).
- Set Security Level at least `Medium` for API routes.

### 6) Cache rule safety
Set bypass cache for all render endpoints:
```txt
http.request.uri.path starts_with "/v1/render/"
```
Action: `Bypass cache`

## Origin protection
Do not expose origin directly.
- Restrict origin ingress to Cloudflare IP ranges at the load balancer/firewall.
- Disable direct public access from non-Cloudflare networks.

## Monitoring and alerts
Track these signals:
- Spike in `429 rate_limited` for public preview routes.
- Session creation to preview ratio (`/session` >> `/preview`) indicating scraping.
- Engine timeout/error spikes from public preview.
- Top IPs and ASNs by preview volume.

Recommended alerts:
- `public_preview_429_rate > 5% for 5m`
- `public_preview_requests_per_minute > baseline x 3`
- `engine_timeout_rate > 2% for 5m`

## Incident response quick steps
1. Lower app limits immediately (env vars above) and redeploy.
2. Raise Cloudflare challenge sensitivity for public preview paths.
3. Temporarily block top abusive IP ranges/ASNs.
4. If needed, disable public preview by routing `/v1/render/public/*` to a temporary `503` at edge.
5. Review logs and tune permanent rules before re-opening.

## Notes
- Public preview is for draft workflows and acquisition funnels, not production document delivery.
- Keep watermark enabled at all times for anonymous preview traffic.
- Production rendering remains API-key/JWT protected endpoints.
