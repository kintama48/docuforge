.PHONY: build run dev test check fmt lint clean docker-build docker-run fonts help

# Default target
help:
	@echo "docuforge-engine commands:"
	@echo ""
	@echo "  make build       - Build release binary"
	@echo "  make run         - Run the server (release mode)"
	@echo "  make dev         - Run the server (debug mode)"
	@echo "  make watch       - Run with auto-reload (installs cargo-watch if needed)"
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

# Development mode - simple debug build and run
dev:
	cargo run

# Development mode with auto-reload (requires cargo-watch)
watch:
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
	@rm -rf /tmp/docuforge-fonts && mkdir -p /tmp/docuforge-fonts
	@echo "Downloading Inter..."
	@curl -sL "https://github.com/rsms/inter/releases/download/v4.0/Inter-4.0.zip" -o /tmp/docuforge-fonts/inter.zip
	@cd /tmp/docuforge-fonts && unzip -q -o inter.zip && cp InterVariable.ttf InterVariable-Italic.ttf $(CURDIR)/$(FONT_DIR)/
	@echo "Downloading Roboto..."
	@curl -sL "https://github.com/googlefonts/roboto/releases/download/v2.138/roboto-unhinted.zip" -o /tmp/docuforge-fonts/roboto.zip
	@cd /tmp/docuforge-fonts && unzip -q -o roboto.zip && cp Roboto*.ttf $(CURDIR)/$(FONT_DIR)/
	@echo "Downloading JetBrains Mono..."
	@curl -sL "https://github.com/JetBrains/JetBrainsMono/releases/download/v2.304/JetBrainsMono-2.304.zip" -o /tmp/docuforge-fonts/jbmono.zip
	@cd /tmp/docuforge-fonts && unzip -q -o jbmono.zip && cp fonts/ttf/JetBrainsMono-*.ttf $(CURDIR)/$(FONT_DIR)/
	@rm -rf /tmp/docuforge-fonts
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
		-d '{"template":{"main":"main.typ","files":{"main.typ":"= Hello World\n\nThis is a test document."}}}' \
		--output /tmp/test.pdf && \
	echo "PDF saved to /tmp/test.pdf" && \
	file /tmp/test.pdf && \
	ls -la /tmp/test.pdf

curl-invoice:
	@curl -s -X POST http://localhost:3001/render \
		-H "Content-Type: application/json" \
		-d '{"template":{"main":"main.typ","files":{"main.typ":"#let d = sys.inputs\n= Invoice #d.id\nCustomer: #d.customer\nTotal: $$#d.total"}},"data":{"id":"INV-001","customer":"John Doe","total":199.99}}' \
		--output /tmp/invoice.pdf && \
	echo "Invoice saved to /tmp/invoice.pdf" && \
	file /tmp/invoice.pdf
