'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'
import { useLocale } from '@/lib/locale'
import {
  LayoutDashboard,
  ShoppingCart,
  User,
  Package,
  Warehouse,
  Truck,
  FileText,
  Wallet,
  TrendingUp,
  Users,
  Bell,
  Tag,
  Palette,
  ShieldCheck,
  Settings,
  LogOut,
  ChevronRight,
} from 'lucide-react'

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { t } = useLocale()

  const navItems = [
    { href: '/dashboard', label: t.nav.overview, icon: LayoutDashboard },
    { href: '/dashboard/orders', label: t.nav.orders, icon: ShoppingCart },
    { href: '/dashboard/customers', label: t.nav.customers, icon: User },
    { href: '/dashboard/products', label: t.nav.products, icon: Package },
    { href: '/dashboard/inventory', label: t.nav.inventory, icon: Warehouse },
    { href: '/dashboard/shipping', label: t.nav.shipping, icon: Truck },
    { href: '/dashboard/invoices', label: t.nav.invoices, icon: FileText },
    { href: '/dashboard/wallet', label: t.nav.wallet, icon: Wallet },
    { href: '/dashboard/commission', label: t.nav.commission, icon: TrendingUp },
    { href: '/dashboard/coupons', label: t.nav.coupons, icon: Tag },
    { href: '/dashboard/brands', label: t.nav.brands, icon: Palette },
    { href: '/dashboard/roles', label: t.nav.roles, icon: ShieldCheck },
    { href: '/dashboard/team', label: t.nav.team, icon: Users },
    { href: '/dashboard/notifications', label: t.nav.notifications, icon: Bell },
    { href: '/dashboard/settings/shipping', label: t.nav.settings, icon: Settings },
  ]

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-sidebar text-white">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-black font-bold text-sm">
          E
        </div>
        <span className="font-bold text-lg tracking-tight">emas.my</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-primary text-black font-semibold'
                  : 'text-gray-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon size={18} />
              <span>{label}</span>
              {active && <ChevronRight size={14} className="ml-auto" />}
            </Link>
          )
        })}
      </nav>

      {/* User + Logout */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-black font-bold text-xs">
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name ?? 'User'}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email ?? ''}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut size={16} />
          {t.nav.logout}
        </button>
      </div>
    </aside>
  )
}
