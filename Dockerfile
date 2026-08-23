# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && pnpm config set store-dir /pnpm/store

# ---- Dependencies ----
FROM base AS deps
RUN cat /etc/os-release && which apk || true && which apt-get || true
WORKDIR /app

RUN apk add --no-cache \
    python3 \
    make \
    g++

ENV PYTHON=/usr/bin/python3

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

COPY --from=builder /app/.output ./.output
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/server/db/schema.ts ./server/db/schema.ts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

RUN mkdir -p /app/uploads /app/data

EXPOSE 3000

CMD ["sh", "-c", "touch /app/data/oktapux.db && ./node_modules/.bin/drizzle-kit migrate && node .output/server/index.mjs"]
