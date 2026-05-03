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

interface SidebarProps {
  collapsed?: boolean
}

export function Sidebar({ collapsed = false }: SidebarProps) {
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
    <aside className={`flex flex-col min-h-screen border-r border-slate-200 bg-white text-black transition-all duration-200 ${collapsed ? 'w-20' : 'w-64'}`}>
      {/* Logo */}
      <div className={`flex items-center border-b border-slate-200 ${collapsed ? 'justify-center px-2 py-5' : 'gap-2 px-6 py-5'}`}>
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-black font-bold text-sm">
          E
        </div>
        {!collapsed && <span className="font-bold text-lg tracking-tight">emas.my</span>}
      </div>

      {/* Nav */}
      <nav className={`flex-1 py-4 space-y-0.5 overflow-y-auto ${collapsed ? 'px-2' : 'px-3'}`}>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-primary/20 text-black font-semibold border border-primary/60'
                  : 'text-slate-700 hover:bg-orange-50 hover:text-black'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              <Icon size={18} />
              {!collapsed && <span>{label}</span>}
              {!collapsed && active && <ChevronRight size={14} className="ml-auto text-primary-dark" />}
            </Link>
          )
        })}
      </nav>

      {/* User + Logout */}
      <div className={`py-4 border-t border-slate-200 ${collapsed ? 'px-2' : 'px-4'}`}>
        <div className={`mb-3 ${collapsed ? 'flex justify-center' : 'flex items-center gap-3'}`}>
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-black font-bold text-xs">
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name ?? 'User'}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email ?? ''}</p>
            </div>
          )}
        </div>
        <button
          onClick={logout}
          title={collapsed ? t.nav.logout : undefined}
          className={`flex items-center w-full px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-orange-50 hover:text-black transition-colors ${collapsed ? 'justify-center gap-0' : 'gap-2'}`}
        >
          <LogOut size={16} />
          {!collapsed && t.nav.logout}
        </button>
      </div>
    </aside>
  )
}
