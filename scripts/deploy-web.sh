#!/usr/bin/env bash
set -e

export PNPM_HOME="/home/ecetak/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"

STANDALONE="/home/ecetak/webapps/dev-emas/apps/web/.next/standalone"
WEB_SRC="/home/ecetak/webapps/dev-emas/apps/web"
PRISMA_CLIENT="node_modules/.pnpm/@prisma+client@6.19.3_prisma@6.19.3_typescript@5.9.3__typescript@5.9.3/node_modules"

echo "==> Building Next.js..."
cd "$WEB_SRC"
pnpm build

echo "==> Copying static assets..."
cp -r "$WEB_SRC/.next/static" "$STANDALONE/apps/web/.next/static"

echo "==> Copying Prisma engine..."
TARGET="$STANDALONE/$PRISMA_CLIENT/.prisma/client"
SRC="/home/ecetak/webapps/dev-emas/$PRISMA_CLIENT/.prisma/client"
mkdir -p "$TARGET"
cp "$SRC/libquery_engine-debian-openssl-1.0.x.so.node" "$TARGET/" 2>/dev/null || true

echo "==> Restarting PM2..."
pm2 restart emas-web --update-env

echo "==> Done. Checking status..."
sleep 3
curl -sI https://dev.emas.my | grep HTTP
