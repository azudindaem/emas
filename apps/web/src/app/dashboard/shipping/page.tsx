'use client'

import { useEffect, useState } from 'react'
import { shipping as shippingApi } from '@/lib/api'
import { Badge, Pagination } from '@/components/ui'
import { useLocale } from '@/lib/locale'
import { Plus, X, Loader2, Edit2, Trash2, Package } from 'lucide-react'

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
  status: string
  weight?: number | null
  awbUrl?: string | null
  order?: { orderNo: string; customerName: string } | null
  createdAt: string
}

const PROVIDERS = ['POSLAJU', 'J&T', 'DHL_EXPRESS', 'NINJA_VAN', 'GDEX', 'CITYLINK', 'LALAMOVE', 'CUSTOM']
const SHIPMENT_STATUSES = ['PENDING', 'PROCESSING', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'RETURNED']

const shipColor: Record<string, 'yellow' | 'blue' | 'green' | 'red' | 'gray' | 'purple'> = {
  PENDING: 'yellow', PROCESSING: 'blue', PICKED_UP: 'purple',
  IN_TRANSIT: 'blue', DELIVERED: 'green', FAILED: 'red', RETURNED: 'gray',
}

const emptyCourierForm = () => ({ provider: 'POSLAJU', label: '', credentials: '{}' })

