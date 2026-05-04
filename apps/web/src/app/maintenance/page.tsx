import { headers } from 'next/headers'
import { prisma } from '@emas/db'
import { Wrench } from 'lucide-react'

export const metadata = {
  title: 'Penyelenggaraan Sistem | Maintenance',
}

export default async function MaintenancePage() {
  const headerList = await headers()
  const host = (headerList.get('x-forwarded-host') ?? headerList.get('host') ?? '').split(':')[0]

  const domain = host
    ? await prisma.tenantDomain.findFirst({
        where: { domain: host, isActive: true },
        include: { tenant: { include: { branding: true } } },
      })
    : null

  const branding = domain?.tenant?.branding
  const storeName = domain?.tenant?.name ?? 'Kedai Kami'
  const primaryColor = branding?.primaryColor ?? '#d97706'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full"
          style={{ backgroundColor: `${primaryColor}20` }}
        >
          <Wrench className="h-10 w-10" style={{ color: primaryColor }} />
        </div>

        {/* Store logo or name */}
        {branding?.logoUrl ? (
          <img src={branding.logoUrl} alt={storeName} className="mx-auto mb-4 h-10 object-contain" />
        ) : (
          <p className="mb-4 text-sm font-semibold tracking-widest uppercase" style={{ color: primaryColor }}>
            {storeName}
          </p>
        )}

        {/* Heading */}
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Sistem Dalam Penyelenggaraan</h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-2">
          Kami sedang melakukan penyelenggaraan untuk meningkatkan perkhidmatan kami.
        </p>
        <p className="text-gray-400 text-sm">Sila cuba lagi sebentar. Terima kasih atas kesabaran anda.</p>

        <hr className="my-8 border-gray-200" />

        <p className="text-xs text-gray-400">
          Jika anda pemilik kedai, sila{' '}
          <a href="/dashboard/settings/system" className="underline hover:text-gray-600">
            log masuk ke dashboard
          </a>{' '}
          untuk mengubah mod sistem.
        </p>
      </div>
    </div>
  )
}
