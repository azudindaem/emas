import { type NextRequest, NextResponse } from 'next/server'
import { resolveTenantFromHost } from '@emas/tenancy'

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const tenant = await resolveTenantFromHost(host)

  if (!tenant) {
    return NextResponse.redirect(new URL('/tenant-not-found', request.url))
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-tenant-id', tenant.id)
  requestHeaders.set('x-tenant-slug', tenant.slug)

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|tenant-not-found).*)'],
}
