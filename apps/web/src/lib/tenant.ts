import { headers } from 'next/headers'

export interface TenantContext {
  id: string
  slug: string
}

export async function getTenantContext(): Promise<TenantContext> {
  const headerList = await headers()
  const tenantId = headerList.get('x-tenant-id')
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantId || !tenantSlug) {
    throw new Error('Tenant context not found')
  }

  return { id: tenantId, slug: tenantSlug }
}
