FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/tenancy/package.json ./packages/tenancy/
COPY packages/sdk/package.json ./packages/sdk/
COPY packages/ui/package.json ./packages/ui/
RUN pnpm install --frozen-lockfile --filter @emas/web...

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @emas/web build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S emas && adduser -S emas -G emas
COPY --from=builder --chown=emas:emas /app/apps/web/.next/standalone ./
COPY --from=builder --chown=emas:emas /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=emas:emas /app/apps/web/public ./apps/web/public
USER emas
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
