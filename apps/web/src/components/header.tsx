'use client'

import { usePathname } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { Globe, Check, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useLocale, type Locale } from '@/lib/locale'

const NAV_KEYS: Record<string, keyof ReturnType<typeof useLocale>['t']['nav']> = {
  '/dashboard': 'overview',
  '/dashboard/orders': 'orders',
  '/dashboard/products': 'products',
  '/dashboard/inventory': 'inventory',
  '/dashboard/shipping': 'shipping',
  '/dashboard/invoices': 'invoices',
  '/dashboard/wallet': 'wallet',
  '/dashboard/commission': 'commission',
  '/dashboard/team': 'team',
  '/dashboard/notifications': 'notifications',
  '/dashboard/coupons': 'coupons',
  '/dashboard/brands': 'brands',
  '/dashboard/roles': 'roles',
}

const LOCALE_FLAGS: Record<Locale, string> = { ms: '🇲🇾', en: '🇬🇧' }

interface HeaderProps {
  sidebarCollapsed?: boolean
  onToggleSidebar?: () => void
}

export function Header({ sidebarCollapsed = false, onToggleSidebar }: HeaderProps) {
  const pathname = usePathname()
  const { t, locale, setLocale } = useLocale()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const navKey = Object.entries(NAV_KEYS)
    .filter(([key]) => pathname === key || (key !== '/dashboard' && pathname.startsWith(key)))
    .sort((a, b) => b[0].length - a[0].length)[0]?.[1]

  const title = navKey ? t.nav[navKey] : 'Dashboard'

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const locales: { key: Locale; label: string }[] = [
    { key: 'ms', label: t.language.ms },
    { key: 'en', label: t.language.en },
  ]

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between h-14 px-6 bg-white border-b border-gray-200">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
        <h1 className="text-lg font-semibold text-gray-800">{title}</h1>
      </div>

      {/* Language Switcher */}
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors border border-gray-200"
        >
          <Globe size={15} />
          <span className="font-medium">{LOCALE_FLAGS[locale]} {t.language[locale]}</span>
        </button>

        {open && (
          <div className="absolute right-0 mt-1.5 w-44 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50">
            <p className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">{t.language.label}</p>
            {locales.map(l => (
              <button
                key={l.key}
                onClick={() => { setLocale(l.key); setOpen(false) }}
                className={`flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                  locale === l.key ? 'text-primary-dark font-semibold' : 'text-gray-700'
                }`}
              >
                <span>{LOCALE_FLAGS[l.key]} {l.label}</span>
                {locale === l.key && <Check size={14} />}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  )
}
