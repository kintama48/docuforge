.PHONY: help env install dev build test test-api test-api-pipeline test-frontend test-engine test-e2e clean clean-engine clean-check docker-up docker-up-bg docker-down docker-build docker-logs install-zapier test-zapier validate-zapier install-shopify dev-shopify test-shopify install-plugins

help:
	@echo "DocuForge commands:"
	@echo ""
	@echo "  make env            - Create api/.env from api/.env.example if missing"
	@echo "  make install        - Install API + frontend deps"
	@echo "  make dev            - Run engine + api + frontend locally"
	@echo "  make build          - Build engine + frontend"
	@echo "  make test           - Run engine + api + frontend tests"
	@echo "  make test-api       - Run API tests"
	@echo "  make test-api-pipeline - Run API->engine pipeline tests (engine must be running)"
	@echo "  make test-frontend  - Run frontend unit/integration tests"
	@echo "  make test-e2e       - Run frontend Playwright tests"
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
	@echo "  make docker-up      - Build and run full stack (foreground)"
	@echo "  make docker-up-bg   - Build and run full stack (detached)"
	@echo "  make docker-down    - Stop stack and remove volumes"
	@echo "  make docker-build   - Build docker images"
	@echo "  make docker-logs    - Tail docker logs"

env:
	@test -f api/.env || cp api/.env.example api/.env

install:
	cd api && bun install
	cd frontend && bun install

dev: env
	@trap 'kill 0' INT TERM EXIT; \
		(cd engine && cargo run) & \
		(cd api && bun run dev) & \
		(cd frontend && bun run dev) & \
		wait

build:
	cd engine && cargo build --release
	cd frontend && bun run build

test:
	cd engine && cargo test
	cd api && bun test
	cd frontend && bun run test:run

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

docker-up:
	docker compose up --build

docker-up-bg:
	docker compose up -d --build

docker-down:
	docker compose down -v

docker-build:
	docker compose build

docker-logs:
	docker compose logs -f

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
