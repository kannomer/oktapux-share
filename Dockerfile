FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ---- Dependencies ----
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
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

# Copy built output and required files
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/server/db/schema.ts ./server/db/schema.ts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Create uploads directory
RUN mkdir -p /app/uploads

# Expose internal port
EXPOSE 3000

# Run migrations then start the app
CMD ["sh", "-c", "npx drizzle-kit migrate && node .output/server/index.mjs"]
