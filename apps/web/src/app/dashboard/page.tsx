'use client'

import { useEffect, useState } from 'react'
import { orders, products, shipping, wallet } from '@/lib/api'
import { useLocale } from '@/lib/locale'
import Link from 'next/link'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ArrowUpRight,
  BarChart3,
  CircleDot,
  DollarSign,
  Package,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  Truck,
  Users,
  Wallet,
  Warehouse,
} from 'lucide-react'

interface Stats {
  totalOrders: number
  totalProducts: number
  pendingShipments: number
  totalWalletBalances: number
}

interface DashboardOrder {
  id: string
  orderNo: string
  customerName?: string
  customerId?: string
  customerPhone?: string
  customerEmail?: string
  total: number
  createdAt?: string
  status: string
  paymentStatus: string
}

interface ParsedOrder extends DashboardOrder {
  createdAtDate: Date
  totalValue: number
}

function getCustomerKey(order: DashboardOrder) {
  return (
    order.customerId ||
    order.customerPhone ||
    order.customerEmail ||
    order.customerName ||
    `guest-${order.id}`
  )
}

export default function DashboardPage() {
  const { t } = useLocale()
  const [stats, setStats] = useState<Stats | null>(null)
  const [ordersSample, setOrdersSample] = useState<DashboardOrder[]>([])
  const [retentionRange, setRetentionRange] = useState<'thisMonth' | 'lastMonth'>('thisMonth')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [ordersRes, productsRes, shipmentsRes, walletsRes] = await Promise.allSettled([
          orders.list({ limit: 300 }),
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
        setOrdersSample((ordersData?.items ?? []) as DashboardOrder[])
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
            <div key={i} className="h-28 bg-gray-200 rounded-2xl" />
          ))}
        </div>
        <div className="h-72 bg-gray-200 rounded-2xl" />
      </div>
    )
  }

  const now = new Date()
  const yearStart = new Date(now.getFullYear(), 0, 1)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const isCountedSale = (order: DashboardOrder) => {
    const payment = String(order.paymentStatus ?? '').toUpperCase()
    const status = String(order.status ?? '').toUpperCase()
    if (payment === 'FAILED' || payment === 'REFUNDED') return false
    if (status === 'CANCELLED' || status === 'VOID') return false
    return true
  }

  const parsedOrders: ParsedOrder[] = ordersSample
    .map((order) => ({
      ...order,
      createdAtDate: order.createdAt ? new Date(order.createdAt) : new Date('invalid'),
      totalValue: Number(order.total ?? 0),
    }))
    .filter((order) => !Number.isNaN(order.createdAtDate.getTime()))

  const paidOrders = parsedOrders.filter((order) => isCountedSale(order))

  const totalOrders = stats?.totalOrders ?? 0
  const pendingShipments = stats?.pendingShipments ?? 0
  const orderHealth =
    totalOrders > 0
      ? Math.max(0, Math.min(100, Math.round(((totalOrders - pendingShipments) / totalOrders) * 100)))
      : 0

  const totalSaleToday = paidOrders
    .filter((order) => order.createdAtDate >= todayStart)
    .reduce((sum, order) => sum + order.totalValue, 0)

  const currentYearOrders = paidOrders.filter((order) => order.createdAtDate >= yearStart)
  const totalSaleYear = currentYearOrders.reduce((sum, order) => sum + order.totalValue, 0)

  const customerOrderCount = new Map<string, number>()
  currentYearOrders.forEach((order) => {
    const key = getCustomerKey(order)
    customerOrderCount.set(key, (customerOrderCount.get(key) ?? 0) + 1)
  })

  const uniqueCustomers = customerOrderCount.size
  const retainedCustomers = Array.from(customerOrderCount.values()).filter((count) => count > 1).length
  const customerRetention = uniqueCustomers > 0 ? (retainedCustomers / uniqueCustomers) * 100 : 0

  const buildRetentionMetrics = (startDate: Date, endDate: Date) => {
    const inRange = paidOrders.filter((order) => order.createdAtDate >= startDate && order.createdAtDate < endDate)

    const map = new Map<string, number>()
    inRange.forEach((order) => {
      const key = getCustomerKey(order)
      map.set(key, (map.get(key) ?? 0) + 1)
    })

    const unique = map.size
    const repeat = Array.from(map.values()).filter((count) => count > 1).length
    const newCustomers = Math.max(unique - repeat, 0)
    const retention = unique > 0 ? (repeat / unique) * 100 : 0

    const repeatOrderValues = inRange
      .filter((order) => (map.get(getCustomerKey(order)) ?? 0) > 1)
      .map((order) => order.totalValue)

    const avgOrderValueRepeat =
      repeatOrderValues.length > 0
        ? repeatOrderValues.reduce((sum, value) => sum + value, 0) / repeatOrderValues.length
        : 0

    return { unique, newCustomers, repeat, retention, avgOrderValueRepeat }
  }

  const thisMonthMetrics = buildRetentionMetrics(thisMonthStart, nextMonthStart)
  const lastMonthMetrics = buildRetentionMetrics(lastMonthStart, thisMonthStart)
  const activeRetentionMetrics = retentionRange === 'thisMonth' ? thisMonthMetrics : lastMonthMetrics
  const retentionDelta = thisMonthMetrics.retention - lastMonthMetrics.retention

  const salesByMonth = Array.from({ length: 12 }, (_, index) => ({
    month: new Date(now.getFullYear(), index, 1).toLocaleString('en-MY', { month: 'short' }),
    total: 0,
    orders: 0,
  }))

  currentYearOrders.forEach((order) => {
    const month = order.createdAtDate.getMonth()
    salesByMonth[month].total += order.totalValue
    salesByMonth[month].orders += 1
  })

  const statCards = [
    {
      label: t.dashboard.totalOrders,
      value: totalOrders.toLocaleString('en-MY'),
      icon: ShoppingCart,
      accent: 'from-blue-500 to-blue-600',
      hint: `${pendingShipments} ${t.dashboard.pendingShipments.toLowerCase()}`,
    },
    {
      label: t.dashboard.totalProducts,
      value: (stats?.totalProducts ?? 0).toLocaleString('en-MY'),
      icon: Package,
      accent: 'from-violet-500 to-violet-600',
      hint: t.dashboard.manageProducts,
    },
    {
      label: t.dashboard.pendingShipments,
      value: pendingShipments.toLocaleString('en-MY'),
      icon: Truck,
      accent: 'from-orange-500 to-orange-600',
      hint: `${orderHealth}% order health`,
    },
    {
      label: t.dashboard.totalWallet,
      value: `RM ${(stats?.totalWalletBalances ?? 0).toLocaleString('en-MY', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      icon: Wallet,
      accent: 'from-emerald-500 to-emerald-600',
      hint: t.nav.wallet,
    },
    {
      label: t.dashboard.totalSaleToday,
      value: `RM ${totalSaleToday.toLocaleString('en-MY', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      icon: TrendingUp,
      accent: 'from-teal-500 to-teal-600',
      hint: t.dashboard.saleToday,
    },
    {
      label: t.dashboard.totalSaleYear,
      value: `RM ${totalSaleYear.toLocaleString('en-MY', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      icon: BarChart3,
      accent: 'from-cyan-500 to-cyan-600',
      hint: `${now.getFullYear()} YTD`,
    },
  ]

  const quickLinks = [
    {
      href: '/dashboard/orders',
      label: t.dashboard.manageOrders,
      icon: ShoppingCart,
      color: 'bg-blue-50 text-blue-600 border-blue-100',
    },
    {
      href: '/dashboard/products',
      label: t.dashboard.manageProducts,
      icon: Package,
      color: 'bg-violet-50 text-violet-600 border-violet-100',
    },
    {
      href: '/dashboard/inventory',
      label: t.nav.inventory,
      icon: Warehouse,
      color: 'bg-amber-50 text-amber-600 border-amber-100',
    },
    {
      href: '/dashboard/shipping',
      label: t.nav.shipping,
      icon: Truck,
      color: 'bg-orange-50 text-orange-600 border-orange-100',
    },
    {
      href: '/dashboard/wallet',
      label: t.nav.wallet,
      icon: Wallet,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    },
    {
      href: '/dashboard/commission',
      label: t.nav.commission,
      icon: TrendingUp,
      color: 'bg-pink-50 text-pink-600 border-pink-100',
    },
  ]

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-slate-50 p-5 sm:p-6">
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-amber-200/30 blur-2xl" />
        <div className="absolute -left-16 -bottom-16 h-44 w-44 rounded-full bg-blue-100/30 blur-2xl" />
        <div className="relative grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">{t.dashboard.emasLabel}</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">{t.dashboard.heroTitle}</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              {t.dashboard.heroDesc}
            </p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-white/90 p-4 backdrop-blur">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">{t.dashboard.orderHealth}</p>
              <span className="text-xs font-semibold text-amber-700">{orderHealth}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600"
                style={{ width: `${orderHealth}%` }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <CircleDot size={12} className="text-emerald-500" />
                {Math.max(totalOrders - pendingShipments, 0)} {t.dashboard.doneProcess}
              </span>
              <span className="inline-flex items-center gap-1">
                <CircleDot size={12} className="text-orange-500" />
                {pendingShipments} {t.dashboard.pending}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        {statCards.map(({ label, value, icon: Icon, accent, hint }) => (
          <div
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
                <p className="mt-2 text-xs text-slate-500">{hint}</p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white ${accent}`}>
                <Icon size={18} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-300 bg-white p-6 backdrop-blur-sm shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{t.dashboard.customerRetentionTitle}</h2>
              <p className="text-sm text-slate-500">{t.dashboard.trackRetention}</p>
            </div>
          </div>
          <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setRetentionRange('thisMonth')}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-all duration-200 ${
                retentionRange === 'thisMonth'
                  ? 'bg-amber-600 text-white shadow-lg hover:bg-amber-700'
                  : 'text-slate-500 hover:bg-white hover:text-slate-900'
              }`}
            >
              {t.dashboard.thisMonth}
            </button>
            <button
              type="button"
              onClick={() => setRetentionRange('lastMonth')}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-all duration-200 ${
                retentionRange === 'lastMonth'
                  ? 'bg-amber-600 text-white shadow-lg hover:bg-amber-700'
                  : 'text-slate-500 hover:bg-white hover:text-slate-900'
              }`}
            >
              {t.dashboard.lastMonth}
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-300 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-xs font-medium text-slate-500">{t.dashboard.newCustomers.toUpperCase()}</p>
                <p className="text-2xl font-bold text-slate-900">{activeRetentionMetrics.newCustomers}</p>
                <p className="mt-1 text-xs text-slate-600">
                  {activeRetentionMetrics.unique > 0
                    ? `${((activeRetentionMetrics.newCustomers / activeRetentionMetrics.unique) * 100).toFixed(1)}% ${t.dashboard.ofTotal}`
                    : `0.0% ${t.dashboard.ofTotal}`}
                </p>
              </div>
              <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-300 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-xs font-medium text-slate-500">{t.dashboard.repeatCustomers.toUpperCase()}</p>
                <p className="text-2xl font-bold text-slate-900">{activeRetentionMetrics.repeat}</p>
                <p className="mt-1 text-xs text-slate-600">
                  {activeRetentionMetrics.unique > 0
                    ? `${((activeRetentionMetrics.repeat / activeRetentionMetrics.unique) * 100).toFixed(1)}% ${t.dashboard.ofTotal}`
                    : `0.0% ${t.dashboard.ofTotal}`}
                </p>
              </div>
              <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
                <RefreshCw className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-300 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-xs font-medium text-slate-500">{t.dashboard.retentionRate.toUpperCase()}</p>
                <p className="text-2xl font-bold text-slate-900">{activeRetentionMetrics.retention.toFixed(1)}%</p>
                <p className="mt-1 text-xs text-slate-600">
                  {retentionDelta >= 0 ? '+' : ''}
                  {retentionDelta.toFixed(1)}% {t.dashboard.fromLastMonth}
                </p>
              </div>
              <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-300 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-xs font-medium text-slate-500">{t.dashboard.avgOrderValue.toUpperCase()}</p>
                <p className="text-2xl font-bold text-slate-900">
                  RM {activeRetentionMetrics.avgOrderValueRepeat.toLocaleString('en-MY', { maximumFractionDigits: 0 })}
                </p>
                <p className="mt-1 text-xs text-slate-600">{t.dashboard.repeatCustomersHint}</p>
              </div>
              <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-800">{t.dashboard.salesTrend} {now.getFullYear()}</h2>
            <p className="text-xs text-slate-500">{t.dashboard.monthlySalesDesc}</p>
          </div>
          <Link href="/dashboard/orders" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
            {t.dashboard.viewAll}
            <ArrowUpRight size={14} />
          </Link>
        </div>

        <div className="h-96 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={salesByMonth} margin={{ top: 8, right: 12, left: 4, bottom: 8 }}>
              <defs>
                <linearGradient id="emasOrdersGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="emasRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.24} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fill: '#14b8a6', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: '#7c3aed', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `RM ${(Number(value) / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
                  backgroundColor: '#fff',
                }}
                formatter={(value, name) => {
                  if (name === 'Revenue') {
                    return [
                      `RM ${Number(value).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                      name,
                    ]
                  }
                  return [Number(value).toLocaleString('en-MY'), name]
                }}
              />
              <Legend />
              <Area yAxisId="left" type="monotone" dataKey="orders" name="Orders" stroke="#14b8a6" fill="url(#emasOrdersGradient)" strokeWidth={2} />
              <Area yAxisId="right" type="monotone" dataKey="total" name="Revenue" stroke="#7c3aed" fill="url(#emasRevenueGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {quickLinks.map(({ href, label, icon: Icon, color }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-sm"
          >
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg border ${color}`}>
              <Icon size={18} />
            </div>
            <span className="text-sm font-medium text-gray-700">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
