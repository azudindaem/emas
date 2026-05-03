'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { orders as ordersApi } from '@/lib/api'
import { Badge, Pagination } from '@/components/ui'
import { useLocale } from '@/lib/locale'
import { Eye, X, Loader2, ChevronDown, Plus } from 'lucide-react'

interface OrderItem {
  id: string
  name: string
  sku: string
  quantity: number
  unitPrice: string | number
  totalPrice: string | number
}

interface Order {
  id: string
  orderNo: string
  customerName: string
  customerPhone: string
  customerEmail?: string | null
  shippingAddress: Record<string, string>
  status: string
  paymentStatus: string
  subtotal: string | number
  shippingFee: string | number
  discount: string | number
  total: string | number
  notes?: string | null
  items: OrderItem[]
  createdAt: string
}

const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']
const PAYMENT_STATUSES = ['UNPAID', 'PARTIAL', 'PAID', 'REFUNDED']

const statusColor: Record<string, 'yellow' | 'blue' | 'green' | 'red' | 'gray' | 'purple'> = {
  PENDING: 'yellow', CONFIRMED: 'blue', PROCESSING: 'purple', READY_TO_SHIP: 'green',
  SHIPPED: 'blue', DELIVERED: 'green', CANCELLED: 'red', REFUNDED: 'gray',
}
const paymentColor: Record<string, 'gray' | 'green' | 'red' | 'yellow'> = {
  UNPAID: 'gray', PAID: 'green', PARTIAL: 'yellow', REFUNDED: 'red',
}

