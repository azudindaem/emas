FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/tenancy/package.json ./packages/tenancy/
RUN pnpm install --frozen-lockfile --filter @emas/api...

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY . .
RUN pnpm --filter @emas/db db:generate
RUN pnpm --filter @emas/api build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S emas && adduser -S emas -G emas
COPY --from=builder --chown=emas:emas /app/apps/api/dist ./dist
COPY --from=builder --chown=emas:emas /app/node_modules ./node_modules
COPY --from=builder --chown=emas:emas /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=emas:emas /app/packages/db/prisma ./prisma
USER emas
EXPOSE 3001
CMD ["node", "dist/main.js"]
