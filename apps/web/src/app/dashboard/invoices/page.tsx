'use client'

import { useEffect, useState } from 'react'
import { invoices as invoicesApi } from '@/lib/api'
import { Badge, Pagination } from '@/components/ui'
import { useLocale } from '@/lib/locale'
import { Plus, X, Loader2, Eye } from 'lucide-react'

interface InvoiceItem {
  id: string
  name: string
  sku: string
  quantity: number
  unitPrice: string | number
  totalPrice: string | number
}

interface Invoice {
  id: string
  invoiceNo: string
  type: string
  status: string
  subtotal: string | number
  tax: string | number
  discount: string | number
  total: string | number
  createdAt: string
  checkoutUrl?: string | null
  order?: {
    orderNo: string
    customerName: string
    customerPhone?: string
  } | null
  items?: InvoiceItem[]
}

const INVOICE_TYPES = ['SELLER', 'CUSTOMER']
const typeColor: Record<string, 'blue' | 'green'> = { SELLER: 'blue', CUSTOMER: 'green' }
const statusColor: Record<string, 'yellow' | 'green' | 'red' | 'gray' | 'blue'> = {
  DRAFT: 'yellow',
  SENT: 'blue',
  PAID: 'green',
  CANCELLED: 'red',
  OVERDUE: 'red',
  UNPAID: 'red',
  PARTIAL: 'yellow',
  REFUNDED: 'gray',
}

