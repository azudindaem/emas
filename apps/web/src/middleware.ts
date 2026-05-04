import { type NextRequest, NextResponse } from 'next/server'

const MAINTENANCE_BYPASS_PATHS = ['/maintenance', '/dashboard', '/login', '/register', '/_next', '/favicon']

// Middleware runs on edge runtime — we pass host header through.
// Actual tenant resolution happens in server components via API or DB (Node.js runtime).
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = request.headers.get('host') ?? ''
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-forwarded-host', host)

  // Skip maintenance check for dashboard, login, static assets, and the maintenance page itself
  const isBypassed = MAINTENANCE_BYPASS_PATHS.some((p) => pathname.startsWith(p))

  if (!isBypassed) {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') ?? 'http://127.0.0.1:8001'
      const res = await fetch(`${apiBase}/api/v1/tenant/system-mode/status`, {
        headers: { host, 'x-forwarded-host': host },
        cache: 'no-store',
      })
      if (res.ok) {
        const data = (await res.json()) as { mode: string }
        if (data.mode === 'MAINTENANCE') {
          const url = request.nextUrl.clone()
          url.pathname = '/maintenance'
          return NextResponse.redirect(url)
        }
      }
    } catch {
      // If API is unreachable, allow request through
    }
  }

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|tenant-not-found).*)'],
}
