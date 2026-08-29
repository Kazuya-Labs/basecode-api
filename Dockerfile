# ---- Stage 1: dependencies (dev deps included so db:push can run) ----
FROM node:24-alpine AS deps
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.22.0 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ---- Stage 2: runtime image ----
FROM node:24-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN corepack enable && corepack prepare pnpm@11.22.0 --activate

COPY --from=deps /app/node_modules ./node_modules

COPY package.json pnpm-lock.yaml drizzle.config.js ./
COPY index.js ./
COPY src ./src
COPY scripts ./scripts

EXPOSE 3000

# Push schema (needs DATABASE_URL), then start the API
CMD ["sh", "-c", "pnpm db:push && pnpm start"]
