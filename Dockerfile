# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && pnpm config set store-dir /pnpm/store

# ---- Dependencies ----
FROM base AS deps
WORKDIR /app

# Native Node modules such as better-sqlite3 may need a compiler on a target
# architecture when a matching prebuilt binary is unavailable.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=oktapux-pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --prefer-offline

# ---- Builder ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# ---- Runner ----
FROM base AS runner
WORKDIR /app

# Copy built output and required files
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/server/db/schema.ts ./server/db/schema.ts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Create required directories
RUN mkdir -p /app/uploads /app/data

# Expose internal port
EXPOSE 3000

CMD ["sh", "-c", "touch /app/data/oktapux.db && ./node_modules/.bin/drizzle-kit migrate && node .output/server/index.mjs"]
