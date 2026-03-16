FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock tsconfig.json ./
RUN bun install --frozen-lockfile
COPY src ./src

FROM oven/bun:1 AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3200
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/src ./src
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/tsconfig.json ./tsconfig.json
RUN if command -v adduser >/dev/null 2>&1; then \
      adduser --disabled-password --gecos "" docuforge; \
    elif command -v useradd >/dev/null 2>&1; then \
      useradd --create-home --shell /bin/bash docuforge; \
    else \
      echo "No supported user creation command found" && exit 1; \
    fi \
    && chown -R docuforge:docuforge /app
USER docuforge
EXPOSE 3200
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:3200/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))" || exit 1
CMD ["bun", "run", "start"]
