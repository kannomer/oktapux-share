FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ---- Dependencies ----
FROM base AS deps
WORKDIR /app

RUN apk add --no-cache \
    python3 \
    make \
    g++

ENV PYTHON=/usr/bin/python3

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

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

CMD ["sh", "-c", "mkdir -p /app/data && touch /app/data/oktapux.db && npx drizzle-kit migrate && node .output/server/index.mjs"]
