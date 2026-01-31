# Stage 1: Build
FROM rust:1.75-slim AS builder

WORKDIR /build

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy manifests first for dependency caching
COPY Cargo.toml Cargo.lock ./

# Create dummy src to build dependencies
RUN mkdir src && echo "fn main() {}" > src/main.rs
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
