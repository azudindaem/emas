import { type NextRequest, NextResponse } from 'next/server'

// Middleware runs on edge runtime — we pass host header through.
// Actual tenant resolution happens in server components via API or DB (Node.js runtime).
export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-forwarded-host', host)

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|tenant-not-found).*)'],
}