export default function InvoicesPage() {
  const { t } = useLocale()
  const [items, setItems] = useState<Invoice[]>([])
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 })
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ orderId: '', type: 'CUSTOMER' })
  const [saving, setSaving] = useState(false)
  const [linkLoading, setLinkLoading] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Invoice | null>(null)

  const load = () => {
    setLoading(true)
    const params: Record<string, string> = { page: String(page), limit: '20' }
    if (search) params.search = search
    if (typeFilter) params.type = typeFilter
    invoicesApi.list(params)
      .then(res => { setItems(res.items as Invoice[]); setMeta(res.meta as typeof meta) })
      .finally(() => setLoading(false))
  }

  useEffect(load, [page, search, typeFilter])

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      await invoicesApi.generate({ orderId: form.orderId, type: form.type })
      setShowForm(false); load()
    } catch (e: unknown) { setError(e instanceof Error ? e.message : t.invoices.failedGenerate) }
    finally { setSaving(false) }
  }

  const openDetail = async (id: string) => {
    const inv = await invoicesApi.get(id) as Invoice
    setSelected(inv)
  }

  const handleCreatePaymentLink = async (invoiceId: string) => {
    setLinkLoading(true)
    setError('')
    try {
      const res = await invoicesApi.createPaymentLink(invoiceId)
      setSelected((prev) => (prev && prev.id === invoiceId ? { ...prev, checkoutUrl: res.checkoutUrl } : prev))
      window.open(res.checkoutUrl, '_blank', 'noopener,noreferrer')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Gagal jana payment link')
    } finally {
      setLinkLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.invoices.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{meta.total} {t.invoices.title.toLowerCase()}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-semibold rounded-lg hover:bg-primary-dark transition-colors text-sm">
          <Plus size={15} />{t.invoices.generateBtn}
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

      {showForm && (
        <form onSubmit={handleGenerate} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">{t.invoices.generateNew}</h2>
            <button type="button" onClick={() => setShowForm(false)}><X size={18} className="text-gray-400 hover:text-gray-700" /></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.invoices.orderId}</label>
              <input required value={form.orderId} onChange={e => setForm(f => ({ ...f, orderId: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="ID pesanan (UUID)" />
              <p className="text-xs text-gray-400 mt-1">{t.invoices.orderIdHint}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.invoices.invoiceType}</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {INVOICE_TYPES.map(tp => <option key={tp} value={tp}>{tp === 'SELLER' ? t.invoices.seller : t.invoices.buyer}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-semibold rounded-lg text-sm disabled:opacity-50 hover:bg-primary-dark">
              {saving && <Loader2 size={13} className="animate-spin" />}{t.invoices.generate}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">{t.common.cancel}</button>
          </div>
        </form>
      )}

      <div className="flex gap-3">
        <input type="text" placeholder={t.invoices.searchPlaceholder} value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary w-64" />
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
          <option value="">{t.invoices.allTypes}</option>
          {INVOICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="flex gap-5">
        <div className={`flex-1 min-w-0 ${selected ? 'max-w-[60%]' : ''}`}>
          {loading ? <div className="h-64 bg-gray-100 rounded-xl animate-pulse" /> : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {[t.invoices.invoiceNo, t.invoices.orderNo, t.invoices.customer, t.invoices.type, t.invoices.amount, t.common.status, t.invoices.date, ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-12 text-gray-400">{t.invoices.noInvoices}</td></tr>
                  ) : items.map(inv => (
                    <tr key={inv.id} className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${selected?.id === inv.id ? 'bg-yellow-50' : ''}`}
                      onClick={() => openDetail(inv.id)}>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">{inv.invoiceNo}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{inv.order?.orderNo ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-700">{inv.order?.customerName ?? '—'}</td>
                      <td className="px-4 py-3"><Badge label={inv.type} color={typeColor[inv.type] ?? 'gray'} /></td>
                      <td className="px-4 py-3 font-semibold">RM {Number(inv.total).toFixed(2)}</td>
                      <td className="px-4 py-3"><Badge label={inv.status} color={statusColor[inv.status] ?? 'gray'} /></td>
                      <td className="px-4 py-3 text-xs text-gray-500">{new Date(inv.createdAt).toLocaleDateString('ms-MY')}</td>
                      <td className="px-4 py-3"><Eye size={15} className="text-gray-400" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination page={meta.page} totalPages={meta.totalPages} onChange={setPage} />
        </div>

        {selected && (
          <div className="w-80 flex-shrink-0 bg-white border border-gray-200 rounded-xl overflow-hidden h-fit sticky top-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <p className="font-bold text-gray-900 font-mono text-sm">{selected.invoiceNo}</p>
                <p className="text-xs text-gray-500 mt-0.5">{selected.order?.customerName}</p>
              </div>
              <button onClick={() => setSelected(null)}><X size={16} className="text-gray-400 hover:text-gray-700" /></button>
            </div>
            <div className="px-5 py-4 border-b border-gray-100 flex gap-2">
              <Badge label={selected.type} color={typeColor[selected.type] ?? 'gray'} />
              <Badge label={selected.status} color={statusColor[selected.status] ?? 'gray'} />
            </div>
            {selected.items && selected.items.length > 0 && (
              <div className="px-5 py-4 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Item</p>
                <div className="space-y-2">
                  {selected.items.map(item => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate text-xs">{item.name}</p>
                        <p className="text-xs text-gray-400">{item.sku} × {item.quantity}</p>
                      </div>
                      <p className="font-semibold text-gray-800 ml-2 text-xs">RM {Number(item.totalPrice).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="px-5 py-4 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600"><span>{t.common.total}</span><span>RM {Number(selected.subtotal).toFixed(2)}</span></div>
              {Number(selected.tax) > 0 && (
                <div className="flex justify-between text-gray-600"><span>{t.invoices.tax}</span><span>RM {Number(selected.tax).toFixed(2)}</span></div>
              )}
              {Number(selected.discount) > 0 && (
                <div className="flex justify-between text-red-600"><span>{t.invoices.discount}</span><span>-RM {Number(selected.discount).toFixed(2)}</span></div>
              )}
              <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-100">
                <span>{t.common.total}</span><span>RM {Number(selected.total).toFixed(2)}</span>
              </div>
            </div>
            {selected.type === 'CUSTOMER' && selected.status !== 'PAID' && (
              <div className="px-5 pb-4">
                <button
                  type="button"
                  onClick={() => {
                    if (selected.checkoutUrl) {
                      window.open(selected.checkoutUrl, '_blank', 'noopener,noreferrer')
                      return
                    }
                    void handleCreatePaymentLink(selected.id)
                  }}
                  disabled={linkLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-black font-semibold rounded-lg text-sm disabled:opacity-50 hover:bg-primary-dark"
                >
                  {linkLoading && <Loader2 size={14} className="animate-spin" />}
                  {selected.checkoutUrl ? 'Open Payment Page' : 'Generate Payment Link'}
                </button>
              </div>
            )}
            <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400">
              {t.invoices.generated}: {new Date(selected.createdAt).toLocaleString('en-MY')}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
