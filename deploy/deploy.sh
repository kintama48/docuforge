#!/usr/bin/env bash
# deploy/deploy.sh — hosting-agnostic deploy script.
# Usage: bash deploy/deploy.sh <env> <sha>
# <env>  : stag | prod
# <sha>  : short git SHA (used for logging; images already pushed by CI)
#
# Pulls the engine compose (shared between stag + prod per KAN-52) and the
# per-env compose, then restarts both via `docker compose up -d`.
# Engine is no-op on second invocation if the image hasn't changed.
set -euo pipefail

ENV="${1:?first arg must be env (stag|prod)}"
SHA="${2:?second arg must be short git sha}"

ENGINE_COMPOSE="docker-compose.engine.yml"
ENV_COMPOSE="docker-compose.${ENV}.yml"

for f in "$ENGINE_COMPOSE" "$ENV_COMPOSE"; do
  if [[ ! -f "$f" ]]; then
    echo "ERROR: $f not found in $(pwd)" >&2
    exit 1
  fi
done

# Log in to GHCR — runner must have a token saved (or run interactive once on first deploy).
# CI passes GITHUB_TOKEN to the SSH step via env; if not set, assume the droplet is already
# logged in from a prior session (docker stores creds in ~/.docker/config.json).
if [[ -n "${GHCR_TOKEN:-}" ]]; then
  echo "==> Logging in to GHCR"
  echo "$GHCR_TOKEN" | docker login ghcr.io -u "${GHCR_USER:-kintama48}" --password-stdin
fi

echo "==> Deploying sha=${SHA} to env=${ENV}"

echo "==> Pulling engine image (shared)"
docker compose -f "$ENGINE_COMPOSE" pull engine

echo "==> Ensuring engine is up"
docker compose -f "$ENGINE_COMPOSE" up -d --remove-orphans

echo "==> Pulling ${ENV} images"
docker compose -f "$ENV_COMPOSE" pull

echo "==> Restarting ${ENV} services"
docker compose -f "$ENV_COMPOSE" up -d --remove-orphans

echo "==> Pruning dangling images (keeps disk under control on the droplet)"
docker image prune -f --filter "until=24h" >/dev/null || true

echo "==> Done. Running ${ENV} containers:"
docker compose -f "$ENV_COMPOSE" ps
