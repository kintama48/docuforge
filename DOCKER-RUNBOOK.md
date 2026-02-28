# DocuForge Docker Runbook

> Production deployment guide, audit findings, and Docker reference.
> Generated 2026-02-26 from audit of the current codebase.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Docker Concepts Cheat Sheet](#2-docker-concepts-cheat-sheet)
3. [Audit Findings & Gaps](#3-audit-findings--gaps)
4. [Fix: Missing Redis in Root Compose](#4-fix-missing-redis-in-root-compose)
5. [Fix: Missing .dockerignore Files](#5-fix-missing-dockerignore-files)
6. [Fix: MCP Server Dockerfile](#6-fix-mcp-server-dockerfile)
7. [Fix: Frontend Dockerfile Hardening](#7-fix-frontend-dockerfile-hardening)
8. [Nginx Reverse Proxy Setup](#8-nginx-reverse-proxy-setup)
9. [Production Compose File](#9-production-compose-file)
10. [Deployment Playbook](#10-deployment-playbook)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Architecture Overview

```
                    ┌─────────────────────────────────────────────┐
                    │                   Host                      │
                    │                                             │
   HTTPS :443 ─────┤►  ┌───────────┐                             │
   HTTP  :80  ─────┤►  │   nginx   │ (reverse proxy + TLS)       │
                    │   └─────┬─────┘                             │
                    │         │                                   │
                    │   ┌─────┴──────────────────────────────┐    │
                    │   │       Docker internal network       │    │
                    │   │                                     │    │
                    │   │  ┌──────────┐    ┌──────────────┐  │    │
                    │   │  │ frontend │    │  mcp-server   │  │    │
                    │   │  │  :5173   │    │    :3200      │  │    │
                    │   │  └────┬─────┘    └──────┬───────┘  │    │
                    │   │       │                  │          │    │
                    │   │  ┌────▼─────┐           │          │    │
                    │   │  │   api    ◄───────────┘          │    │
                    │   │  │  :3000   │                      │    │
                    │   │  └──┬────┬──┘                      │    │
                    │   │     │    │                          │    │
                    │   │ ┌───▼┐ ┌─▼──────┐                  │    │
                    │   │ │redis│ │ engine │                  │    │
                    │   │ │:6379│ │ :3001  │                  │    │
                    │   │ └────┘ └────────┘                  │    │
                    │   └────────────────────────────────────┘    │
                    └─────────────────────────────────────────────┘
```

**Services:**

| Service    | Image base          | Port | Role                        |
|------------|---------------------|------|-----------------------------|
| nginx      | nginx:alpine        | 80/443 | Reverse proxy, TLS, static |
| frontend   | oven/bun:1          | 5173 | Next.js SSR app             |
| api        | oven/bun:1          | 3000 | Hono REST API               |
| engine     | debian:bookworm-slim| 3001 | Rust/Typst PDF renderer     |
| redis      | redis:7-alpine      | 6379 | Job queue (BullMQ)          |
| mcp-server | oven/bun:1          | 3200 | MCP tool server             |

---

## 2. Docker Concepts Cheat Sheet

### Images vs Containers

- **Image**: A read-only blueprint. Built from a Dockerfile. Think of it like a class.
- **Container**: A running instance of an image. Think of it like an object. You can run many containers from one image.

```
Dockerfile  ──build──►  Image  ──run──►  Container
                         (blueprint)      (live process)
```

### Multi-stage Builds

Multi-stage builds use multiple `FROM` statements. Each creates a "stage". You copy only what you need from earlier stages into the final image. This keeps the final image small.

```dockerfile
# Stage 1: has all build tools (large)
FROM node:20 AS builder
RUN npm run build

# Stage 2: only runtime (small)
FROM node:20-slim
COPY --from=builder /app/dist ./dist   # cherry-pick just the output
```

**Why it matters**: Your engine Dockerfile does this well — it builds a 1 GB+ Rust toolchain image but the final image is just Debian + a single binary (~50 MB).

### Docker Compose

Compose defines multi-container applications in a YAML file. Key concepts:

```yaml
services:
  api:
    build: ./api            # Build from this directory's Dockerfile
    ports:
      - "3000:3000"         # HOST:CONTAINER — expose to the outside
    expose:
      - "3000"              # CONTAINER only — visible to other services, not host
    depends_on:
      redis:
        condition: service_healthy  # Wait for redis health check to pass
    environment:
      DB_URL: postgres://db:5432    # "db" resolves to the db container's IP
    volumes:
      - data:/var/data      # Named volume — persists across container restarts
    restart: unless-stopped  # Auto-restart on crash (but not if you manually stop)
```

### Networking

All services in a `docker-compose.yml` share a network by default. They resolve each other by service name:
- `http://api:3000` — from frontend or mcp-server, this reaches the api container
- `http://engine:3001` — from api, this reaches the engine container
- `redis://redis:6379` — from api, this reaches Redis

**`ports` vs `expose`**:
- `ports: "3000:3000"` — maps host port to container port. Accessible from outside Docker.
- `expose: "3000"` — only accessible from other containers in the same network. Use this for internal services that shouldn't be publicly reachable (engine, redis).

### Volumes

```yaml
volumes:
  api-data:       # Named volume: Docker manages the storage location
  redis-data:     # Survives container restarts and rebuilds
```

- **Named volumes** (`api-data:/data`) persist data across container lifecycle
- **Bind mounts** (`./local/path:/container/path`) map a host directory into the container — useful for dev, avoid in prod
- `docker compose down` stops containers but keeps volumes
- `docker compose down -v` **destroys volumes too** — data loss!

### Health Checks

Health checks tell Docker (and your compose `depends_on`) whether a container is actually ready:

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
```

- `interval`: how often to check
- `timeout`: how long to wait for a response
- `start-period`: grace period after container starts (don't mark unhealthy during startup)
- `retries`: how many failures before marking unhealthy

---

## 3. Audit Findings & Gaps

### CRITICAL

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 1 | **Redis service missing from root compose** | `docker-compose.yml` | `docker compose up` fails — api depends on redis but redis isn't defined |
| 2 | **MCP Server Dockerfile is bare-minimum** | `mcp-server/Dockerfile` | No multi-stage build, no non-root user, no health check, no .dockerignore — insecure and bloated |
| 3 | **API has no .dockerignore** | `api/` | Copies `node_modules/`, test files, `.env`, `local.db` into image — leaks secrets, inflates image |

### HIGH

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 4 | **Frontend runs as root** | `frontend/Dockerfile` | Container compromise = root access |
| 5 | **Frontend has no health check** | `frontend/Dockerfile` | Compose can't wait for frontend readiness |
| 6 | **No nginx / reverse proxy** | project root | Services exposed on raw ports; no TLS, no request routing, no rate limiting |
| 7 | **No production compose override** | project root | Dev compose exposes all ports directly — not suitable for prod |

### MEDIUM

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 8 | **`docker-down` target uses `-v`** | `Makefile:98` | `make docker-down` destroys all volumes including DB data — dangerous habit |
| 9 | **Two conflicting compose files** | `docker-compose.yml` vs `api/docker-compose.yml` | Confusing — which one to use? Root one is incomplete, api one has more config |
| 10 | **API Dockerfile health check uses `curl`** | `api/Dockerfile:32` | `oven/bun:1` image may not have `curl` installed — health check silently fails |
| 11 | **Engine uses Rust 1.75** | `engine/docker/Dockerfile:2` | Rust 1.75 is from Dec 2023 — over 2 years old. Consider updating |
| 12 | **No restart policies in root compose** | `docker-compose.yml` | Containers don't restart on crash |
| 13 | **No resource limits** | all compose files | A runaway container can starve the host |

### LOW

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 14 | No CI/CD Docker image build/push | `.github/workflows/` | Manual deploys only |
| 15 | No image tagging strategy | — | Always `:latest` — can't roll back |
| 16 | `version: "3.8"` in api compose | `api/docker-compose.yml:1` | Deprecated field in modern Docker Compose — harmless but noisy warning |

---

## 4. Fix: Missing Redis in Root Compose

The root `docker-compose.yml` references `redis` in the api's `depends_on` and `REDIS_URL`, but never defines the redis service. Here's the corrected version:

```yaml
# docker-compose.yml (root) — add this between mcp-server and volumes:

  redis:
    image: redis:7-alpine
    command: ["redis-server", "--appendonly", "yes", "--maxmemory", "256mb", "--maxmemory-policy", "allkeys-lru"]
    expose:
      - "6379"
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
      start_period: 5s
    restart: unless-stopped
```

Also update the api service to wait for healthy redis:

```yaml
  api:
    depends_on:
      engine:
        condition: service_healthy
      redis:
        condition: service_healthy
```

---

## 5. Fix: Missing .dockerignore Files

### `api/.dockerignore` (create this file)

```
node_modules
*.db
*.db-journal
.env
.env.*
tests
coverage
*.test.ts
*.spec.ts
.git
.gitignore
docker-compose.yml
Dockerfile
README.md
```

### `mcp-server/.dockerignore` (create this file)

```
node_modules
.env
.env.*
tests
coverage
*.test.ts
*.spec.ts
.git
.gitignore
Dockerfile
README.md
```

---

## 6. Fix: MCP Server Dockerfile

Replace `mcp-server/Dockerfile` with:

```dockerfile
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .

FROM oven/bun:1 AS runtime
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/src ./src
COPY --from=build /app/package.json ./

RUN adduser --disabled-password --gecos "" docuforge
USER docuforge

EXPOSE 3200

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun -e "fetch('http://localhost:3200/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))" || exit 1

CMD ["bun", "run", "start"]
```

---

## 7. Fix: Frontend Dockerfile Hardening

Replace `frontend/Dockerfile` with:

```dockerfile
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM deps AS build
WORKDIR /app
COPY . .
RUN bun run build

FROM oven/bun:1 AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5173
ENV HOSTNAME=0.0.0.0

COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.ts ./next.config.ts
COPY --from=deps /app/node_modules ./node_modules

RUN adduser --disabled-password --gecos "" docuforge
USER docuforge

EXPOSE 5173

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD bun -e "fetch('http://localhost:5173/').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))" || exit 1

CMD ["bun", "run", "start"]
```

---

## 8. Nginx Reverse Proxy Setup

### How nginx fits in

Instead of exposing each service port to the internet, nginx sits in front and routes requests based on the domain/path:

```
Internet ──► nginx:443 ──┬── /           → frontend:5173
                         ├── /api/*      → api:3000
                         ├── /mcp/*      → mcp-server:3200
                         └── (blocked)   → engine, redis stay internal
```

### nginx config file

Create `nginx/nginx.conf`:

```nginx
upstream frontend {
    server frontend:5173;
}

upstream api {
    server api:3000;
}

upstream mcp {
    server mcp-server:3200;
}

# Redirect HTTP → HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # ── TLS ──────────────────────────────────────────────
    # Option A: Let's Encrypt / Certbot (recommended)
    ssl_certificate     /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # ── Security headers ─────────────────────────────────
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;

    # ── Limits ───────────────────────────────────────────
    client_max_body_size 50M;  # Match engine's MAX_BODY_SIZE_MB

    # ── API ──────────────────────────────────────────────
    location /api/ {
        proxy_pass http://api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts for long PDF renders
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }

    # ── MCP Server ───────────────────────────────────────
    location /mcp/ {
        proxy_pass http://mcp/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # ── Frontend (catch-all) ─────────────────────────────
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support (Next.js HMR in dev, possible live features)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # ── Health check endpoint for the proxy itself ───────
    location /nginx-health {
        access_log off;
        return 200 "ok";
        add_header Content-Type text/plain;
    }
}
```

### For local dev without TLS

Create `nginx/nginx.dev.conf` (HTTP only, no certs needed):

```nginx
upstream frontend {
    server frontend:5173;
}

upstream api {
    server api:3000;
}

server {
    listen 80;
    server_name localhost;

    client_max_body_size 50M;

    location /api/ {
        proxy_pass http://api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location /nginx-health {
        access_log off;
        return 200 "ok";
        add_header Content-Type text/plain;
    }
}
```

---

## 9. Production Compose File

Create `docker-compose.prod.yml` — this is the file you deploy with:

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro          # Mount your TLS certs here
    depends_on:
      frontend:
        condition: service_healthy
      api:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost/nginx-health"]
      interval: 10s
      timeout: 3s
      retries: 3
    restart: unless-stopped

  frontend:
    build: ./frontend
    expose:
      - "5173"                                  # Internal only — nginx handles external
    environment:
      NEXT_PUBLIC_API_URL: https://your-domain.com/api
      NEXT_PUBLIC_APP_URL: https://your-domain.com
      NODE_ENV: production
    depends_on:
      api:
        condition: service_healthy
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: "1.0"

  api:
    build: ./api
    expose:
      - "3000"                                  # Internal only
    env_file:
      - .env.prod                               # Single source of truth for secrets
    environment:
      NODE_ENV: production
      ENGINE_URL: http://engine:3001
      DATABASE_URL: file:/data/docuforge.db
      REDIS_URL: redis://redis:6379
      RENDER_QUEUE_ENABLED: "true"
      RENDER_QUEUE_AUTO_START_WORKER: "true"
    volumes:
      - api-data:/data
    depends_on:
      engine:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: "2.0"

  engine:
    build:
      context: ./engine
      dockerfile: docker/Dockerfile
    expose:
      - "3001"                                  # Internal only
    environment:
      RUST_LOG: info
      HOST: 0.0.0.0
      PORT: 3001
      LOG_FORMAT: json
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 2G                            # PDF rendering can be memory-hungry
          cpus: "2.0"

  redis:
    image: redis:7-alpine
    command: ["redis-server", "--appendonly", "yes", "--maxmemory", "256mb", "--maxmemory-policy", "allkeys-lru"]
    expose:
      - "6379"                                  # Internal only
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
      start_period: 5s
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: "0.5"

  mcp-server:
    build: ./mcp-server
    expose:
      - "3200"                                  # Internal only
    env_file:
      - ./mcp-server/.env
    environment:
      DOCUFORGE_API_BASE_URL: http://api:3000
    depends_on:
      api:
        condition: service_healthy
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: "0.5"

volumes:
  api-data:
  redis-data:
```

**Key differences from dev compose:**
- All services use `expose` (internal) instead of `ports` (external) — only nginx exposes 80/443
- Resource limits prevent any container from starving the host
- `restart: unless-stopped` on everything
- Health-check-based `depends_on` for proper startup ordering
- Secrets loaded from `.env.prod` file (never committed to git)

---

## 10. Deployment Playbook

### First-time server setup

```bash
# 1. Install Docker + Compose on your server
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in for group change to take effect

# 2. Clone the repo
git clone <your-repo-url> /opt/docuforge
cd /opt/docuforge

# 3. Create production env file (NEVER commit this)
cp api/.env.example .env.prod
# Edit .env.prod with real values:
#   - JWT_SECRET: generate with `openssl rand -hex 32`
#   - GEMINI_API_KEY: your real key
#   - R2_*: your Cloudflare R2 credentials
#   - etc.

# 4. Set up TLS certificates
mkdir -p nginx/ssl
# Option A: Let's Encrypt (recommended)
sudo apt install certbot
sudo certbot certonly --standalone -d your-domain.com
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/
# Option B: Self-signed (for testing only)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/privkey.pem -out nginx/ssl/fullchain.pem

# 5. Build and start
docker compose -f docker-compose.prod.yml up -d --build

# 6. Verify
docker compose -f docker-compose.prod.yml ps
# All services should show "healthy"

curl -k https://your-domain.com/nginx-health
# Should return "ok"
```

### Deploying updates

```bash
cd /opt/docuforge

# 1. Pull latest code
git pull origin main

# 2. Rebuild and restart (zero-downtime for stateless services)
docker compose -f docker-compose.prod.yml up -d --build

# 3. Verify health
docker compose -f docker-compose.prod.yml ps

# 4. Check logs for errors
docker compose -f docker-compose.prod.yml logs --tail=50

# 5. If something is wrong — roll back
git checkout <previous-commit>
docker compose -f docker-compose.prod.yml up -d --build
```

### Common operations

```bash
# View logs (all services)
docker compose -f docker-compose.prod.yml logs -f

# View logs (single service)
docker compose -f docker-compose.prod.yml logs -f api

# Restart a single service
docker compose -f docker-compose.prod.yml restart api

# Stop everything (keeps data)
docker compose -f docker-compose.prod.yml down

# Stop everything AND delete data (DANGEROUS)
docker compose -f docker-compose.prod.yml down -v

# Shell into a running container
docker compose -f docker-compose.prod.yml exec api sh

# Check resource usage
docker stats

# Rebuild a single service
docker compose -f docker-compose.prod.yml up -d --build api

# Prune old images (recover disk space)
docker image prune -f
```

### Cert renewal (Let's Encrypt)

```bash
# Certs expire every 90 days. Set up a cron job:
# crontab -e
0 3 1 * * certbot renew --quiet && \
  cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /opt/docuforge/nginx/ssl/ && \
  cp /etc/letsencrypt/live/your-domain.com/privkey.pem /opt/docuforge/nginx/ssl/ && \
  docker compose -f /opt/docuforge/docker-compose.prod.yml restart nginx
```

---

## 11. Troubleshooting

### Container won't start

```bash
# Check what happened
docker compose -f docker-compose.prod.yml logs <service-name>

# Common causes:
# - Port already in use: `lsof -i :3000`
# - Missing env vars: check .env.prod
# - Build failure: check Dockerfile syntax
```

### "Connection refused" between services

```bash
# Verify containers are on the same network
docker network ls
docker network inspect docuforge_default

# Verify the target service is running and healthy
docker compose -f docker-compose.prod.yml ps

# Test connectivity from one container to another
docker compose -f docker-compose.prod.yml exec api sh -c "wget -qO- http://engine:3001/health"
```

### Health check failing

```bash
# See health check output
docker inspect --format='{{json .State.Health}}' <container-id> | jq

# Common cause: health check command not available in image
# The bun images don't have curl — use bun -e fetch() instead (see fixed Dockerfiles above)
```

### Out of disk space

```bash
# Check Docker disk usage
docker system df

# Clean up everything unused
docker system prune -a --volumes
# WARNING: this removes all stopped containers, unused images, and unused volumes

# Safer: just remove old images
docker image prune -a
```

### Database corruption (SQLite)

```bash
# The API uses SQLite at /data/docuforge.db inside the api-data volume

# Back up the database
docker compose -f docker-compose.prod.yml exec api sh -c "cp /data/docuforge.db /data/docuforge.db.backup"

# Copy backup to host
docker cp $(docker compose -f docker-compose.prod.yml ps -q api):/data/docuforge.db.backup ./docuforge.db.backup
```

### Nginx returns 502 Bad Gateway

This means nginx can reach the upstream service's port but the service isn't responding.

```bash
# Check if the backend service is running
docker compose -f docker-compose.prod.yml ps api

# Check if the service is healthy
docker compose -f docker-compose.prod.yml exec api sh -c "wget -qO- http://localhost:3000/health"

# Check nginx logs
docker compose -f docker-compose.prod.yml logs nginx
```

---

## Quick Reference Card

| Task | Command |
|------|---------|
| Start (prod) | `docker compose -f docker-compose.prod.yml up -d --build` |
| Stop (keep data) | `docker compose -f docker-compose.prod.yml down` |
| Logs | `docker compose -f docker-compose.prod.yml logs -f` |
| Status | `docker compose -f docker-compose.prod.yml ps` |
| Restart one | `docker compose -f docker-compose.prod.yml restart api` |
| Shell in | `docker compose -f docker-compose.prod.yml exec api sh` |
| Disk usage | `docker system df` |
| Clean up | `docker image prune -a` |
| DB backup | see Troubleshooting section |