export default function OrdersPage() {
  const { t } = useLocale()
  const getOrderStatusLabel = (status: string) =>
    t.orders.statusLabels?.[status as keyof typeof t.orders.statusLabels] ?? status
  const getPaymentStatusLabel = (status: string) =>
    t.orders.paymentStatusLabels?.[status as keyof typeof t.orders.paymentStatusLabels] ?? status
  const [items, setItems] = useState<Order[]>([])
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 })
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Order | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [updatingPayment, setUpdatingPayment] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [newPayment, setNewPayment] = useState('')
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    const params: Record<string, string | number> = { page, limit: 20 }
    if (search) params.search = search
    if (statusFilter) params.status = statusFilter
    ordersApi.list(params)
      .then(res => { setItems(res.items as Order[]); setMeta(res.meta as typeof meta) })
      .finally(() => setLoading(false))
  }

  useEffect(load, [page, search, statusFilter])

  const openDetail = async (id: string) => {
    const order = await ordersApi.get(id) as Order
    setSelected(order)
    setNewStatus(order.status)
    setNewPayment(order.paymentStatus)
  }

  const handleUpdateStatus = async () => {
    if (!selected || newStatus === selected.status) return
    setUpdatingStatus(true); setError('')
    try {
      const updated = await ordersApi.updateStatus(selected.id, newStatus) as Order
      setSelected(updated)
      load()
    } catch (e: unknown) { setError(e instanceof Error ? e.message : t.orders.failedUpdate) }
    finally { setUpdatingStatus(false) }
  }

  const handleUpdatePayment = async () => {
    if (!selected || newPayment === selected.paymentStatus) return
    setUpdatingPayment(true); setError('')
    try {
      const updated = await ordersApi.updatePaymentStatus(selected.id, newPayment) as Order
      setSelected(updated)
      load()
    } catch (e: unknown) { setError(e instanceof Error ? e.message : t.orders.failedUpdate) }
    finally { setUpdatingPayment(false) }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.orders.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{meta.total} {t.orders.title.toLowerCase()}</p>
        </div>
        <Link
          href="/dashboard/orders/new"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary text-black rounded-lg text-sm font-semibold hover:bg-primary-dark"
        >
          <Plus size={15} /> {t.orders.create.createOrder}
        </Link>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input type="text" placeholder={t.orders.searchPlaceholder} value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary w-64" />
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
          <option value="">{t.orders.allStatus}</option>
          {ORDER_STATUSES.map(s => <option key={s} value={s}>{getOrderStatusLabel(s)}</option>)}
        </select>
      </div>

      <div className="flex gap-5">
        {/* Table */}
        <div className={`flex-1 min-w-0 ${selected ? 'max-w-[60%]' : ''}`}>
          {loading ? <div className="h-64 bg-gray-100 rounded-xl animate-pulse" /> : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {[t.orders.orderNo, t.orders.customer, t.orders.amount, t.common.status, t.orders.payment, t.orders.date, ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-12 text-gray-400">{t.orders.noOrders}</td></tr>
                  ) : items.map(o => (
                    <tr key={o.id} className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${selected?.id === o.id ? 'bg-yellow-50' : ''}`} onClick={() => openDetail(o.id)}>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">{o.orderNo}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{o.customerName}</p>
                        <p className="text-xs text-gray-400">{o.customerPhone}</p>
                      </td>
                      <td className="px-4 py-3 font-semibold">RM {Number(o.total).toFixed(2)}</td>
                      <td className="px-4 py-3"><Badge label={getOrderStatusLabel(o.status)} color={statusColor[o.status] ?? 'gray'} /></td>
                      <td className="px-4 py-3"><Badge label={getPaymentStatusLabel(o.paymentStatus)} color={paymentColor[o.paymentStatus] ?? 'gray'} /></td>
                      <td className="px-4 py-3 text-xs text-gray-500">{new Date(o.createdAt).toLocaleDateString('ms-MY')}</td>
                      <td className="px-4 py-3"><Eye size={15} className="text-gray-400" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination page={meta.page} totalPages={meta.totalPages} onChange={setPage} />
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="w-96 flex-shrink-0 bg-white border border-gray-200 rounded-xl overflow-hidden h-fit sticky top-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <p className="font-bold text-gray-900 font-mono text-sm">{selected.orderNo}</p>
                <p className="text-xs text-gray-500 mt-0.5">{selected.customerName} · {selected.customerPhone}</p>
              </div>
              <button onClick={() => setSelected(null)}><X size={16} className="text-gray-400 hover:text-gray-700" /></button>
            </div>

            {/* Status Update */}
            <div className="px-5 py-4 border-b border-gray-100 space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">{t.orders.orderStatus}</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm appearance-none pr-8">
                      {ORDER_STATUSES.map(s => <option key={s} value={s}>{getOrderStatusLabel(s)}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-2 top-2.5 text-gray-400 pointer-events-none" />
                  </div>
                  <button onClick={handleUpdateStatus} disabled={updatingStatus || newStatus === selected.status}
                    className="px-3 py-2 bg-primary text-black text-xs font-semibold rounded-lg disabled:opacity-40 hover:bg-primary-dark">
                    {updatingStatus ? <Loader2 size={13} className="animate-spin" /> : t.orders.update}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">{t.orders.paymentStatus}</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <select value={newPayment} onChange={e => setNewPayment(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm appearance-none pr-8">
                      {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{getPaymentStatusLabel(s)}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-2 top-2.5 text-gray-400 pointer-events-none" />
                  </div>
                  <button onClick={handleUpdatePayment} disabled={updatingPayment || newPayment === selected.paymentStatus}
                    className="px-3 py-2 bg-primary text-black text-xs font-semibold rounded-lg disabled:opacity-40 hover:bg-primary-dark">
                    {updatingPayment ? <Loader2 size={13} className="animate-spin" /> : t.orders.update}
                  </button>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t.orders.orderItems}</p>
              <div className="space-y-2">
                {selected.items.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{item.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{item.sku} × {item.quantity}</p>
                    </div>
                    <p className="font-semibold text-gray-800 ml-3">RM {Number(item.totalPrice).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="px-5 py-4 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600"><span>{t.orders.subtotal}</span><span>RM {Number(selected.subtotal).toFixed(2)}</span></div>
              <div className="flex justify-between text-gray-600"><span>{t.orders.shippingFee}</span><span>RM {Number(selected.shippingFee).toFixed(2)}</span></div>
              {Number(selected.discount) > 0 && (
                <div className="flex justify-between text-red-600"><span>{t.orders.discount}</span><span>-RM {Number(selected.discount).toFixed(2)}</span></div>
              )}
              <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-100">
                <span>{t.common.total}</span><span>RM {Number(selected.total).toFixed(2)}</span>
              </div>
            </div>

            {/* Shipping Address */}
            {selected.shippingAddress && (
              <div className="px-5 py-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{t.orders.shippingAddress}</p>
                <p className="text-xs text-gray-600">{typeof selected.shippingAddress === 'object'
                  ? Object.values(selected.shippingAddress).filter(Boolean).join(', ')
                  : String(selected.shippingAddress)}</p>
              </div>
            )}
            {selected.notes && (
              <div className="px-5 py-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{t.orders.notes}</p>
                <p className="text-xs text-gray-600">{selected.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
