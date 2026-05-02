import { prisma } from '@emas/db'

export interface TenantContext {
  id: string
  slug: string
  name: string
  plan: string
  features: string[]
  branding: {
    primaryColor: string
    logoUrl: string | null
    faviconUrl: string | null
    companyName: string
  }
}

// Cache tenant resolution for 60s to reduce DB hits
const cache = new Map<string, { value: TenantContext | null; expiresAt: number }>()

export async function resolveTenantFromHost(host: string): Promise<TenantContext | null> {
  // Strip port if present
  const hostname = host.split(':')[0] ?? host
  const now = Date.now()
  const cached = cache.get(hostname)

  if (cached && cached.expiresAt > now) {
    return cached.value
  }

  const domain = await prisma.tenantDomain.findFirst({
    where: { domain: hostname, isActive: true },
    include: {
      tenant: {
        include: {
          branding: true,
          subscription: { include: { plan: true } },
          featureFlags: true,
        },
      },
    },
  })

  if (!domain?.tenant) {
    cache.set(hostname, { value: null, expiresAt: now + 10_000 })
    return null
  }

  const t = domain.tenant
  const result: TenantContext = {
    id: t.id,
    slug: t.slug,
    name: t.name,
    plan: t.subscription?.plan?.code ?? 'free',
    features: t.featureFlags.filter((f) => f.enabled).map((f) => f.feature),
    branding: {
      primaryColor: t.branding?.primaryColor ?? '#000000',
      logoUrl: t.branding?.logoUrl ?? null,
      faviconUrl: t.branding?.faviconUrl ?? null,
      companyName: t.branding?.companyName ?? t.name,
    },
  }

  cache.set(hostname, { value: result, expiresAt: now + 60_000 })
  return result
}

export class TenantResolver {
  async resolveFromHost(host: string): Promise<TenantContext | null> {
    return resolveTenantFromHost(host)
  }
}
