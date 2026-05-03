'use client'

import { useEffect, useState } from 'react'
import { shipping as shippingApi } from '@/lib/api'
import { Badge, Pagination } from '@/components/ui'
import { useLocale } from '@/lib/locale'
import { Plus, X, Loader2, Edit2, Trash2, Package, XCircle } from 'lucide-react'

interface Courier {
  id: string
  provider: string
  label: string
  isActive: boolean
  credentials?: Record<string, unknown>
}

interface CourierFormState {
  provider: string
  label: string
  environment: 'sandbox' | 'production'
  token: string
  merchantId: string
  serviceProvider: string
  pickupFullName: string
  pickupCountryCode: string
  pickupPhone: string
  pickupEmail: string
  pickupLine1: string
  pickupLine2: string
  pickupCity: string
  pickupPostcode: string
  pickupState: string
  pickupCountry: string
  isDropoff: boolean
  isNotify: string
  isReschedule: string
  apiKey: string
  secret: string
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

const PROVIDERS = ['NINJAVAN', 'POS_MALAYSIA', 'JNT', 'DHL', 'FLASH', 'GDEX', 'SKYNET', 'AIRPAK', 'OTHERS']
const PARCELDAILY_SERVICE_PROVIDERS = [
  'jnt',
  'dhl',
  'ninjavan',
  'citylink',
  'poslaju',
  'spx',
  'spxpromo',
  'best',
  'lineclear',
  'kex',
  'lex',
  'imile',
  'redly',
]
const SHIPMENT_STATUSES = ['PENDING', 'BOOKED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'RETURNED', 'CANCELLED']

const shipColor: Record<string, 'yellow' | 'blue' | 'green' | 'red' | 'gray' | 'purple'> = {
  PENDING: 'yellow', BOOKED: 'blue', PICKED_UP: 'purple',
  IN_TRANSIT: 'blue', DELIVERED: 'green', FAILED: 'red', RETURNED: 'gray', CANCELLED: 'gray',
}

const emptyCourierForm = (): CourierFormState => ({
  provider: 'OTHERS',
  label: '',
  environment: 'sandbox',
  token: '',
  merchantId: '',
  serviceProvider: 'jnt',
  pickupFullName: '',
  pickupCountryCode: '+60',
  pickupPhone: '',
  pickupEmail: '',
  pickupLine1: '',
  pickupLine2: '',
  pickupCity: '',
  pickupPostcode: '',
  pickupState: '',
  pickupCountry: 'Malaysia',
  isDropoff: false,
  isNotify: 'SMS',
  isReschedule: 'WhatsApp',
  apiKey: '',
  secret: '',
})

export default function ShippingPage() {
  const { t } = useLocale()
  const getShipmentStatusLabel = (status: string) =>
    t.shipping.shipmentStatusLabels?.[status as keyof typeof t.shipping.shipmentStatusLabels] ?? status
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

  const loadCouriers = () => {
    setLoading(true)
    shippingApi.listCouriers()
      .then(res => setCouriers(res as Courier[]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { tab === 'shipments' ? loadShipments() : loadCouriers() }, [tab, shipPage])

  useEffect(() => {
    shippingApi.getDefaults().then(res => setShippingDefaults(res as typeof shippingDefaults)).catch(() => null)
    shippingApi.listCouriers().then(res => setCouriers(res as Courier[])).catch(() => null)
  }, [])

  const openCreateCourier = () => { setEditCourier(null); setCourierForm(emptyCourierForm()); setShowCourierForm(true) }
  const openEditCourier = (c: Courier) => {
    const creds = c.credentials ?? {}
    const pickup = (creds['pickupAddress'] as Record<string, unknown> | undefined) ?? {}
    const modeRaw = String(creds['environment'] ?? creds['mode'] ?? 'sandbox').toLowerCase()
    setEditCourier(c)
    setCourierForm({
      provider: c.provider,
      label: c.label,
      environment: modeRaw === 'production' ? 'production' : 'sandbox',
      token: String(creds['token'] ?? ''),
      merchantId: String(creds['merchantId'] ?? ''),
      serviceProvider: String(creds['serviceProvider'] ?? 'jnt'),
      pickupFullName: String(pickup['fullName'] ?? ''),
      pickupCountryCode: String(pickup['countryCode'] ?? '+60'),
      pickupPhone: String(pickup['phone'] ?? ''),
      pickupEmail: String(pickup['email'] ?? ''),
      pickupLine1: String(pickup['line1'] ?? ''),
      pickupLine2: String(pickup['line2'] ?? ''),
      pickupCity: String(pickup['city'] ?? ''),
      pickupPostcode: String(pickup['postcode'] ?? ''),
      pickupState: String(pickup['state'] ?? ''),
      pickupCountry: String(pickup['country'] ?? 'Malaysia'),
      isDropoff: Boolean(creds['isDropoff']),
      isNotify: String(creds['isNotify'] ?? 'SMS'),
      isReschedule: String(creds['isReschedule'] ?? 'WhatsApp'),
      apiKey: String(creds['apiKey'] ?? ''),
      secret: String(creds['secret'] ?? ''),
    })
    setShowCourierForm(true)
  }

  const saveCourier = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingCourier(true); setError('')
    const isParceldaily = courierForm.provider === 'OTHERS'

    if (isParceldaily) {
      if (!courierForm.token.trim() || !courierForm.merchantId.trim()) {
        setError(t.shipping.parceldailyTokenMerchantRequired)
        setSavingCourier(false)
        return
      }
      if (!courierForm.pickupFullName.trim() || !courierForm.pickupPhone.trim() || !courierForm.pickupLine1.trim() || !courierForm.pickupCity.trim() || !courierForm.pickupPostcode.trim() || !courierForm.pickupState.trim()) {
        setError(t.shipping.parceldailyPickupIncomplete)
        setSavingCourier(false)
        return
      }
    }

    const credentials: Record<string, unknown> = isParceldaily
      ? {
          provider: 'parceldaily',
          environment: courierForm.environment,
          baseUrl: courierForm.environment === 'production'
            ? 'https://api.parceldaily.com'
            : 'https://api.sandbox.parceldaily.com',
          token: courierForm.token.trim(),
          merchantId: courierForm.merchantId.trim(),
          serviceProvider: courierForm.serviceProvider.trim().toLowerCase(),
          pickupAddress: {
            fullName: courierForm.pickupFullName.trim(),
            countryCode: courierForm.pickupCountryCode.trim() || '+60',
            phone: courierForm.pickupPhone.trim(),
            email: courierForm.pickupEmail.trim() || undefined,
            line1: courierForm.pickupLine1.trim(),
            line2: courierForm.pickupLine2.trim() || undefined,
            city: courierForm.pickupCity.trim(),
            postcode: courierForm.pickupPostcode.trim(),
            state: courierForm.pickupState.trim(),
            country: courierForm.pickupCountry.trim() || 'Malaysia',
          },
          isDropoff: courierForm.isDropoff,
          ...(courierForm.isNotify.trim() ? { isNotify: courierForm.isNotify.trim() } : {}),
          ...(courierForm.isReschedule.trim() ? { isReschedule: courierForm.isReschedule.trim() } : {}),
        }
      : {
          apiKey: courierForm.apiKey.trim(),
          secret: courierForm.secret.trim(),
        }

    try {
      if (editCourier) {
        await shippingApi.updateCourier(editCourier.id, {
          label: courierForm.label,
          credentials,
        })
      } else {
        await shippingApi.createCourier({
          provider: courierForm.provider,
          label: courierForm.label,
          credentials,
        })
      }
      setShowCourierForm(false); loadCouriers()
    } catch (e: unknown) { setError(e instanceof Error ? e.message : t.shipping.failedSave) }
    finally { setSavingCourier(false) }
  }

  const deleteCourier = async (id: string) => {
    if (!confirm(t.shipping.deleteCourierConfirm)) return
    await shippingApi.deleteCourier(id).catch(() => null); loadCouriers()
  }

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
    if (!confirm(`Cancel AWB ${awbNo}? Ini akan membatalkan penghantaran di pihak kurier.`)) return
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
        {tab === 'couriers' && (
          <button onClick={openCreateCourier} className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-semibold rounded-lg hover:bg-primary-dark transition-colors text-sm">
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder={t.shipping.labelPlaceholder} />
            </div>
            {courierForm.provider === 'OTHERS' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.shipping.parceldailyMode}</label>
                  <select
                    value={courierForm.environment}
                    onChange={e => setCourierForm(f => ({ ...f, environment: e.target.value as 'sandbox' | 'production' }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="sandbox">{t.shipping.modeSandbox}</option>
                    <option value="production">{t.shipping.modeProduction}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.shipping.parceldailyServiceProvider}</label>
                  <select
                    value={courierForm.serviceProvider}
                    onChange={e => setCourierForm(f => ({ ...f, serviceProvider: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    {PARCELDAILY_SERVICE_PROVIDERS.map((provider) => (
                      <option key={provider} value={provider}>{provider.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.shipping.merchantId}</label>
                  <input value={courierForm.merchantId} onChange={e => setCourierForm(f => ({ ...f, merchantId: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder={t.shipping.merchantIdPlaceholder} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.shipping.token}</label>
                  <input value={courierForm.token} onChange={e => setCourierForm(f => ({ ...f, token: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder={t.shipping.tokenPlaceholder} />
                </div>

                <div className="col-span-2">
                  <p className="text-sm font-semibold text-gray-800">{t.shipping.pickupAddressSender}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.shipping.fullName}</label>
                  <input value={courierForm.pickupFullName} onChange={e => setCourierForm(f => ({ ...f, pickupFullName: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.shipping.email}</label>
                  <input value={courierForm.pickupEmail} onChange={e => setCourierForm(f => ({ ...f, pickupEmail: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.shipping.countryCode}</label>
                  <input value={courierForm.pickupCountryCode} onChange={e => setCourierForm(f => ({ ...f, pickupCountryCode: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder={t.shipping.countryCodePlaceholder} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.shipping.phone}</label>
                  <input value={courierForm.pickupPhone} onChange={e => setCourierForm(f => ({ ...f, pickupPhone: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.shipping.addressLine1}</label>
                  <input value={courierForm.pickupLine1} onChange={e => setCourierForm(f => ({ ...f, pickupLine1: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.shipping.addressLine2}</label>
                  <input value={courierForm.pickupLine2} onChange={e => setCourierForm(f => ({ ...f, pickupLine2: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.shipping.city}</label>
                  <input value={courierForm.pickupCity} onChange={e => setCourierForm(f => ({ ...f, pickupCity: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.shipping.postcode}</label>
                  <input value={courierForm.pickupPostcode} onChange={e => setCourierForm(f => ({ ...f, pickupPostcode: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.shipping.state}</label>
                  <input value={courierForm.pickupState} onChange={e => setCourierForm(f => ({ ...f, pickupState: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.shipping.country}</label>
                  <input value={courierForm.pickupCountry} onChange={e => setCourierForm(f => ({ ...f, pickupCountry: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.shipping.notify}</label>
                  <input value={courierForm.isNotify} onChange={e => setCourierForm(f => ({ ...f, isNotify: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder={t.shipping.notifyPlaceholder} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.shipping.reschedule}</label>
                  <input value={courierForm.isReschedule} onChange={e => setCourierForm(f => ({ ...f, isReschedule: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder={t.shipping.reschedulePlaceholder} />
                </div>
                <div className="col-span-2">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={courierForm.isDropoff} onChange={e => setCourierForm(f => ({ ...f, isDropoff: e.target.checked }))} />
                    {t.shipping.dropoffLabel}
                  </label>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.shipping.apiKey}</label>
                  <input value={courierForm.apiKey} onChange={e => setCourierForm(f => ({ ...f, apiKey: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.shipping.secret}</label>
                  <input value={courierForm.secret} onChange={e => setCourierForm(f => ({ ...f, secret: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </>
            )}
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={savingCourier} className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-semibold rounded-lg text-sm disabled:opacity-50 hover:bg-primary-dark">
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
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">{s.order?.orderNo ?? s.orderId}</td>
                    <td className="px-4 py-3 text-gray-600">{s.order?.customerName ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{s.courier?.label ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{s.awbNo ?? s.trackingNo ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{s.weight ? `${s.weight} kg` : '—'}</td>
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
                  <td className="px-4 py-3"><Badge label={c.isActive ? t.shipping.active : t.shipping.inactive} color={c.isActive ? 'green' : 'gray'} /></td>
                  <td className="px-4 py-3 text-right flex gap-2 justify-end">
                    <button onClick={() => openEditCourier(c)} className="p-1.5 text-gray-400 hover:text-primary rounded"><Edit2 size={14} /></button>
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
