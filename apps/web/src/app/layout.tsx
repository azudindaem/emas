import { getTenantContext } from '@/lib/tenant'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'emas.my',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const tenant = await getTenantContext()

  return (
    <html lang="ms">
      <body data-tenant-id={tenant.id} data-tenant-slug={tenant.slug}>
        {children}
      </body>
    </html>
  )
}
