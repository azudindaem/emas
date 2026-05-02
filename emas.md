emas.my E-commerce Management & Automation System

## Execution Checklist (Proceed One by One)

### Phase 1 - Critical MVP
- [x] Foundation setup (web live, api live, db + tenancy + auth basic)
- [x] Order Management CRUD API
- [x] Product + Variation CRUD API
- [x] Inventory (stock, reserve, movement log)
- [x] Team roles + RBAC enforcement
- [x] Invoice generation (seller + customer)
- [x] Order status workflow + payment status workflow
- [x] Basic notification (email queue)

### Phase 2 - Courier Integration
- [ ] Courier account management
- [ ] AWB generation + tracking
- [ ] Label printing
- [ ] Bulk AWB creation

### Phase 3 - Commission + Wallet
- [ ] Commission engine (sales, recruitment, channel, network)
- [ ] Wallet account + transactions
- [ ] Commission payout flow

### Current Step In Progress
- [ ] Step 7: Courier account management + AWB base flow

## GitHub-First Starter Blueprint (dev.emas.my -> emas.my)

### Technology Stack (Recommended)

#### Core Platform
- Frontend: Next.js 15 (App Router) + TypeScript
- Backend: NestJS (TypeScript) micro-modular API
- Database: PostgreSQL 16
- ORM: Prisma
- Cache/Queue: Redis + BullMQ
- Object Storage: S3 compatible storage (AWS S3 or Cloudflare R2)
- Search (optional): Meilisearch

#### Authentication and Access
- Auth: Auth.js or Clerk (choose one)
- Authorization: RBAC + tenant-aware permission matrix
- Security: JWT rotation + refresh token revoke + per-tenant rate limit

#### SaaS and White Label
- Tenancy Model: Shared DB + shared schema + mandatory tenant_id
- Tenant Resolution: Subdomain or custom domain mapping
- White Label Layer:
	- Theme tokens (brand color, logo, favicon, typography)
	- Custom email templates per tenant
	- Custom domain + SSL automation
	- Feature flags per tenant plan

#### DevOps
- Source Control: GitHub (monorepo)
- CI/CD: GitHub Actions + Environments (dev, staging, prod)
- Container: Docker
- Infrastructure: Terraform
- Monitoring: Sentry + OpenTelemetry + Grafana
- Edge/CDN: Cloudflare

---

### Monorepo Structure (Recommended)

apps/
- web/ (Next.js customer-facing and admin UI)
- api/ (NestJS core API)
- worker/ (BullMQ jobs: notifications, invoice, sync)

packages/
- ui/ (shared white-label component system)
- config/ (eslint, tsconfig, prettier, env schema)
- sdk/ (typed API client)
- tenancy/ (tenant resolver, domain matcher, branding loader)
- billing/ (subscription, usage meter, invoice rules)

infra/
- terraform/
- docker/
- github-actions/

docs/
- architecture/
- runbooks/
- security/

---

### Database Design for Multitenant

#### Required Columns (all tenant-owned tables)
- id (uuid)
- tenant_id (uuid, indexed)
- created_at, updated_at
- created_by, updated_by (optional)

#### Isolation Rules
- Every query must include tenant context
- Prisma middleware enforces tenant_id injection
- PostgreSQL Row Level Security for critical financial tables
- Audit table stores tenant_id + actor + action + before_after snapshot

#### Critical Base Tables
- tenants
- tenant_domains
- tenant_branding
- tenant_feature_flags
- users
- memberships
- roles
- permissions
- plans
- subscriptions
- usage_metrics
- audit_logs

---

### Domain and Environment Strategy

#### Environments
- Development: dev.emas.my
- Staging: stg.emas.my
- Production: emas.my

#### Tenant Routing
- Subdomain mode: tenant-a.dev.emas.my and tenant-a.emas.my
- Custom domain mode: app.tenantbrand.com mapped to tenant_id
- SSL: automatic issuance and renewal via Cloudflare or ACM

