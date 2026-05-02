'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'
import {
  LayoutDashboard,
  ShoppingCart,
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
  LogOut,
  ChevronRight,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/orders', label: 'Pesanan', icon: ShoppingCart },
  { href: '/dashboard/products', label: 'Produk', icon: Package },
  { href: '/dashboard/inventory', label: 'Inventori', icon: Warehouse },
  { href: '/dashboard/shipping', label: 'Penghantaran', icon: Truck },
  { href: '/dashboard/invoices', label: 'Invois', icon: FileText },
  { href: '/dashboard/wallet', label: 'Wallet', icon: Wallet },
  { href: '/dashboard/commission', label: 'Komisen', icon: TrendingUp },
  { href: '/dashboard/coupons', label: 'Kupon', icon: Tag },
  { href: '/dashboard/brands', label: 'Brand', icon: Palette },
  { href: '/dashboard/roles', label: 'Peranan', icon: ShieldCheck },
  { href: '/dashboard/team', label: 'Pasukan', icon: Users },
  { href: '/dashboard/notifications', label: 'Notifikasi', icon: Bell },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-[#1a1a2e] text-white">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-[#d4a017] flex items-center justify-center text-black font-bold text-sm">
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
                  ? 'bg-[#d4a017] text-black font-semibold'
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
          <div className="w-8 h-8 rounded-full bg-[#d4a017] flex items-center justify-center text-black font-bold text-xs">
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
          Log Keluar
        </button>
      </div>
    </aside>
  )
}
