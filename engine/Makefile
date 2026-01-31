.PHONY: build run dev test check fmt lint clean docker-build docker-run fonts help

# Default target
help:
	@echo "docuforge-engine commands:"
	@echo ""
	@echo "  make build       - Build release binary"
	@echo "  make run         - Run the server (release mode)"
	@echo "  make dev         - Run the server (debug mode, auto-reload with cargo-watch)"
	@echo "  make test        - Run all tests"
	@echo "  make check       - Run cargo check"
	@echo "  make fmt         - Format code"
	@echo "  make lint        - Run clippy"
	@echo "  make clean       - Clean build artifacts"
	@echo ""
	@echo "  make fonts       - Download required fonts (Inter, Roboto, JetBrains Mono)"
	@echo ""
	@echo "  make docker-build - Build Docker image"
	@echo "  make docker-run   - Run Docker container"
	@echo ""
	@echo "  make curl-health  - Test health endpoint"
	@echo "  make curl-render  - Test render endpoint with hello world"

# Build
build:
	cargo build --release

# Run release binary
run: build
	./target/release/docuforge-engine

# Development mode with auto-reload (requires cargo-watch)
dev:
	@command -v cargo-watch >/dev/null 2>&1 || { echo "Installing cargo-watch..."; cargo install cargo-watch; }
	cargo watch -x run

# Run tests
test:
	cargo test

# Quick check without building
check:
	cargo check

# Format code
fmt:
	cargo fmt

# Lint with clippy
lint:
	cargo clippy -- -D warnings

# Clean build artifacts
clean:
	cargo clean

# Download fonts to assets/fonts/
FONT_DIR := assets/fonts
fonts:
	@mkdir -p $(FONT_DIR)
	@echo "Downloading Inter..."
	@curl -sL "https://github.com/rsms/inter/releases/download/v4.0/Inter-4.0.zip" -o /tmp/inter.zip
	@unzip -q -o /tmp/inter.zip -d /tmp/inter
	@cp /tmp/inter/Inter-4.0/InterVariable.ttf $(FONT_DIR)/
	@cp /tmp/inter/Inter-4.0/InterVariable-Italic.ttf $(FONT_DIR)/
	@rm -rf /tmp/inter /tmp/inter.zip
	@echo "Downloading Roboto..."
	@curl -sL "https://github.com/googlefonts/roboto/releases/download/v2.138/roboto-unhinted.zip" -o /tmp/roboto.zip
	@unzip -q -o /tmp/roboto.zip -d /tmp/roboto
	@cp /tmp/roboto/*.ttf $(FONT_DIR)/
	@rm -rf /tmp/roboto /tmp/roboto.zip
	@echo "Downloading JetBrains Mono..."
	@curl -sL "https://github.com/JetBrains/JetBrainsMono/releases/download/v2.304/JetBrainsMono-2.304.zip" -o /tmp/jbmono.zip
	@unzip -q -o /tmp/jbmono.zip -d /tmp/jbmono
	@cp /tmp/jbmono/fonts/ttf/*.ttf $(FONT_DIR)/
	@rm -rf /tmp/jbmono /tmp/jbmono.zip
	@echo "Fonts installed to $(FONT_DIR):"
	@ls -la $(FONT_DIR)

# Docker commands
docker-build:
	docker build -f docker/Dockerfile -t docuforge-engine:latest .

docker-run:
	docker run -p 3001:3001 --rm docuforge-engine:latest

# Quick curl tests
curl-health:
	curl -s http://localhost:3001/health | jq .

curl-render:
	@curl -s -X POST http://localhost:3001/render \
		-H "Content-Type: application/json" \
		-d '{"template":{"main":"m.typ","files":{"m.typ":"Hello, World!"}}}' \
		--output /tmp/test.pdf && \
	echo "PDF saved to /tmp/test.pdf" && \
	file /tmp/test.pdf