---

### GitHub Workflow (From Day 1)

#### Branching
- main: production-ready
- develop: integration for dev/staging
- feature/*: feature work
- hotfix/*: production fixes

#### Pull Request Rules
- Required 1-2 code reviews
- Required checks: lint, typecheck, unit tests, build
- No direct push to main

#### GitHub Environments
- dev: auto deploy from develop
- staging: auto deploy from release candidate
- production: manual approval deploy from main tag

---

### CI/CD Pipeline (Minimum)

1. Validate
- Install dependencies
- Lint
- Typecheck
- Unit tests

2. Build
- Build web
- Build api
- Build worker
- Build Docker images

3. Deploy Dev
- Trigger on push to develop
- Run DB migration (safe mode)
- Deploy app and worker

4. Deploy Production
- Trigger on version tag
- Require approval
- Run migration with rollback plan
- Deploy blue/green or rolling

---

### 30-Day Launch Plan (Execution Blueprint)

#### Week 1: Foundation
- Initialize monorepo
- Setup lint, format, test
- Setup PostgreSQL, Redis, Prisma
- Create tenants + users + memberships schema
- Setup GitHub Actions basic CI

#### Week 2: Tenant Core
- Build tenant resolver (subdomain/custom domain)
- Build auth + RBAC
- Enforce tenant middleware in API and Prisma
- Implement tenant branding loader

#### Week 3: SaaS Controls
- Subscription plans and feature flags
- Usage metering and limits
- Billing event model (ready for payment integration)
- Audit log and admin activity feed

#### Week 4: Production Readiness
- Error tracking and tracing
- Backup and restore drill
- Security hardening (rate limit, WAF, secret rotation)
- CI/CD promotion flow dev -> staging -> prod
- Soft launch first tenant

---

### Non-Negotiable Readiness Checklist

- Tenant data isolation tested
- Backup restore tested end-to-end
- Zero secret in repository
- Per-tenant role matrix validated
- Custom domain verification flow working
- SSL automation verified
- Alerting for failed jobs and payment events
- Incident runbook documented

---

### Immediate Next Steps (Actionable)

1. Create GitHub monorepo and protection rules
2. Initialize apps/web, apps/api, apps/worker
3. Create Prisma schema for tenants, users, subscriptions
4. Implement tenant resolver middleware
5. Setup first CI workflow (lint, typecheck, test, build)
6. Deploy first internal dev version to dev.emas.my

## Feature Comparison Matrix

| Feature Category | Fighter Features | WSAPME Status | Priority |
|---|---|---|---|
| **ORDER MANAGEMENT** | | | |
| Order Creation | ✅ Web, API, Manual | To Build | Critical |
| Bulk Orders | ✅ Yes | To Build | High |
| Quick Entry | ✅ Yes | To Build | High |
| Order Status Tracking | ✅ Multi-status | To Build | Critical |
| Payment Status | ✅ Pending/Confirmed | To Build | Critical |
| Order Notifications | ✅ Email/SMS/WhatsApp | To Build | High |
| Order Deduplication | ✅ Duplicate Checker | To Build | Medium |
| Payment Protection | ✅ Yes | To Build | Medium |
| **PRODUCT MANAGEMENT** | | | |
| Product Variations | ✅ Size, Color, etc | To Build | Critical |
| SKU Management | ✅ Unique SKU per variant | To Build | Critical |
| Bulk Variations Import | ✅ CSV Import | To Build | High |
| Barcode/QR Labels | ✅ Yes | To Build | Medium |
| Product Restrictions | ✅ By role/user | To Build | Medium |
| Product Categories | ✅ Multiple | To Build | Critical |
| Product Brands | ✅ Multiple | To Build | High |
| Product Vendors | ✅ Multiple | To Build | High |
| **INVENTORY** | | | |
| Stock Tracking | ✅ Real-time | To Build | Critical |
| Multi-Warehouse | ✅ Yes | To Build | High |
| Reserved Stock | ✅ Yes | To Build | Critical |
| Stock Movement Log | ✅ Audit Trail | To Build | High |
| **INVOICING** | | | |
| Invoice for Seller | ✅ Tax Invoice | To Build | Critical |
| Invoice for Customer | ✅ Purchase Invoice | To Build | Critical |
| Delivery Notes | ✅ Yes | To Build | Critical |
| Cloud Printing | ✅ Yes | To Build | Medium |
| **SHIPPING & AWB** | | | |
| Courier Integration | ✅ 9 providers | To Build | Critical |
| AWB Generation | ✅ Instant | To Build | Critical |
| Bulk AWB Creation | ✅ Batch processing | To Build | Critical |
| Label Printing | ✅ PDF/Direct Print | To Build | Critical |
| Shipping Rates | ✅ Dynamic pricing | To Build | High |
| Self Pickup | ✅ Yes | To Build | Low |
| Custom Labels | ✅ Up to 3 per brand | To Build | Medium |
| Shipping Automation | ✅ Auto-assign/generate | To Build | High |
| Shipping Discount | ✅ Rule-based | To Build | Medium |
| **TEAM MANAGEMENT** | | | |
| Custom Roles | ✅ Unlimited | To Build | Critical |
| User Levels | ✅ 1-15 maximum | To Build | Critical |
| User Ranking | ✅ Real-time | To Build | High |
| Role Automation | ✅ KPI-based | To Build | High |
| Activity Logging | ✅ Complete audit | To Build | High |
| **COMMISSION SYSTEM** | | | |
| Sales Commission | ✅ Per order | To Build | Critical |
| Recruitment Commission | ✅ Downline earnings | To Build | Critical |
| Channel Commission | ✅ Channel-based | To Build | High |
| Network Commission | ✅ Multi-level | To Build | High |
| Point Rewards | ✅ Point system | To Build | High |
| Same Level Commission | ✅ Peer commission | To Build | Medium |
| ROI Tracking | ✅ Return on Investment | To Build | Medium |
| ROAS Tracking | ✅ Return on Ad Spend | To Build | Medium |
| Bonus Distribution | ✅ Manual/Automatic | To Build | High |
| Allowance Allocation | ✅ Fixed/Variable | To Build | Medium |
| Commission Hold | ✅ Configurable days | To Build | High |
| Payout via Billplz | ✅ Mass payout | To Build | High |
| **COUPONS & DISCOUNTS** | | | |
| Dynamic Coupon | ✅ Rule-based | To Build | Medium |
| Cart Discount | ✅ Percentage/Fixed | To Build | Medium |
| Cart Adjustment | ✅ Manual adjustment | To Build | Low |
| Dynamic Pricing | ✅ Rule-based | To Build | Medium |
| **WALLET SYSTEM** | | | |
| User Wallet | ✅ Internal balance | To Build | High |
| Wallet Transfer | ✅ User to User | To Build | High |
| Wallet Reload | ✅ Via CHIP/Billplz | To Build | High |
| Transaction History | ✅ Detailed log | To Build | High |
| **PAYMENTS** | | | |
| COD Support | ✅ Yes | To Build | Critical |
| Online Payments | ✅ 10+ gateways | To Build | Critical |
| Payment Methods | ✅ Multi-option | To Build | Critical |
| Installment (Atome) | ✅ Yes | To Build | Medium |
| **NOTIFICATIONS** | | | |
| Email Notifications | ✅ SMTP | To Build | High |
| SMS Notifications | ✅ AdaSMS, SMS Niaga | To Build | High |
| WhatsApp Official | ✅ WABA | To Build | High |
| WhatsApp Unofficial | ✅ Multiple providers | To Build | High |
| Notification Frequency | ✅ Daily/Weekly/Monthly | To Build | Medium |
| Seller Custom Channels | ✅ Per-account setup | To Build | Medium |
| Brand Custom Channels | ✅ Per-brand setup | To Build | High |
| **ANALYTICS & REPORTS** | | | |
| Order Statistics | ✅ Count/Revenue/AVG | To Build | High |
| User Rankings | ✅ Multiple metrics | To Build | High |
| Sales Reports | ✅ By period | To Build | High |
| Wallet Reports | ✅ Balance/Transactions | To Build | High |
| Commission Reports | ✅ Detailed breakdown | To Build | High |
| Data Export | ✅ CSV/Excel | To Build | High |
| **BRAND MANAGEMENT** | | | |
| Multi-Brand Support | ✅ Yes | To Build | High |
| Brand Restrictions | ✅ Rules & limits | To Build | High |
| Brand Configuration | ✅ Custom settings | To Build | High |
| Brand Notifications | ✅ Custom channels | To Build | High |
| Brand Payment Collection | ✅ Separate IDs | To Build | High |
| **ADVANCED FEATURES** | | | |
| Fraud Checker | ✅ Detection system | To Build | Medium |
| Claimify (Ad Tracking) | ✅ Cost/Claims tracking | To Build | Low |
| White Label | ✅ Full support | To Build | Medium |
| Custom Domain | ✅ Yes | To Build | Medium |
| Role Automation | ✅ KPI-based | To Build | High |
| Autopilot | ✅ Workflow automation | To Build | Medium |
| **INTEGRATIONS** | | | |
| Couriers | ✅ 9 providers | To Build | Critical |
| Payment Gateways | ✅ 10+ providers | To Build | Critical |
| E-commerce | ✅ 4 platforms | To Build | High |
| Notification Services | ✅ 5+ services | To Build | High |
| Webhooks (AirHooks) | ✅ Custom webhooks | To Build | Medium |

---

## Priority Implementation Order

### Phase 1: Critical MVP Features (Weeks 1-4)
```
✓ Order Management (Create, Read, Update, Delete)
✓ Product Variations & SKU System
✓ Inventory Tracking (Stock, Reserved Stock)
✓ Team Management with Custom Roles
✓ Invoice Generation (Seller + Customer)
✓ Dual Invoice System
✓ Order Status Workflow
✓ Basic Notifications (Email)
```

### Phase 2: Courier Integration (Weeks 5-8)
```
✓ Courier Account Management
✓ AWB Generation & Tracking
✓ Label Printing
✓ Ninjavan Integration
✓ POS Malaysia Integration
✓ J&T Express Integration
✓ DHL Integration
✓ Flash Express Integration
✓ Bulk AWB Creation
```

### Phase 3: Commission & Wallets (Weeks 9-11)
```
✓ Multi-tier Commission Calculation
✓ Sales Commission
✓ Recruitment Commission
✓ Channel Commission
✓ Network Commission
✓ Point System
✓ Wallet System
✓ Wallet Transfer
✓ Commission Payout
```

### Phase 4: Advanced Features (Weeks 12-14)
```
✓ Dynamic Coupon System
✓ Dynamic Pricing Rules
✓ Shipping Automation
✓ Role Automation (Auto-upgrade/downgrade)
✓ Duplicate Order Checker
✓ Order Deduplication
✓ Brand Management
✓ Product Restrictions
```

### Phase 5: Multi-Channel Integration (Weeks 15-17)
```
✓ WooCommerce Integration & Sync
✓ Shopify Integration
✓ Shoppegram Integration
✓ OnPay Integration
✓ Facebook/Instagram Integration
✓ Order Sync Engine
✓ Real-time Webhook Handling
```

### Phase 6: Payment Gateway Integration (Weeks 18-20)
```
✓ CHIP Integration
✓ Billplz Integration
✓ ToyyibPay Integration
✓ Bizappay Integration
✓ SecurePay Integration
✓ SenangPay Integration
✓ Stripe Integration
✓ HitPay Integration
✓ Atome Integration
```

### Phase 7: Notifications & Automation (Weeks 21-23)
```
✓ Official WhatsApp (WABA)
✓ Unofficial WhatsApp (WasapBot, WaBot, etc)
✓ SMS Integration (AdaSMS)
✓ Email Digests (Daily/Weekly/Monthly)
✓ Seller Custom Notification Channels
✓ Brand Custom Notification Channels
✓ Notification Frequency Control
```

### Phase 8: Analytics & Advanced (Weeks 24-26)
```
✓ Advanced User Ranking
✓ KPI-based Metrics
✓ Data Export with Date Ranges
✓ Claimify (Ad Cost Tracking)
✓ Fraud Detection
✓ Activities/Audit Log
✓ Cloud Printing Integration
✓ White Label Features
✓ Custom Domain Support
```

### Phase 9: Testing & Launch (Weeks 27-30)
```
✓ Comprehensive Testing
✓ Performance Optimization
✓ Security Audit
✓ Documentation
✓ User Training
✓ Go-Live
```

---

## Fighter Features Summary

| Metric | Count |
|--------|-------|
| Couriers Supported | 9 |
| Payment Gateways | 10+ |
| Notification Channels | 5 |
| E-commerce Platforms | 4 |
| Commission Types | 7 |
| User Roles | 1-15 (Unlimited) |
| Product Variations | Unlimited |
| Total Features | 80+ |

---

## Key Business Features (Fighter-specific)

### 1. Multi-level Commission (7 Types)
- Sales (direct order commission)
- Recruitment (downline earnings)
- Channel (channel-based commission)
- Network (multi-level from entire network)
- Point (point-based rewards)
- Same Level (peer/team commission)
- Share Profits (ROI, ROAS, Bonus, Allowance)

### 2. Role Automation
- Auto-upgrade when KPI targets reached
- Auto-downgrade on KPI failure
- Custom KPI rules per role
- Real-time ranking updates

### 3. Wallet System
- Internal seller wallet
- Wallet-to-wallet transfers
- Wallet reload via CHIP/Billplz
- Commission auto-deposit to wallet
- Wallet payout management

### 4. Brand Management
- Separate payment collection per brand
- Custom notification channels per brand
- Brand-specific AWB options
- Brand restrictions & rules
- Per-brand inventory tracking

### 5. Advanced Analytics
- Real-time user ranking
- KPI-based performance metrics
- ROI/ROAS tracking
- Claimify (ad spend management)
- Activities/Audit trail
- Export with date ranges

---

## Database Tables Needed (Fighter-based)

### Core Order (5)
order_v2, order_v2_items, order_v2_shipment, order_v2_payment_history, order_v2_invoice

### Products (4)
product_v2, product_variation_v2, product_warehouse_stock, product_movement_log

### Team & Commission (7)
team_members, commission_rules, commission_detail, team_performance, user_ranking, role_automation_rules, activities_log

### Couriers (3)
courier_account, courier_awb_tracking, courier_rate_cache

### Payments & Wallet (3)
payment_method_config, wallet_account, wallet_transaction

### Coupons & Brands (3)
dynamic_coupon, dynamic_pricing_rules, brand_config

### System & Notifications (4)
webhook_events, notification_queue, notification_config, fraud_detection_log

**Total: 29 Tables**

---

## Implementation Strategy (Fighter-aligned)

1. **Modular Architecture**: Each feature module independent
2. **API-First**: Build APIs before UI
3. **Database Foundation**: Get schema right first
4. **Incremental Rollout**: Phase-by-phase implementation
5. **Testing Focus**: Especially on commission calculations
6. **Integration Priority**: Couriers first, then payments
7. **User Feedback**: Early adopter testing after Phase 2
8. **Documentation**: Parallel with development
