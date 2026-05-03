'use client'

import { useEffect, useMemo, useState } from 'react'
import { customers as customersApi } from '@/lib/api'
import { useLocale } from '@/lib/locale'
import { Search, Users, Phone, Mail, CalendarDays, Edit2, Loader2, X } from 'lucide-react'

interface Customer {
  id: string
  name: string
  phone: string
  email?: string
  address?: {
    line1?: string
    line2?: string
    postcode?: string
    city?: string
    state?: string
    country?: string
  } | null
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

function normalizeAddress(address: Customer['address']) {
  return {
    line1: address?.line1 ?? '',
    line2: address?.line2 ?? '',
    postcode: address?.postcode ?? '',
    city: address?.city ?? '',
    state: address?.state ?? '',
    country: address?.country ?? 'Malaysia',
  }
}

export default function CustomersPage() {
  const { t } = useLocale()
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selected, setSelected] = useState<Customer | null>(null)
  const [recentOrders, setRecentOrders] = useState<CustomerOrder[]>([])
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 })
  const [editOpen, setEditOpen] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editAddressLine1, setEditAddressLine1] = useState('')
  const [editAddressLine2, setEditAddressLine2] = useState('')
  const [editPostcode, setEditPostcode] = useState('')
  const [editCity, setEditCity] = useState('')
  const [editState, setEditState] = useState('')
  const [editCountry, setEditCountry] = useState('Malaysia')

  const activeCustomers = useMemo(() => customers.filter((c) => c.totalOrders > 0).length, [customers])
  const totalSpent = useMemo(() => customers.reduce((sum, c) => sum + Number(c.totalSpent ?? 0), 0), [customers])

  const loadCustomers = async (page = 1, q = search) => {
    setLoading(true)
    setError('')
    try {
      const res = await customersApi.list({ page, limit: 20, ...(q.trim() ? { search: q.trim() } : {}) }) as {
        items: Customer[]
        meta: { page: number; totalPages: number; total: number }
      }
      setCustomers(res.items ?? [])
      setMeta(res.meta ?? { page: 1, totalPages: 1, total: 0 })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t.common.error)
    } finally {
      setLoading(false)
    }
  }

  const loadCustomerOrders = async (customerId: string) => {
    try {
      const res = await customersApi.orders(customerId, { limit: 8 }) as { items: CustomerOrder[] }
      setRecentOrders(res.items ?? [])
    } catch {
      setRecentOrders([])
    }
  }

  const openEditModal = (customer: Customer) => {
    const normalizedAddress = normalizeAddress(customer.address)
    setEditName(customer.name ?? '')
    setEditPhone(customer.phone ?? '')
    setEditEmail(customer.email ?? '')
    setEditAddressLine1(normalizedAddress.line1)
    setEditAddressLine2(normalizedAddress.line2)
    setEditPostcode(normalizedAddress.postcode)
    setEditCity(normalizedAddress.city)
    setEditState(normalizedAddress.state)
    setEditCountry(normalizedAddress.country)
    setEditError('')
    setEditOpen(true)
  }

  const saveCustomerEdit = async () => {
    if (!selected) return

    const payload = {
      name: editName.trim(),
      phone: editPhone.trim(),
      email: editEmail.trim(),
      address: {
        line1: editAddressLine1.trim(),
        line2: editAddressLine2.trim(),
        postcode: editPostcode.trim(),
        city: editCity.trim(),
        state: editState.trim(),
        country: editCountry.trim() || 'Malaysia',
      },
    }

    if (!payload.name) {
      setEditError(`${t.customers.columns.name} ${t.common.required}`)
      return
    }
    if (!payload.phone) {
      setEditError(`${t.customers.columns.phone} ${t.common.required}`)
      return
    }

    setEditSaving(true)
    setEditError('')
    try {
      const updated = await customersApi.update(selected.id, payload) as Customer

      setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
      setSelected(updated)
      setEditOpen(false)
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : t.common.error)
    } finally {
      setEditSaving(false)
    }
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

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

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
                <div className="flex items-start justify-between gap-2">
                  <p className="text-lg font-semibold text-slate-900">{selected.name}</p>
                  <button
                    type="button"
                    onClick={() => openEditModal(selected)}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border border-slate-300 text-slate-700 hover:border-primary hover:text-primary transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    {t.common.edit}
                  </button>
                </div>
                <div className="mt-2 space-y-1.5 text-sm text-slate-600">
                  <p className="flex items-center gap-2"><Phone className="w-4 h-4" />{selected.phone}</p>
                  <p className="flex items-center gap-2"><Mail className="w-4 h-4" />{selected.email || '-'}</p>
                  {selected.address?.line1 && <p>{selected.address.line1}</p>}
                  {selected.address?.line2 && <p>{selected.address.line2}</p>}
                  {(selected.address?.postcode || selected.address?.city || selected.address?.state) && (
                    <p>{[selected.address?.postcode, selected.address?.city, selected.address?.state].filter(Boolean).join(', ')}</p>
                  )}
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

      {editOpen && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">{t.common.edit} {t.customers.title}</h3>
              <button
                type="button"
                onClick={() => {
                  if (!editSaving) setEditOpen(false)
                }}
                className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {editError && <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">{editError}</div>}

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t.customers.columns.name}</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t.customers.columns.phone}</label>
                <input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t.customers.columns.email}</label>
                <input
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-700 mb-2">{t.orders.shippingAddress}</p>
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{t.orders.create.streetAddress}</label>
                    <input
                      value={editAddressLine1}
                      onChange={(e) => setEditAddressLine1(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{t.orders.create.address2Optional}</label>
                    <input
                      value={editAddressLine2}
                      onChange={(e) => setEditAddressLine2(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">{t.orders.create.postcode}</label>
                      <input
                        value={editPostcode}
                        onChange={(e) => setEditPostcode(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">{t.orders.create.city}</label>
                      <input
                        value={editCity}
                        onChange={(e) => setEditCity(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">{t.orders.create.state}</label>
                      <input
                        value={editState}
                        onChange={(e) => setEditState(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">{t.orders.create.country}</label>
                      <input
                        value={editCountry}
                        onChange={(e) => setEditCountry(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                disabled={editSaving}
                className="px-3 py-1.5 text-xs rounded-md border border-slate-300 text-slate-700 disabled:opacity-40 hover:border-slate-400"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                onClick={saveCustomerEdit}
                disabled={editSaving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-primary text-white hover:bg-primary-dark disabled:opacity-40"
              >
                {editSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {t.common.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
