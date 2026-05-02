FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/worker/package.json ./apps/worker/
COPY packages/db/package.json ./packages/db/
RUN pnpm install --frozen-lockfile --filter @emas/worker...

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @emas/db db:generate
RUN pnpm --filter @emas/worker build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S emas && adduser -S emas -G emas
COPY --from=builder --chown=emas:emas /app/apps/worker/dist ./dist
COPY --from=builder --chown=emas:emas /app/node_modules ./node_modules
USER emas
CMD ["node", "dist/main.js"]
