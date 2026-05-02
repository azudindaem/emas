'use client'

import { useEffect, useState } from 'react'
import { orders, products, inventory, shipping, wallet } from '@/lib/api'
import { StatCard } from '@/components/ui'
import { useLocale } from '@/lib/locale'
import { ShoppingCart, Package, Warehouse, Truck, Wallet, TrendingUp } from 'lucide-react'

interface Stats {
  totalOrders: number
  totalProducts: number
  pendingShipments: number
  totalWalletBalances: number
}

export default function DashboardPage() {
  const { t } = useLocale()
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentOrders, setRecentOrders] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [ordersRes, productsRes, shipmentsRes, walletsRes] = await Promise.allSettled([
          orders.list({ limit: 5 }),
          products.list({ limit: 1 }),
          shipping.listShipments({ status: 'PENDING', limit: '1' }),
          wallet.balances(),
        ])

        const ordersData = ordersRes.status === 'fulfilled' ? ordersRes.value : null
        const productsData = productsRes.status === 'fulfilled' ? productsRes.value : null
        const shipmentsData = shipmentsRes.status === 'fulfilled' ? shipmentsRes.value : null
        const walletsData = walletsRes.status === 'fulfilled' ? walletsRes.value : []

        const totalBalance = (walletsData as Array<{ balance: number }>).reduce(
          (sum, w) => sum + Number(w.balance ?? 0),
          0,
        )

        setStats({
          totalOrders: (ordersData?.meta as { total?: number })?.total ?? 0,
          totalProducts: (productsData?.meta as { total?: number })?.total ?? 0,
          pendingShipments: (shipmentsData?.meta as { total?: number })?.total ?? 0,
          totalWalletBalances: totalBalance,
        })
        setRecentOrders((ordersData?.items ?? []) as unknown[])
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t.dashboard.totalOrders}
          value={stats?.totalOrders ?? 0}
          icon={<ShoppingCart size={18} />}
          color="bg-blue-500"
        />
        <StatCard
          label={t.dashboard.totalProducts}
          value={stats?.totalProducts ?? 0}
          icon={<Package size={18} />}
          color="bg-purple-500"
        />
        <StatCard
          label={t.dashboard.pendingShipments}
          value={stats?.pendingShipments ?? 0}
          icon={<Truck size={18} />}
          color="bg-orange-500"
        />
        <StatCard
          label={t.dashboard.totalWallet}
          value={`RM ${(stats?.totalWalletBalances ?? 0).toFixed(2)}`}
          icon={<Wallet size={18} />}
          color="bg-green-500"
        />
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">{t.dashboard.recentOrders}</h2>
          <a href="/dashboard/orders" className="text-xs text-[#d4a017] hover:underline">
            {t.dashboard.viewAll}
          </a>
        </div>
        {recentOrders.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">{t.dashboard.noOrders}</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {(recentOrders as Array<{ id: string; orderNo: string; customerName: string; total: number; status: string; paymentStatus: string }>).map((order) => (
              <div key={order.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">{order.orderNo}</p>
                  <p className="text-xs text-gray-400">{order.customerName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-800">RM {Number(order.total).toFixed(2)}</p>
                  <span className="text-xs text-gray-400">{order.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { href: '/dashboard/orders', label: t.dashboard.manageOrders, icon: ShoppingCart, color: 'bg-blue-50 text-blue-600' },
          { href: '/dashboard/products', label: t.dashboard.manageProducts, icon: Package, color: 'bg-purple-50 text-purple-600' },
          { href: '/dashboard/inventory', label: t.nav.inventory, icon: Warehouse, color: 'bg-yellow-50 text-yellow-600' },
          { href: '/dashboard/shipping', label: t.nav.shipping, icon: Truck, color: 'bg-orange-50 text-orange-600' },
          { href: '/dashboard/wallet', label: t.nav.wallet, icon: Wallet, color: 'bg-green-50 text-green-600' },
          { href: '/dashboard/commission', label: t.nav.commission, icon: TrendingUp, color: 'bg-pink-50 text-pink-600' },
        ].map(({ href, label, icon: Icon, color }) => (
          <a
            key={href}
            href={href}
            className={`flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:shadow-sm transition-shadow bg-white`}
          >
            <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center`}>
              <Icon size={18} />
            </div>
            <span className="text-sm font-medium text-gray-700">{label}</span>
          </a>
        ))}
      </div>
    </div>
  )
}
