#!/usr/bin/env bash
# deploy/deploy.sh — hosting-agnostic deploy script.
# Usage: bash deploy/deploy.sh <env> <sha>
# <env>  : staging | prod
# <sha>  : short git SHA (used for logging; images already pushed by CI)
# Reads docker-compose.<env>.yml from the repo root.
set -euo pipefail

ENV="${1:?first arg must be env (staging|prod)}"
SHA="${2:?second arg must be short git sha}"
COMPOSE_FILE="docker-compose.${ENV}.yml"

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "ERROR: $COMPOSE_FILE not found in $(pwd)" >&2
  exit 1
fi

echo "==> Deploying sha=${SHA} to env=${ENV} using ${COMPOSE_FILE}"

echo "==> Pulling latest images..."
docker compose -f "$COMPOSE_FILE" pull

echo "==> Restarting services..."
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

echo "==> Done. Running containers:"
docker compose -f "$COMPOSE_FILE" ps
