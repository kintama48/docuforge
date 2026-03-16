# DocuForge Docker Runbook

> Authoritative Docker deployment reference for the current repo state.
> Last reviewed: 2026-03-10.

## Table of Contents

1. [Review Index](#1-review-index)
2. [Current Topology](#2-current-topology)
3. [Compose Files](#3-compose-files)
4. [Dockerfiles and Images](#4-dockerfiles-and-images)
5. [Nginx and Cloudflare](#5-nginx-and-cloudflare)
6. [Environment Model](#6-environment-model)
7. [CI and Image Tagging](#7-ci-and-image-tagging)
8. [Deployment Commands](#8-deployment-commands)
9. [Validation Checklist](#9-validation-checklist)

## 1. Review Index

| File | Role | Review when |
| --- | --- | --- |
| `docker-compose.yml` | Local/dev multi-service compose | You change local Docker behavior or service wiring |
| `docker-compose.prod.yml` | Production one-droplet compose | You change production topology, ports, env, or limits |
| `nginx/nginx.conf` | TLS termination and host-based reverse proxy | You change domains, proxy headers, or timeouts |
| `.env.example` | Production env template | You add/remove runtime config |
| `frontend/Dockerfile` | Next.js production image | You change frontend build/runtime behavior |
| `api/Dockerfile` | API production image | You change API startup or health behavior |
| `engine/docker/Dockerfile` | Rust engine image | You change engine toolchain/runtime deps |
| `mcp-server/Dockerfile` | Optional MCP image | You change MCP runtime or want to deploy it separately |
| `frontend/.dockerignore` | Frontend build context filter | Frontend image builds get slow or leak files |
| `api/.dockerignore` | API build context filter | API image builds get slow or leak files |
| `mcp-server/.dockerignore` | MCP build context filter | MCP image builds get slow or leak files |
| `Makefile` | Dev/prod Docker helper commands | You change supported compose commands |
| `.github/workflows/docker-images.yml` | CI image build + GHCR tagging | You change image publishing or rollback strategy |

## 2. Current Topology

### Development

- Use `docker-compose.yml`.
- Exposes service ports directly for local access:
  - `frontend` -> `5173`
  - `api` -> `3000`
  - `engine` -> `3001`
  - `redis` -> `6379`
  - `mcp-server` -> `3200`

### Production

- Use `docker-compose.prod.yml`.
- Early-stage production footprint is intentionally minimal:
  - `nginx`
  - `frontend`
  - `api`
  - `engine`
  - `redis`
- `mcp-server` is hardened for container use but not included in the default one-droplet production stack.
- Cloudflare stays in front as DNS/proxy.
- Public hosts:
  - `www.docuforge.app` -> frontend
  - `api.docuforge.app` -> api

```text
Internet
  |
  v
Cloudflare
  |
  v
nginx (:80/:443)
  |---- www.docuforge.app -> frontend:5173
  \---- api.docuforge.app -> api:3000
                               |---- engine:3001
                               \---- redis:6379
```

## 3. Compose Files

### Local/dev compose

Authoritative file: `docker-compose.yml`

- Purpose:
  - local multi-service smoke runs
  - direct port access
  - includes `mcp-server`
- Entry points:
  - `make docker-up`
  - `make docker-up-bg`
  - `make docker-down`
  - `make docker-destroy`

### Production compose

Authoritative file: `docker-compose.prod.yml`

- Purpose:
  - single-droplet production deployment
  - internal-only service networking
  - `nginx` as the only public entry point
  - conservative container resource ceilings
- Entry points:
  - `make docker-prod-up`
  - `make docker-prod-up-bg`
  - `make docker-prod-down`
  - `make docker-prod-build`
  - `make docker-prod-logs`

### Why there are only two compose files now

- `docker-compose.yml` is the supported local/dev compose.
- `docker-compose.prod.yml` is the supported production compose.
- There is no longer a second compose file hidden under `api/`.

## 4. Dockerfiles and Images

### Frontend

File: `frontend/Dockerfile`

- Multi-stage Bun image
- Non-root runtime user
- Health check enabled
- Accepts `NEXT_PUBLIC_*` build args for correct Next.js client bundle output

### API

File: `api/Dockerfile`

- Multi-stage Bun image
- Non-root runtime user
- Health check uses Bun `fetch()`, not shell tools
- `api/src/index.ts` runs migrations on startup

Important:

- Do not run `bun run db:seed` in production.
- `api/scripts/seed.ts` creates a test user and developer API key.

### Engine

File: `engine/docker/Dockerfile`

- Multi-stage Rust -> Debian image
- Runtime image is still slim and non-root
- Builder now follows the stable Rust image channel instead of a stale fixed version

### MCP server

File: `mcp-server/Dockerfile`

- Hardened and ready to deploy when needed
- Not part of the default low-cost production compose

## 5. Nginx and Cloudflare

Authoritative file: `nginx/nginx.conf`

Routing:

- `www.docuforge.app` -> `frontend:5173`
- `api.docuforge.app` -> `api:3000`

Important proxy behavior:

- `X-Forwarded-Proto` is forced to `https`
- WebSocket upgrade headers are passed through for the frontend
- API read/send timeouts are extended for longer render operations
- Only `nginx` binds host ports in production

TLS expectations:

- Keep `www` and `api` as proxied `A` records
- Use a standard server certificate (Let's Encrypt recommended) on the droplet
- Keep Cloudflare SSL mode at `Full (strict)` when proxied

## 6. Environment Model

Authoritative files: `.env.example`, `api/.env`, `frontend/.env`, `engine/.env`

### Production env flow

1. Copy `.env.example` to `.env` (compose-level frontend build args)
2. Ensure `api/.env`, `frontend/.env`, and `engine/.env` are present with production values
3. Run prod compose with `--env-file .env`

### Variables that matter most for the one-droplet setup

- Compose-level frontend build args (`.env`):
  - `NEXT_PUBLIC_API_URL=https://api.docuforge.app`
  - `NEXT_PUBLIC_APP_URL=https://www.docuforge.app`
  - `NEXT_PUBLIC_MARKETING_URL=https://www.docuforge.app`
  - `NEXT_PUBLIC_CONSOLE_URL=https://www.docuforge.app`
- API runtime (`api/.env`):
  - `APP_URL=https://www.docuforge.app`
  - `API_URL=https://api.docuforge.app`
- API runtime internal wiring (`api/.env`):
  - `ENGINE_URL=http://engine:3001`
  - `REDIS_URL=redis://redis:6379`
  - `DATABASE_URL=file:/data/docuforge.db`
- API runtime queue behavior (`api/.env`):
  - `RENDER_QUEUE_ENABLED=true`
  - `RENDER_QUEUE_AUTO_START_WORKER=true`

## 7. CI and Image Tagging

Authoritative file: `.github/workflows/docker-images.yml`

Behavior:

- Builds images for:
  - `frontend`
  - `api`
  - `engine`
  - `mcp-server`
- Pushes to GHCR on non-PR events
- Tags include:
  - default branch `latest`
  - branch ref
  - PR ref
  - commit SHA
  - semver tags when git tags are pushed

Registry naming:

- `ghcr.io/<owner>/docuforge-frontend`
- `ghcr.io/<owner>/docuforge-api`
- `ghcr.io/<owner>/docuforge-engine`
- `ghcr.io/<owner>/docuforge-mcp-server`

## 8. Deployment Commands

### First-time production bootstrap

```bash
cp .env.example .env
$EDITOR .env
$EDITOR api/.env
$EDITOR frontend/.env
$EDITOR engine/.env

docker compose --env-file .env -f docker-compose.prod.yml build
docker compose --env-file .env -f docker-compose.prod.yml up -d
docker compose --env-file .env -f docker-compose.prod.yml ps
docker compose --env-file .env -f docker-compose.prod.yml logs --tail=100
```

### Rolling out updates

```bash
git pull origin main
docker compose --env-file .env -f docker-compose.prod.yml up -d --build
docker compose --env-file .env -f docker-compose.prod.yml ps
docker compose --env-file .env -f docker-compose.prod.yml logs --tail=100
```

### Dev stack helpers

```bash
make docker-up
make docker-up-bg
make docker-down
make docker-destroy
```

### Prod stack helpers

```bash
make docker-prod-up
make docker-prod-up-bg
make docker-prod-down
make docker-prod-build
make docker-prod-logs
```

## 9. Validation Checklist

### Static review

- `docker compose config`
- `docker compose --env-file .env -f docker-compose.prod.yml config`
- Confirm `api/.env`, `frontend/.env`, and `engine/.env` are present on the host
- Confirm only `nginx` publishes ports in `docker-compose.prod.yml`
- Confirm frontend `NEXT_PUBLIC_*` values appear in both prod build args and runtime env

### Runtime review

- `docker compose --env-file .env -f docker-compose.prod.yml up -d --build`
- `docker compose --env-file .env -f docker-compose.prod.yml ps`
- `curl -I https://www.docuforge.app`
- `curl https://api.docuforge.app/health`
- Test login/session flow from `www` to `api`
- Test one render request end to end

### Data safety review

- `make docker-down` keeps volumes
- `make docker-destroy` is the only destructive dev helper
- Production SQLite data lives in the `api-data` volume
- Production Redis data lives in the `redis-data` volume
