import { headers } from 'next/headers'
import { prisma } from '@emas/db'
import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/auth-provider'

export const metadata: Metadata = {
  title: 'Emas — Platform Pengurusan Pesanan & Cetakan Malaysia',
  description:
    'Platform SaaS all-in-one untuk urus pesanan, cetak AWB, dan integrasikan kurier kegemaran anda. NinjaVan, J&T, POS Malaysia & lebih lagi.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headerList = await headers()
  const host = (headerList.get('x-forwarded-host') ?? headerList.get('host') ?? '').split(':')[0]

  const domain = host
    ? await prisma.tenantDomain.findFirst({
        where: { domain: host, isActive: true },
        include: { tenant: { include: { branding: true } } },
      })
    : null

  const tenant = domain?.tenant
  const branding = tenant?.branding

  return (
    <html lang="ms">
      <head>
        {branding?.primaryColor && (
          <style>{`:root { --color-primary: ${branding.primaryColor}; }`}</style>
        )}
      </head>
      <body data-tenant-id={tenant?.id ?? ''} data-tenant-slug={tenant?.slug ?? ''}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
