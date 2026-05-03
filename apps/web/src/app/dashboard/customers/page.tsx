'use client'

import { useEffect, useMemo, useState } from 'react'
import { customers as customersApi } from '@/lib/api'
import { useLocale } from '@/lib/locale'
import { Search, Users, Phone, Mail, CalendarDays } from 'lucide-react'

interface Customer {
  id: string
  name: string
  phone: string
  email?: string
  totalOrders: number
  totalSpent: string | number
  updatedAt: string
}

interface CustomerOrder {
  id: string
  orderNo: string
  total: string | number
  status: string
  createdAt: string
}

function formatMoney(value: string | number): string {
  return `RM ${Number(value ?? 0).toFixed(2)}`
}

export default function CustomersPage() {
  const { t } = useLocale()
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selected, setSelected] = useState<Customer | null>(null)
  const [recentOrders, setRecentOrders] = useState<CustomerOrder[]>([])
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 })

  const activeCustomers = useMemo(() => customers.filter((c) => c.totalOrders > 0).length, [customers])
  const totalSpent = useMemo(() => customers.reduce((sum, c) => sum + Number(c.totalSpent ?? 0), 0), [customers])

  const loadCustomers = async (page = 1, q = search) => {
    setLoading(true)
    try {
      const res = await customersApi.list({ page, limit: 20, ...(q.trim() ? { search: q.trim() } : {}) }) as {
        items: Customer[]
        meta: { page: number; totalPages: number; total: number }
      }
      setCustomers(res.items ?? [])
      setMeta(res.meta ?? { page: 1, totalPages: 1, total: 0 })
    } finally {
      setLoading(false)
    }
  }

  const loadCustomerOrders = async (customerId: string) => {
    const res = await customersApi.orders(customerId, { limit: 8 }) as { items: CustomerOrder[] }
    setRecentOrders(res.items ?? [])
  }

  useEffect(() => {
    loadCustomers(1)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{t.customers.title}</h1>
          <p className="text-sm text-slate-500 mt-1">{t.customers.subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">{t.customers.totalCustomers}</p>
          <p className="text-2xl font-semibold text-slate-900 mt-1">{meta.total}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">{t.customers.activeCustomers}</p>
          <p className="text-2xl font-semibold text-slate-900 mt-1">{activeCustomers}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">{t.customers.totalSpent}</p>
          <p className="text-2xl font-semibold text-primary mt-1">{formatMoney(totalSpent)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-6">
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') loadCustomers(1, search)
                }}
                placeholder={t.customers.searchPlaceholder}
                className="w-full pl-10 pr-20 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => loadCustomers(1, search)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs rounded-md bg-primary text-white hover:bg-primary-dark transition-colors"
              >
                {t.common.search}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-slate-500">{t.common.loading}</div>
          ) : customers.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">{t.customers.noCustomers}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left px-4 py-3">{t.customers.columns.name}</th>
                    <th className="text-left px-4 py-3">{t.customers.columns.phone}</th>
                    <th className="text-left px-4 py-3">{t.customers.columns.orders}</th>
                    <th className="text-left px-4 py-3">{t.customers.columns.spent}</th>
                    <th className="text-right px-4 py-3">{t.common.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{c.name}</p>
                        <p className="text-xs text-slate-500">{c.email || '-'}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{c.phone}</td>
                      <td className="px-4 py-3 text-slate-700">{c.totalOrders}</td>
                      <td className="px-4 py-3 text-slate-700">{formatMoney(c.totalSpent)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelected(c)
                            loadCustomerOrders(c.id)
                          }}
                          className="text-xs px-3 py-1.5 rounded-md border border-slate-300 text-slate-700 hover:border-primary hover:text-primary transition-colors"
                        >
                          {t.customers.viewDetails}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="p-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              disabled={meta.page <= 1}
              onClick={() => loadCustomers(meta.page - 1, search)}
              className="px-3 py-1.5 text-xs rounded-md border border-slate-300 text-slate-700 disabled:opacity-40 hover:border-primary hover:text-primary transition-colors"
            >
              {t.common.previous}
            </button>
            <span className="text-xs text-slate-500">{meta.page} / {meta.totalPages || 1}</span>
            <button
              type="button"
              disabled={meta.page >= meta.totalPages}
              onClick={() => loadCustomers(meta.page + 1, search)}
              className="px-3 py-1.5 text-xs rounded-md border border-slate-300 text-slate-700 disabled:opacity-40 hover:border-primary hover:text-primary transition-colors"
            >
              {t.common.next}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-medium text-slate-900">{t.customers.detailsTitle}</h2>
          </div>

          {!selected ? (
            <div className="p-5 text-sm text-slate-500">{t.customers.selectCustomerHint}</div>
          ) : (
            <div className="p-5 space-y-4">
              <div>
                <p className="text-lg font-semibold text-slate-900">{selected.name}</p>
                <div className="mt-2 space-y-1.5 text-sm text-slate-600">
                  <p className="flex items-center gap-2"><Phone className="w-4 h-4" />{selected.phone}</p>
                  <p className="flex items-center gap-2"><Mail className="w-4 h-4" />{selected.email || '-'}</p>
                  <p className="flex items-center gap-2"><CalendarDays className="w-4 h-4" />{new Date(selected.updatedAt).toLocaleString()}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <h3 className="text-sm font-medium text-slate-900 mb-2">{t.customers.recentOrders}</h3>
                {recentOrders.length === 0 ? (
                  <p className="text-sm text-slate-500">{t.customers.noOrders}</p>
                ) : (
                  <div className="space-y-2">
                    {recentOrders.map((order) => (
                      <div key={order.id} className="rounded-lg border border-slate-200 p-3">
                        <p className="text-sm font-medium text-slate-900">{order.orderNo}</p>
                        <p className="text-xs text-slate-500 mt-1">{order.status}</p>
                        <p className="text-xs text-primary mt-1">{formatMoney(order.total)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
