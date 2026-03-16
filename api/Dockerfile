FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Build stage (for any compile-time steps)
FROM base AS build
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .

# Production runtime
FROM base AS runtime
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/src ./src
COPY --from=build /app/templates ./templates
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/package.json ./
COPY --from=build /app/drizzle.config.ts ./
COPY --from=build /app/tsconfig.json ./

# Create non-root user (works across Debian/Alpine variants)
RUN if command -v adduser >/dev/null 2>&1; then \
      adduser --disabled-password --gecos "" docuforge; \
    elif command -v useradd >/dev/null 2>&1; then \
      useradd --create-home --shell /bin/bash docuforge; \
    else \
      echo "No supported user creation command found" && exit 1; \
    fi
USER docuforge

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:3000/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))" || exit 1

CMD ["bun", "run", "src/index.ts"]
