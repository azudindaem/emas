'use client'

import { useEffect, useState } from 'react'
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
  ChevronDown,
  CreditCard,
  Wrench,
  ServerCog,
} from 'lucide-react'

interface SidebarProps {
  collapsed?: boolean
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  const pathname = usePathname()
  const { user, logout, isSystemOwner } = useAuth()
  const { t } = useLocale()

  const isSettingsActive = pathname.startsWith('/dashboard/settings')
  const isSystemActive = pathname.startsWith('/dashboard/system')
  const [isMainOpen, setIsMainOpen] = useState(true)
  const [isSettingsOpen, setIsSettingsOpen] = useState(true)
  const [isSystemOpen, setIsSystemOpen] = useState(true)

  useEffect(() => {
    if (isSettingsActive) setIsSettingsOpen(true)
    if (isSystemActive) setIsSystemOpen(true)
  }, [isSettingsActive, isSystemActive])

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
  ]

  const settingsSubItems = [
    { href: '/dashboard/settings/shipping', label: t.nav.shipping, icon: Truck },
    { href: '/dashboard/settings/payment', label: t.paymentSettings?.title ?? 'Payment', icon: CreditCard },
  ]

  const systemSubItems = [
    { href: '/dashboard/system/settings', label: t.systemSettings?.title ?? 'System Settings', icon: Wrench },
    { href: '/dashboard/system/users', label: 'User List', icon: Users },
    { href: '/dashboard/system/plan', label: 'Plan', icon: CreditCard },
  ]

  const subLink = (href: string, label: string, Icon: React.ElementType) => {
    const active = pathname.startsWith(href)
    return (
      <Link
        key={href}
        href={href}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
          active
            ? 'bg-primary/20 text-black font-semibold border border-primary/60'
            : 'text-slate-600 hover:bg-orange-50 hover:text-black'
        }`}
      >
        <Icon size={15} />
        <span>{label}</span>
        {active && <ChevronRight size={13} className="ml-auto text-primary-dark" />}
      </Link>
    )
  }

  return (
    <aside className={`flex flex-col min-h-screen border-r border-slate-200 bg-white text-black transition-all duration-200 ${collapsed ? 'w-20' : 'w-64'}`}>
      {/* Logo */}
      <div className={`flex items-center border-b border-slate-200 ${collapsed ? 'justify-center px-2 py-5' : 'gap-2 px-6 py-5'}`}>
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-black font-bold text-sm">E</div>
        {!collapsed && <span className="font-bold text-lg tracking-tight">emas.my</span>}
      </div>

      {/* Nav */}
      <nav className={`flex-1 py-4 space-y-0.5 overflow-y-auto ${collapsed ? 'px-2' : 'px-3'}`}>
        {!collapsed && (
          <button
            type="button"
            onClick={() => setIsMainOpen((v) => !v)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-orange-50"
          >
            <span>Main Menu</span>
            <ChevronDown size={14} className={`ml-auto transition-transform ${isMainOpen ? 'rotate-0' : '-rotate-90'}`} />
          </button>
        )}

        {(collapsed || isMainOpen) && navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active ? 'bg-primary/20 text-black font-semibold border border-primary/60' : 'text-slate-700 hover:bg-orange-50 hover:text-black'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              <Icon size={18} />
              {!collapsed && <span>{label}</span>}
              {!collapsed && active && <ChevronRight size={14} className="ml-auto text-primary-dark" />}
            </Link>
          )
        })}

        {/* Settings group */}
        <div>
          {collapsed ? (
            <Link
              href="/dashboard/settings/shipping"
              title={t.nav.settings}
              className={`flex items-center justify-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isSettingsActive ? 'bg-primary/20 text-black font-semibold border border-primary/60' : 'text-slate-700 hover:bg-orange-50 hover:text-black'
              }`}
            >
              <Settings size={18} />
            </Link>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setIsSettingsOpen((v) => !v)}
                className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${isSettingsActive ? 'bg-primary/10 text-black font-semibold' : 'text-slate-700 hover:bg-orange-50'}`}
              >
                <Settings size={18} />
                <span>{t.nav.settings}</span>
                <ChevronDown size={14} className={`ml-auto transition-transform ${isSettingsOpen ? 'rotate-0' : '-rotate-90'}`} />
              </button>
              {isSettingsOpen && (
                <div className="ml-4 mt-0.5 space-y-0.5 border-l border-slate-100 pl-3">
                  {settingsSubItems.map(({ href, label, icon: Icon }) => subLink(href, label, Icon))}
                </div>
              )}
            </>
          )}
        </div>

        {/* System group — owner only */}
        {isSystemOwner && (
          <div>
            {collapsed ? (
              <Link
                href="/dashboard/system/settings"
                title="System"
                className={`flex items-center justify-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isSystemActive ? 'bg-primary/20 text-black font-semibold border border-primary/60' : 'text-slate-700 hover:bg-orange-50 hover:text-black'
                }`}
              >
                <ServerCog size={18} />
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsSystemOpen((v) => !v)}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${isSystemActive ? 'bg-primary/10 text-black font-semibold' : 'text-slate-700 hover:bg-orange-50'}`}
                >
                  <ServerCog size={18} />
                  <span>System</span>
                  <ChevronDown size={14} className={`ml-auto transition-transform ${isSystemOpen ? 'rotate-0' : '-rotate-90'}`} />
                </button>
                {isSystemOpen && (
                  <div className="ml-4 mt-0.5 space-y-0.5 border-l border-slate-100 pl-3">
                    {systemSubItems.map(({ href, label, icon: Icon }) => subLink(href, label, Icon))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
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
