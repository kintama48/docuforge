.PHONY: help env install dev build test test-api test-frontend test-engine test-e2e docker-up docker-up-bg docker-down docker-build docker-logs

help:
	@echo "DocuForge commands:"
	@echo ""
	@echo "  make env            - Create api/.env from api/.env.example if missing"
	@echo "  make install        - Install API + frontend deps"
	@echo "  make dev            - Run engine + api + frontend locally"
	@echo "  make build          - Build engine + frontend"
	@echo "  make test           - Run engine + api + frontend tests"
	@echo "  make test-api       - Run API tests"
	@echo "  make test-frontend  - Run frontend unit/integration tests"
	@echo "  make test-e2e       - Run frontend Playwright tests"
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
