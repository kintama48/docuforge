.PHONY: help env install dev dev-redis build test test-api test-api-pipeline test-frontend test-engine test-e2e test-mcp install-mcp dev-mcp validate-mcp-registry assertions-check clean clean-engine clean-check docker-up docker-up-bg docker-down docker-destroy docker-build docker-logs docker-prod-up docker-prod-up-bg docker-prod-down docker-prod-build docker-prod-logs install-zapier test-zapier validate-zapier install-shopify dev-shopify test-shopify install-plugins

help:
	@echo "DocuForge commands:"
	@echo ""
	@echo "  make env            - Create api/.env from api/.env.example if missing"
	@echo "  make install        - Install API + frontend deps"
	@echo "  make dev            - Run engine + api + frontend locally"
	@echo "  make dev-redis      - Start local Redis dependency in Docker"
	@echo "  make build          - Build engine + frontend"
	@echo "  make test           - Run engine + api + frontend tests"
	@echo "  make test-api       - Run API tests"
	@echo "  make test-api-pipeline - Run API->engine pipeline tests (engine must be running)"
	@echo "  make test-frontend  - Run frontend unit/integration tests"
	@echo "  make test-mcp       - Run MCP server tests"
	@echo "  make validate-mcp-registry - Validate MCP server.json against MCP Registry schema"
	@echo "  make assertions-check - Enforce assertion/cast/panic policy in runtime source files"
	@echo "  make test-e2e       - Run frontend Playwright tests"
	@echo "  make install-mcp    - Install MCP server dependencies"
	@echo "  make dev-mcp        - Run MCP server locally"
	@echo ""
	@echo ""
	@echo "  make install-plugins  - Install Zapier + Shopify plugin deps"
	@echo "  make install-zapier   - Install Zapier plugin deps"
	@echo "  make test-zapier      - Run Zapier plugin tests"
	@echo "  make validate-zapier  - Validate Zapier app"
	@echo "  make install-shopify  - Install Shopify app deps"
	@echo "  make dev-shopify      - Run Shopify app in dev mode"
	@echo "  make test-shopify     - Run Shopify app tests"
	@echo ""
	@echo "  make clean          - Clean all build artifacts (engine + frontend)"
	@echo "  make clean-engine   - Clean only Rust build artifacts"
	@echo "  make clean-check    - Show disk usage of build artifacts"
	@echo ""
	@echo "  make docker-up      - Build and run dev stack (foreground)"
	@echo "  make docker-up-bg   - Build and run dev stack (detached)"
	@echo "  make docker-down    - Stop dev stack and keep volumes"
	@echo "  make docker-destroy - Stop dev stack and delete volumes"
	@echo "  make docker-build   - Build dev docker images"
	@echo "  make docker-logs    - Tail dev docker logs"
	@echo "  make docker-prod-up - Build and run prod stack (foreground, requires .env.prod)"
	@echo "  make docker-prod-up-bg - Build and run prod stack (detached, requires .env.prod)"
	@echo "  make docker-prod-down - Stop prod stack and keep volumes"
	@echo "  make docker-prod-build - Build prod docker images (requires .env.prod)"
	@echo "  make docker-prod-logs - Tail prod docker logs"

env:
	@test -f api/.env || cp api/.env.example api/.env
	@test -f mcp-server/.env || cp mcp-server/.env.example mcp-server/.env

install:
	cd api && bun install
	cd frontend && bun install
	cd mcp-server && bun install

dev: env dev-redis
	@trap 'kill 0' INT TERM EXIT; \
		(cd engine && cargo run) & \
		(cd api && bun run dev) & \
		(cd frontend && bun run dev) & \
		wait

dev-redis: env
	@if command -v ss >/dev/null 2>&1 && ss -ltn '( sport = :6379 )' 2>/dev/null | grep -q ':6379'; then \
		echo "Redis already listening on 127.0.0.1:6379; skipping docker compose redis."; \
	else \
		docker compose up -d redis; \
	fi

build:
	cd engine && cargo build --release
	cd frontend && bun run build

test:
	cd engine && cargo test
	cd api && bun test
	cd frontend && bun run test:run
	cd mcp-server && bun test

test-api:
	cd api && bun test

test-api-pipeline:
	cd api && bun run test:pipeline

test-frontend:
	cd frontend && bun run test:run

test-engine:
	cd engine && cargo test

test-e2e:
	cd frontend && bun run test:e2e

install-mcp:
	cd mcp-server && bun install

dev-mcp:
	cd mcp-server && bun run dev

test-mcp:
	cd mcp-server && bun test

validate-mcp-registry:
	cd mcp-server && bun run validate:registry

assertions-check:
	bun ./scripts/assertions-check.mjs

docker-up:
	docker compose up --build

docker-up-bg:
	docker compose up -d --build

docker-down:
	docker compose down

docker-destroy:
	docker compose down -v

docker-build:
	docker compose build

docker-logs:
	docker compose logs -f

docker-prod-up:
	docker compose --env-file .env.prod -f docker-compose.prod.yml up --build

docker-prod-up-bg:
	docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build

docker-prod-down:
	docker compose --env-file .env.prod -f docker-compose.prod.yml down

docker-prod-build:
	docker compose --env-file .env.prod -f docker-compose.prod.yml build

docker-prod-logs:
	docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f

clean:
	cd engine && cargo clean
	cd frontend && rm -rf .next node_modules/.cache

clean-engine:
	cd engine && cargo clean

clean-check:
	@echo "=== Engine (Rust) ==="
	@du -sh engine/target 2>/dev/null || echo "  No engine/target/"
	@echo ""
	@echo "=== Frontend (Next.js) ==="
	@du -sh frontend/.next frontend/node_modules/.cache 2>/dev/null || echo "  No frontend build cache"
	@echo ""
	@echo "=== API (Bun) ==="
	@du -sh api/node_modules 2>/dev/null || echo "  No api/node_modules/"

# ── Plugins ──────────────────────────────────────────────

install-plugins:
	cd plugins/zapier && npm install
	cd plugins/shopify && npm install

install-zapier:
	cd plugins/zapier && npm install

test-zapier:
	cd plugins/zapier && npm test

validate-zapier:
	cd plugins/zapier && npx zapier validate

install-shopify:
	cd plugins/shopify && npm install

dev-shopify:
	cd plugins/shopify && npx shopify app dev

test-shopify:
	cd plugins/shopify && npm test
