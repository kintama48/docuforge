# Stage 1: Build
# Align the container toolchain with CI's rolling stable Rust channel.
FROM rust:slim AS builder

WORKDIR /build

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# region agent log H1/H4
RUN /bin/sh -lc 'echo "{\"sessionId\":\"178efd\",\"runId\":\"pre-fix\",\"hypothesisId\":\"H1\",\"location\":\"engine/docker/Dockerfile:13\",\"message\":\"builder_tools_presence\",\"data\":{\"curl_path\":\"$(command -v curl || echo missing)\",\"pkg_config_path\":\"$(command -v pkg-config || echo missing)\"},\"timestamp\":$(date +%s)000}"'
# endregion

# Copy manifests first for dependency caching
COPY Cargo.toml Cargo.lock ./

# Create dummy src to build dependencies
RUN mkdir src && echo "fn main() {}" > src/main.rs
# region agent log H2/H3
RUN /bin/sh -lc 'echo "{\"sessionId\":\"178efd\",\"runId\":\"pre-fix\",\"hypothesisId\":\"H3\",\"location\":\"engine/docker/Dockerfile:23\",\"message\":\"swagger_env_probe\",\"data\":{\"swagger_url\":\"${SWAGGER_UI_DOWNLOAD_URL:-unset}\"},\"timestamp\":$(date +%s)000}"'
# endregion
RUN cargo build --release && rm -rf src target/release/docuforge-engine*

# Copy actual source and build
COPY src ./src
RUN cargo build --release

# Stage 2: Runtime
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd --uid 1000 --create-home docuforge

WORKDIR /app

# Copy binary from builder
COPY --from=builder /build/target/release/docuforge-engine /app/docuforge-engine

# Create directories
RUN mkdir -p /app/assets/fonts /tmp/docuforge-cache \
    && chown -R docuforge:docuforge /app /tmp/docuforge-cache

# Copy fonts if present
COPY --chown=docuforge:docuforge assets/fonts/ /app/assets/fonts/

# Switch to non-root user
USER docuforge

# Environment defaults
ENV HOST=0.0.0.0
ENV PORT=3001
ENV FONT_DIR=/app/assets/fonts
ENV CACHE_DIR=/tmp/docuforge-cache
ENV LOG_FORMAT=json

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

CMD ["/app/docuforge-engine"]
