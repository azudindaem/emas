'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { shipping as shippingApi } from '@/lib/api'
import { Badge, Pagination } from '@/components/ui'
import { useLocale } from '@/lib/locale'
import { X, Loader2, Package, XCircle, Settings2 } from 'lucide-react'

interface Courier {
  id: string
  provider: string
  label: string
  isActive: boolean
}

interface Shipment {
  id: string
  orderId: string
  courierId?: string | null
  courier?: { label: string; provider: string } | null
  trackingNo?: string | null
  awbNo?: string | null
  status: string
  weight?: number | null
  awbUrl?: string | null
  order?: { orderNo: string; customerName: string } | null
  createdAt: string
}

const SHIPMENT_STATUSES = ['PENDING', 'BOOKED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'RETURNED', 'CANCELLED']

const shipColor: Record<string, 'yellow' | 'blue' | 'green' | 'red' | 'gray' | 'purple'> = {
  PENDING: 'yellow', BOOKED: 'blue', PICKED_UP: 'purple',
  IN_TRANSIT: 'blue', DELIVERED: 'green', FAILED: 'red', RETURNED: 'gray', CANCELLED: 'gray',
}

export default function ShippingPage() {
  const { t } = useLocale()
  const getShipmentStatusLabel = (status: string) =>
    t.shipping.shipmentStatusLabels?.[status as keyof typeof t.shipping.shipmentStatusLabels] ?? status
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [shipMeta, setShipMeta] = useState({ page: 1, totalPages: 1, total: 0 })
  const [shipPage, setShipPage] = useState(1)
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [loading, setLoading] = useState(true)
  const [showAwbForm, setShowAwbForm] = useState<Shipment | null>(null)
  const [awbForm, setAwbForm] = useState({ courierId: '', weight: '', length: '', width: '', height: '' })
  const [shippingDefaults, setShippingDefaults] = useState<{ defaultCourierId?: string; defaultWeightKg?: number } | null>(null)
  const [generatingAwb, setGeneratingAwb] = useState(false)
  const [updatingShipStatus, setUpdatingShipStatus] = useState<string | null>(null)
  const [cancellingAwb, setCancellingAwb] = useState<string | null>(null)
  const [error, setError] = useState('')

  const loadShipments = () => {
    setLoading(true)
    shippingApi.listShipments({ page: String(shipPage), limit: '20' })
      .then(res => { setShipments(res.items as Shipment[]); setShipMeta(res.meta as typeof shipMeta) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadShipments() }, [shipPage])

  useEffect(() => {
    shippingApi.getDefaults().then(res => setShippingDefaults(res as typeof shippingDefaults)).catch(() => null)
    shippingApi.listCouriers().then(res => setCouriers(res as Courier[])).catch(() => null)
  }, [])

  const handleGenerateAwb = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showAwbForm) return
    setGeneratingAwb(true); setError('')
    try {
      await shippingApi.generateAwb({
        orderId: showAwbForm.orderId, courierAccountId: awbForm.courierId,
        weightKg: Number(awbForm.weight),
        dimensions: awbForm.length ? { length: Number(awbForm.length), width: Number(awbForm.width), height: Number(awbForm.height) } : undefined,
      })
      setShowAwbForm(null); loadShipments()
    } catch (e: unknown) { setError(e instanceof Error ? e.message : t.shipping.failedSave) }
    finally { setGeneratingAwb(false) }
  }

  const updateShipmentStatus = async (id: string, status: string) => {
    setUpdatingShipStatus(id)
    try { await shippingApi.updateShipmentStatus(id, status); loadShipments() }
    catch { /* ignore */ }
    finally { setUpdatingShipStatus(null) }
  }

  const cancelAwb = async (id: string, awbNo: string) => {
    if (!confirm('Cancel AWB ' + awbNo + '? Ini akan membatalkan penghantaran di pihak kurier.')) return
    setCancellingAwb(id)
    try { await shippingApi.cancelAwb(id); loadShipments() }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Gagal cancel AWB') }
    finally { setCancellingAwb(null) }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.shipping.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t.shipping.subtitle}</p>
        </div>
        <Link
          href="/dashboard/settings/shipping"
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Settings2 size={15} />{t.shipping.tabCouriers}
        </Link>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

      {showAwbForm && (
        <form onSubmit={handleGenerateAwb} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">{t.shipping.awbTitle} — {showAwbForm.order?.orderNo}</h2>
            <button type="button" onClick={() => setShowAwbForm(null)}><X size={18} className="text-gray-400 hover:text-gray-700" /></button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.shipping.courier}</label>
              <select required value={awbForm.courierId} onChange={e => setAwbForm(f => ({ ...f, courierId: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">{t.shipping.selectCourier}</option>
                {couriers.filter(c => c.isActive).map(c => <option key={c.id} value={c.id}>{c.label} ({c.provider})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.shipping.weightKg}</label>
              <input required type="number" step="0.001" min="0" value={awbForm.weight}
                onChange={e => setAwbForm(f => ({ ...f, weight: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="1.500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.shipping.length}</label>
              <input type="number" value={awbForm.length} onChange={e => setAwbForm(f => ({ ...f, length: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.shipping.width}</label>
              <input type="number" value={awbForm.width} onChange={e => setAwbForm(f => ({ ...f, width: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="20" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={generatingAwb} className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-semibold rounded-lg text-sm disabled:opacity-50 hover:bg-primary-dark">
              {generatingAwb && <Loader2 size={13} className="animate-spin" />}{t.shipping.generateAwb}
            </button>
            <button type="button" onClick={() => setShowAwbForm(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">{t.common.cancel}</button>
          </div>
        </form>
      )}

      {loading ? <div className="h-64 bg-gray-100 rounded-xl animate-pulse" /> : (
        <>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {[t.shipping.orderNo, t.shipping.customer, t.shipping.courier, t.shipping.trackingNo, t.shipping.weight, t.common.status, ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shipments.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-400">{t.shipping.noShipments}</td></tr>
                ) : shipments.map(s => (
                  <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">{s.order?.orderNo ?? s.orderId}</td>
                    <td className="px-4 py-3 text-gray-600">{s.order?.customerName ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{s.courier?.label ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{s.awbNo ?? s.trackingNo ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{s.weight ? s.weight + ' kg' : '—'}</td>
                    <td className="px-4 py-3"><Badge label={getShipmentStatusLabel(s.status)} color={shipColor[s.status] ?? 'gray'} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 items-center">
                        {(!(s.trackingNo ?? s.awbNo) || s.status === 'CANCELLED') && (
                          <button onClick={() => {
                            setShowAwbForm(s)
                            const defaultCourier = s.courierId ?? shippingDefaults?.defaultCourierId ?? couriers.find(c => c.isActive)?.id ?? ''
                            const defaultWeight = shippingDefaults?.defaultWeightKg ? String(shippingDefaults.defaultWeightKg) : ''
                            setAwbForm({ courierId: defaultCourier, weight: defaultWeight, length: '', width: '', height: '' })
                          }}
                            className="flex items-center gap-1 text-xs px-2 py-1 border border-gray-300 rounded-lg hover:border-primary text-gray-600 transition-colors">
                            <Package size={12} />{t.shipping.generateAwb}
                          </button>
                        )}
                        {(s.awbNo ?? s.trackingNo) && s.status !== 'CANCELLED' && (
                          <button
                            onClick={() => cancelAwb(s.id, (s.awbNo ?? s.trackingNo)!)}
                            disabled={cancellingAwb === s.id}
                            title="Cancel AWB"
                            className="flex items-center gap-1 text-xs px-2 py-1 border border-red-200 rounded-lg hover:border-red-500 text-red-500 transition-colors disabled:opacity-50">
                            {cancellingAwb === s.id ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                            Cancel AWB
                          </button>
                        )}
                        <select defaultValue={s.status}
                          onChange={e => updateShipmentStatus(s.id, e.target.value)}
                          disabled={updatingShipStatus === s.id}
                          className="text-xs border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary">
                          {SHIPMENT_STATUSES.map(st => <option key={st} value={st}>{getShipmentStatusLabel(st)}</option>)}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={shipMeta.page} totalPages={shipMeta.totalPages} onChange={setShipPage} />
        </>
      )}
    </div>
  )
}
