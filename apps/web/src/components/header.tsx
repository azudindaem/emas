'use client'

import { usePathname } from 'next/navigation'

const titles: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/orders': 'Pesanan',
  '/dashboard/products': 'Produk',
  '/dashboard/inventory': 'Inventori',
  '/dashboard/shipping': 'Penghantaran',
  '/dashboard/invoices': 'Invois',
  '/dashboard/wallet': 'Wallet',
  '/dashboard/commission': 'Komisen',
  '/dashboard/team': 'Pasukan',
  '/dashboard/notifications': 'Notifikasi',
}

export function Header() {
  const pathname = usePathname()
  const title = Object.entries(titles)
    .filter(([key]) => pathname === key || (key !== '/dashboard' && pathname.startsWith(key)))
    .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ?? 'Dashboard'

  return (
    <header className="sticky top-0 z-10 flex items-center h-14 px-6 bg-white border-b border-gray-200">
      <h1 className="text-lg font-semibold text-gray-800">{title}</h1>
    </header>
  )
}
