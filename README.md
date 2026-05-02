# emas.my

> E-commerce Management & Automation System — SaaS Multitenant + White Label

[![CI](https://github.com/azudindaem/emas/actions/workflows/ci.yml/badge.svg)](https://github.com/azudindaem/emas/actions/workflows/ci.yml)

## Overview

**emas.my** is a fully-featured SaaS platform for e-commerce order management, built as a white-label ready, multitenant system. Each tenant gets isolated data, custom branding, custom domains, and configurable feature flags based on their subscription plan.

- **Development**: [dev.emas.my](https://dev.emas.my)
- **Production**: [emas.my](https://emas.my)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript |
| Backend API | NestJS + TypeScript |
| Background Jobs | BullMQ + Redis |
| Database | PostgreSQL 16 + Prisma ORM |
| Cache | Redis |
| Container | Docker + Docker Compose |
| CI/CD | GitHub Actions |
| CDN / Edge | Cloudflare |

---

## Monorepo Structure

```
apps/
├── api/        NestJS REST API
├── web/        Next.js frontend
└── worker/     BullMQ background processors

packages/
├── db/         Prisma schema + client (shared)
├── tenancy/    Tenant resolver & branding loader
└── sdk/        Typed API fetch client
```

---

## Key Features

- **Multitenant** — shared DB, shared schema, strict `tenant_id` isolation
- **White Label** — per-tenant branding, custom domain, custom SSL
- **Order Management** — create, track, bulk process, deduplication
- **Product & Inventory** — variations, SKU, multi-warehouse, reserved stock
- **Commission System** — 7 types: sales, recruitment, channel, network, point, same-level, bonus
- **Wallet System** — internal wallet, transfers, reload, payout via Billplz
- **Courier Integration** — 9 providers: Ninjavan, POS Malaysia, J&T, DHL, Flash, GDEX, Skynet, Airpak
- **Payment Gateways** — 10+: CHIP, Billplz, ToyyibPay, Stripe, HitPay, Atome, and more
- **Notifications** — Email, SMS, WhatsApp Official (WABA), WhatsApp Unofficial
- **RBAC** — unlimited custom roles, 1-15 user levels, KPI-based auto role upgrade/downgrade
- **Brand Management** — multi-brand per tenant, separate payment collection, custom AWB
- **Analytics** — real-time ranking, KPI metrics, ROI/ROAS, export CSV/Excel

---

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 9
- Docker & Docker Compose

### Local Development

```bash
# Clone
git clone git@github.com:azudindaem/emas.git
cd emas

# Install dependencies
pnpm install

# Copy env file
cp .env.example .env
# Edit .env with your local values

# Start database and redis
docker compose -f docker-compose.dev.yml up postgres redis -d

# Run DB migrations
pnpm db:migrate

# Start all apps
pnpm dev
```

| Service | URL |
|---|---|
| Web | http://localhost:3000 |
| API | http://localhost:3001 |
| API Docs (Swagger) | http://localhost:3001/api/docs |

---

## Deployment

### Branch Strategy

| Branch | Environment | Deploy |
|---|---|---|
| `develop` | dev.emas.my | Auto on push |
| `main` | emas.my | Manual approval on tag |

### Release to Production

```bash
git tag v1.0.0
git push origin v1.0.0
```

This triggers the production deploy workflow with manual approval gate.

### Required GitHub Secrets

| Secret | Description |
|---|---|
| `DEV_HOST` | Dev server IP or hostname |
| `DEV_USER` | SSH username for dev server |
| `DEV_SSH_KEY` | SSH private key for dev server |
| `PROD_HOST` | Production server IP or hostname |
| `PROD_USER` | SSH username for production server |
| `PROD_SSH_KEY` | SSH private key for production server |

---

## Database Schema

29+ models covering full SaaS platform:

- **Tenant layer**: `Tenant`, `TenantDomain`, `TenantBranding`, `Plan`, `Subscription`, `FeatureFlag`
- **Users & Access**: `User`, `Membership`, `Role`
- **Products**: `Product`, `ProductVariation`, `Warehouse`, `ProductStock`, `StockMovement`
- **Orders**: `Order`, `OrderItem`, `OrderShipment`, `OrderPayment`, `Invoice`
- **Commerce**: `CourierAccount`, `Wallet`, `WalletTransaction`, `CommissionRule`
- **Platform**: `Brand`, `NotificationConfig`, `AuditLog`

---

## Implementation Phases

| Phase | Scope | Weeks |
|---|---|---|
| 1 | Order, Product, Inventory, Roles, Invoice | 1–4 |
| 2 | Courier Integration, AWB, Label Printing | 5–8 |
| 3 | Commission System, Wallet, Payout | 9–11 |
| 4 | Coupons, Dynamic Pricing, Role Automation | 12–14 |
| 5 | WooCommerce, Shopify, Webhook Sync | 15–17 |
| 6 | Payment Gateways (CHIP, Billplz, Stripe…) | 18–20 |
| 7 | WhatsApp, SMS, Email Automation | 21–23 |
| 8 | Analytics, Fraud Detection, White Label | 24–26 |
| 9 | Testing, Security Audit, Go-Live | 27–30 |

---

## License

Private — All rights reserved © 2026 emas.my