export default function ShippingPage() {
  const { t } = useLocale()
  const [tab, setTab] = useState<'shipments' | 'couriers'>('shipments')
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [shipMeta, setShipMeta] = useState({ page: 1, totalPages: 1, total: 0 })
  const [shipPage, setShipPage] = useState(1)
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [loading, setLoading] = useState(true)
  const [showCourierForm, setShowCourierForm] = useState(false)
  const [editCourier, setEditCourier] = useState<Courier | null>(null)
  const [courierForm, setCourierForm] = useState(emptyCourierForm())
  const [savingCourier, setSavingCourier] = useState(false)
  const [showAwbForm, setShowAwbForm] = useState<Shipment | null>(null)
  const [awbForm, setAwbForm] = useState({ courierId: '', weight: '', length: '', width: '', height: '' })
  const [generatingAwb, setGeneratingAwb] = useState(false)
  const [updatingShipStatus, setUpdatingShipStatus] = useState<string | null>(null)
  const [error, setError] = useState('')

  const loadShipments = () => {
    setLoading(true)
    shippingApi.listShipments({ page: String(shipPage), limit: '20' })
      .then(res => { setShipments(res.items as Shipment[]); setShipMeta(res.meta as typeof shipMeta) })
      .finally(() => setLoading(false))
  }

  const loadCouriers = () => {
    setLoading(true)
    shippingApi.listCouriers()
      .then(res => setCouriers(res as Courier[]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { tab === 'shipments' ? loadShipments() : loadCouriers() }, [tab, shipPage])

  const openCreateCourier = () => { setEditCourier(null); setCourierForm(emptyCourierForm()); setShowCourierForm(true) }
  const openEditCourier = (c: Courier) => {
    setEditCourier(c); setCourierForm({ provider: c.provider, label: c.label, credentials: '{}' }); setShowCourierForm(true)
  }

  const saveCourier = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingCourier(true); setError('')
    let credentials: Record<string, unknown> = {}
    try { credentials = JSON.parse(courierForm.credentials) } catch { setError(t.shipping.credentialsMustBeJSON); setSavingCourier(false); return }
    try {
      const payload = { provider: courierForm.provider, label: courierForm.label, credentials }
      if (editCourier) { await shippingApi.updateCourier(editCourier.id, payload) }
      else { await shippingApi.createCourier(payload) }
      setShowCourierForm(false); loadCouriers()
    } catch (e: unknown) { setError(e instanceof Error ? e.message : t.shipping.failedSave) }
    finally { setSavingCourier(false) }
  }

  const deleteCourier = async (id: string) => {
    if (!confirm('Padam kurier ini?')) return
    await shippingApi.deleteCourier(id).catch(() => null); loadCouriers()
  }

  const handleGenerateAwb = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showAwbForm) return
    setGeneratingAwb(true); setError('')
    try {
      await shippingApi.generateAwb({
        orderId: showAwbForm.orderId, courierId: awbForm.courierId,
        weight: Number(awbForm.weight),
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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.shipping.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t.shipping.subtitle}</p>
        </div>
        {tab === 'couriers' && (
          <button onClick={openCreateCourier} className="flex items-center gap-2 px-4 py-2 bg-[#d4a017] text-black font-semibold rounded-lg hover:bg-[#b8891a] transition-colors text-sm">
            <Plus size={15} />{t.shipping.addCourier}
          </button>
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

      {/* Courier Form */}
      {showCourierForm && tab === 'couriers' && (
        <form onSubmit={saveCourier} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">{editCourier ? t.shipping.editCourier : t.shipping.newCourier}</h2>
            <button type="button" onClick={() => setShowCourierForm(false)}><X size={18} className="text-gray-400 hover:text-gray-700" /></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.shipping.provider}</label>
              <select value={courierForm.provider} onChange={e => setCourierForm(f => ({ ...f, provider: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.shipping.label}</label>
              <input required value={courierForm.label} onChange={e => setCourierForm(f => ({ ...f, label: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Pos Laju Utama" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.shipping.credentials}</label>
              <textarea value={courierForm.credentials} onChange={e => setCourierForm(f => ({ ...f, credentials: e.target.value }))}
                rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono text-xs"
                placeholder='{"apiKey": "xxx", "accountNo": "yyy"}' />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={savingCourier} className="flex items-center gap-2 px-4 py-2 bg-[#d4a017] text-black font-semibold rounded-lg text-sm disabled:opacity-50 hover:bg-[#b8891a]">
              {savingCourier && <Loader2 size={13} className="animate-spin" />}{t.common.save}
            </button>
            <button type="button" onClick={() => setShowCourierForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">{t.common.cancel}</button>
          </div>
        </form>
      )}

      {/* AWB Form */}
      {showAwbForm && (
        <form onSubmit={handleGenerateAwb} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Jana AWB — {showAwbForm.order?.orderNo}</h2>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.shipping.weight} (kg)</label>
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
            <button type="submit" disabled={generatingAwb} className="flex items-center gap-2 px-4 py-2 bg-[#d4a017] text-black font-semibold rounded-lg text-sm disabled:opacity-50 hover:bg-[#b8891a]">
              {generatingAwb && <Loader2 size={13} className="animate-spin" />}{t.shipping.generateAwb}
            </button>
            <button type="button" onClick={() => setShowAwbForm(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">{t.common.cancel}</button>
          </div>
        </form>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(['shipments', 'couriers'] as const).map(tabKey => (
          <button key={tabKey} onClick={() => { setTab(tabKey); setError('') }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === tabKey ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {tabKey === 'shipments' ? t.shipping.tabShipments : t.shipping.tabCouriers}
          </button>
        ))}
      </div>

      {loading ? <div className="h-64 bg-gray-100 rounded-xl animate-pulse" /> : tab === 'shipments' ? (
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
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-[#d4a017]">{s.order?.orderNo ?? s.orderId}</td>
                    <td className="px-4 py-3 text-gray-600">{s.order?.customerName ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{s.courier?.label ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{s.trackingNo ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{s.weight ? `${s.weight} kg` : '—'}</td>
                    <td className="px-4 py-3"><Badge label={s.status} color={shipColor[s.status] ?? 'gray'} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 items-center">
                        {!s.trackingNo && (
                          <button onClick={() => { setShowAwbForm(s); setAwbForm({ courierId: '', weight: '', length: '', width: '', height: '' }) }}
                            className="flex items-center gap-1 text-xs px-2 py-1 border border-gray-300 rounded-lg hover:border-[#d4a017] text-gray-600 transition-colors">
                            <Package size={12} />{t.shipping.generateAwb}
                          </button>
                        )}
                        <select defaultValue={s.status}
                          onChange={e => updateShipmentStatus(s.id, e.target.value)}
                          disabled={updatingShipStatus === s.id}
                          className="text-xs border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#d4a017]">
                          {SHIPMENT_STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
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
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {[t.shipping.provider, t.shipping.label, t.common.status, ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {couriers.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-12 text-gray-400">{t.shipping.noCouriers}</td></tr>
              ) : couriers.map(c => (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-700">{c.provider}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{c.label}</td>
                  <td className="px-4 py-3"><Badge label={c.isActive ? 'Aktif' : 'Tidak Aktif'} color={c.isActive ? 'green' : 'gray'} /></td>
                  <td className="px-4 py-3 text-right flex gap-2 justify-end">
                    <button onClick={() => openEditCourier(c)} className="p-1.5 text-gray-400 hover:text-[#d4a017] rounded"><Edit2 size={14} /></button>
                    <button onClick={() => deleteCourier(c.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
