'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLocale } from '@/lib/locale'
import { shipping as shippingApi } from '@/lib/api'
import {
  Truck,
  MapPin,
  Settings2,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Save,
  Loader2,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CourierAccount {
  id: string
  provider: string
  label: string
  credentials: Record<string, unknown>
  isActive: boolean
  createdAt: string
}

interface ShippingRate {
  id: string
  name: string
  rateType: string
  config: Record<string, unknown>
  courierId: string | null
  isActive: boolean
}

interface ShippingZone {
  id: string
  name: string
  code: string
  countries: string[]
  states: string[]
  isActive: boolean
  rates: ShippingRate[]
}

interface ShippingDefaults {
  defaultCourierId: string | null
  autoGenerateAwb: boolean
  autoAssignCourier: boolean
  selfPickupEnabled: boolean
  defaultWeightKg: number
  defaultLengthCm: number
  defaultWidthCm: number
  defaultHeightCm: number
  pickupSlaDays: number
  currencyRates: Record<string, number>
}

const COURIER_PROVIDERS = [
  'NINJAVAN',
  'POS_MALAYSIA',
  'JNT',
  'DHL',
  'FLASH',
  'GDEX',
  'SKYNET',
  'AIRPAK',
  'OTHERS',
]

const PROVIDER_LABELS: Record<string, string> = {
  NINJAVAN: 'NinjaVan',
  POS_MALAYSIA: 'Pos Malaysia',
  JNT: 'J&T Express',
  DHL: 'DHL',
  FLASH: 'Flash Express',
  GDEX: 'GDEX',
  SKYNET: 'Skynet',
  AIRPAK: 'AirPak',
  OTHERS: 'Others',
}

const RATE_TYPES = ['FLAT', 'WEIGHT_TIER', 'FREE_SHIPPING', 'COD_SURCHARGE', 'REMOTE_SURCHARGE']

// ─── Courier Credential Fields ────────────────────────────────────────────────

interface CredentialField {
  key: string
  labelKey: string // key in shipping labels
  type: 'text' | 'password' | 'select'
  placeholder?: string
  required: boolean
  options?: { value: string; labelKey: string }[]
}

const COURIER_CREDENTIAL_FIELDS: Record<string, CredentialField[]> = {
  NINJAVAN: [
    { key: 'client_id', labelKey: 'fieldClientId', type: 'text', required: true, placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
    { key: 'client_secret', labelKey: 'fieldClientSecret', type: 'password', required: true },
    { key: 'country', labelKey: 'fieldCountryCode', type: 'text', required: false, placeholder: 'MY' },
    {
      key: 'environment', labelKey: 'envLabel', type: 'select', required: false,
      options: [
        { value: 'production', labelKey: 'envProduction' },
        { value: 'sandbox', labelKey: 'envSandbox' },
      ],
    },
  ],
  JNT: [
    { key: 'customer_code', labelKey: 'fieldCustomerCode', type: 'text', required: true },
    { key: 'api_key', labelKey: 'fieldApiKey', type: 'password', required: true },
  ],
  POS_MALAYSIA: [
    { key: 'account_no', labelKey: 'fieldAccountNo', type: 'text', required: true },
    { key: 'api_key', labelKey: 'fieldApiKey', type: 'password', required: true },
  ],
  DHL: [
    { key: 'account_number', labelKey: 'fieldAccountNo', type: 'text', required: true },
    { key: 'api_key', labelKey: 'fieldApiKey', type: 'password', required: true },
    { key: 'api_secret', labelKey: 'fieldApiSecret', type: 'password', required: true },
  ],
  FLASH: [
    { key: 'customer_id', labelKey: 'fieldCustomerId', type: 'text', required: true },
    { key: 'api_key', labelKey: 'fieldApiKey', type: 'password', required: true },
  ],
  GDEX: [
    { key: 'account_no', labelKey: 'fieldAccountNo', type: 'text', required: true },
    { key: 'api_key', labelKey: 'fieldApiKey', type: 'password', required: true },
  ],
  SKYNET: [
    { key: 'account_no', labelKey: 'fieldAccountNo', type: 'text', required: true },
    { key: 'api_key', labelKey: 'fieldApiKey', type: 'password', required: true },
  ],
  AIRPAK: [
    { key: 'username', labelKey: 'fieldUsername', type: 'text', required: true },
    { key: 'password', labelKey: 'fieldPassword', type: 'password', required: true },
  ],
  OTHERS: [
    { key: 'api_key', labelKey: 'fieldApiKey', type: 'text', required: false },
    { key: 'api_secret', labelKey: 'fieldApiSecret', type: 'password', required: false },
  ],
}

function buildCredentialsFromFields(fields: CredentialField[], values: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const f of fields) {
    const val = values[f.key] ?? ''
    if (val !== '') result[f.key] = val
  }
  return result
}

function extractFieldValues(fields: CredentialField[], credentials: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {}
  for (const f of fields) {
    result[f.key] = credentials[f.key] != null ? String(credentials[f.key]) : ''
  }
  return result
}

// ─── Courier Form Modal ───────────────────────────────────────────────────────

function CourierModal({
  courier,
  labels,
  onSave,
  onClose,
}: {
  courier: CourierAccount | null
  labels: ReturnType<typeof useLocale>['t']['settings']['shipping']
  onSave: (data: Partial<CourierAccount>) => Promise<void>
  onClose: () => void
}) {
  const [provider, setProvider] = useState(courier?.provider ?? 'NINJAVAN')
  const [label, setLabel] = useState(courier?.label ?? '')
  const [credentialFields, setCredentialFields] = useState<Record<string, string>>(() => {
    const fields = COURIER_CREDENTIAL_FIELDS[courier?.provider ?? 'NINJAVAN'] ?? []
    return extractFieldValues(fields, (courier?.credentials as Record<string, unknown>) ?? {})
  })
  const [isActive, setIsActive] = useState(courier?.isActive ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function handleProviderChange(newProvider: string) {
    setProvider(newProvider)
    const fields = COURIER_CREDENTIAL_FIELDS[newProvider] ?? []
    setCredentialFields(extractFieldValues(fields, {}))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const fields = COURIER_CREDENTIAL_FIELDS[provider] ?? []
    const parsed = buildCredentialsFromFields(fields, credentialFields)
    setSaving(true)
    try {
      await onSave({ provider, label, credentials: parsed, isActive })
      onClose()
    } catch {
      setError(labels.saveError ?? 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const currentFields = COURIER_CREDENTIAL_FIELDS[provider] ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{courier ? labels.editCourier : labels.addCourier}</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{labels.courierProvider}</label>
            <select
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {COURIER_PROVIDERS.map((p) => (
                <option key={p} value={p}>{PROVIDER_LABELS[p] ?? p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{labels.courierLabel}</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              placeholder="e.g. NinjaVan Main Account"
            />
          </div>
          {currentFields.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">{labels.credentialsSection}</p>
              {currentFields.map((field) => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {(labels as Record<string, string>)[field.labelKey] ?? field.labelKey}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {field.type === 'select' ? (
                    <select
                      value={credentialFields[field.key] ?? ''}
                      onChange={(e) => setCredentialFields(prev => ({ ...prev, [field.key]: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    >
                      {field.options?.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {(labels as Record<string, string>)[opt.labelKey] ?? opt.labelKey}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      value={credentialFields[field.key] ?? ''}
                      onChange={(e) => setCredentialFields(prev => ({ ...prev, [field.key]: e.target.value }))}
                      required={field.required}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  )}
                  {field.key === 'environment' && credentialFields[field.key] === 'sandbox' && (
                    <p className="text-xs text-amber-600 mt-1">{labels.sandboxHint}</p>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 accent-amber-500"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">{labels.courierActive}</label>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Save
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Zone Form Modal ──────────────────────────────────────────────────────────

function ZoneModal({
  zone,
  labels,
  onSave,
  onClose,
}: {
  zone: ShippingZone | null
  labels: ReturnType<typeof useLocale>['t']['settings']['shipping']
  onSave: (data: Partial<ShippingZone>) => Promise<void>
  onClose: () => void
}) {
  const [name, setName] = useState(zone?.name ?? '')
  const [code, setCode] = useState(zone?.code ?? '')
  const [countries, setCountries] = useState(zone ? zone.countries.join(', ') : 'MY')
  const [states, setStates] = useState(zone ? zone.states.join(', ') : '')
  const [isActive, setIsActive] = useState(zone?.isActive ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await onSave({
        name,
        code,
        countries: countries.split(',').map((s) => s.trim()).filter(Boolean),
        states: states.split(',').map((s) => s.trim()).filter(Boolean),
        isActive,
      })
      onClose()
    } catch {
      setError(labels.saveError ?? 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{zone ? labels.editZone : labels.addZone}</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{labels.zoneName}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              placeholder="e.g. West Malaysia"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{labels.zoneCode}</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              placeholder="e.g. MY_WEST"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{labels.zoneCountries}</label>
            <input
              type="text"
              value={countries}
              onChange={(e) => setCountries(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              placeholder="MY, SG"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{labels.zoneStates}</label>
            <input
              type="text"
              value={states}
              onChange={(e) => setStates(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              placeholder="Selangor, KL, Johor"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="zoneActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 accent-amber-500"
            />
            <label htmlFor="zoneActive" className="text-sm text-gray-700">{labels.courierActive}</label>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Save
            </button>
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Rate Form Modal ──────────────────────────────────────────────────────────

function RateModal({
  rate,
  labels,
  couriers,
  onSave,
  onClose,
}: {
  rate: ShippingRate | null
  labels: ReturnType<typeof useLocale>['t']['settings']['shipping']
  couriers: CourierAccount[]
  onSave: (data: Partial<ShippingRate>) => Promise<void>
  onClose: () => void
}) {
  const [name, setName] = useState(rate?.name ?? '')
  const [rateType, setRateType] = useState(rate?.rateType ?? 'FLAT')
  const [courierId, setCourierId] = useState(rate?.courierId ?? '')
  const [isActive, setIsActive] = useState(rate?.isActive ?? true)
  const [amount, setAmount] = useState(String(rate?.config?.amount ?? '8.00'))
  const [freeThreshold, setFreeThreshold] = useState(String(rate?.config?.freeThreshold ?? '150'))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const rateTypeLabels: Record<string, string> = {
    FLAT: labels.rateFlat,
    WEIGHT_TIER: labels.rateWeightTier,
    FREE_SHIPPING: labels.rateFreeShipping,
    COD_SURCHARGE: labels.rateCodSurcharge,
    REMOTE_SURCHARGE: labels.rateRemoteSurcharge,
  }

  function buildConfig(): Record<string, unknown> {
    if (rateType === 'FREE_SHIPPING') return { freeThreshold: parseFloat(freeThreshold) || 0 }
    return { amount: parseFloat(amount) || 0 }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await onSave({ name, rateType, config: buildConfig(), courierId: courierId || null, isActive })
      onClose()
    } catch {
      setError(labels.saveError ?? 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{rate ? labels.editRate : labels.addRate}</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{labels.rateName}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              placeholder="e.g. Standard Rate"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{labels.rateType}</label>
            <select
              value={rateType}
              onChange={(e) => setRateType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {RATE_TYPES.map((rt) => (
                <option key={rt} value={rt}>{rateTypeLabels[rt] ?? rt}</option>
              ))}
            </select>
          </div>
          {rateType === 'FREE_SHIPPING' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{labels.freeThreshold}</label>
              <input
                type="number"
                value={freeThreshold}
                onChange={(e) => setFreeThreshold(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                step="0.01"
                min="0"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{labels.amount}</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                step="0.01"
                min="0"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Courier (optional)</label>
            <select
              value={courierId}
              onChange={(e) => setCourierId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="">All couriers</option>
              {couriers.map((c) => (
                <option key={c.id} value={c.id}>{c.label} ({PROVIDER_LABELS[c.provider] ?? c.provider})</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="rateActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 accent-amber-500"
            />
            <label htmlFor="rateActive" className="text-sm text-gray-700">{labels.courierActive}</label>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Save
            </button>
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsShippingPage() {
  const { t } = useLocale()
  const s = t.settings.shipping

  const [activeTab, setActiveTab] = useState<'couriers' | 'zones' | 'defaults'>('couriers')

  // Couriers state
  const [couriers, setCouriers] = useState<CourierAccount[]>([])
  const [couriersLoading, setCouriersLoading] = useState(true)
  const [courierModal, setCourierModal] = useState<{ open: boolean; courier: CourierAccount | null }>({ open: false, courier: null })

  // Zones state
  const [zones, setZones] = useState<ShippingZone[]>([])
  const [zonesLoading, setZonesLoading] = useState(true)
  const [expandedZone, setExpandedZone] = useState<string | null>(null)
  const [zoneModal, setZoneModal] = useState<{ open: boolean; zone: ShippingZone | null }>({ open: false, zone: null })
  const [rateModal, setRateModal] = useState<{ open: boolean; zoneId: string; rate: ShippingRate | null }>({ open: false, zoneId: '', rate: null })

  // Defaults state
  const [defaults, setDefaults] = useState<ShippingDefaults>({
    defaultCourierId: null,
    autoGenerateAwb: false,
    autoAssignCourier: false,
    selfPickupEnabled: false,
    defaultWeightKg: 1,
    defaultLengthCm: 30,
    defaultWidthCm: 20,
    defaultHeightCm: 10,
    pickupSlaDays: 1,
    currencyRates: { SGD: 3.5, BND: 3.5 },
  })
  const [defaultsLoading, setDefaultsLoading] = useState(true)
  const [defaultsSaving, setDefaultsSaving] = useState(false)
  const [defaultsSuccess, setDefaultsSuccess] = useState(false)
  const [defaultsError, setDefaultsError] = useState('')

  // Load couriers
  const loadCouriers = useCallback(async () => {
    setCouriersLoading(true)
    try {
      const data = await shippingApi.listCouriers()
      setCouriers((data as CourierAccount[]) ?? [])
    } catch {
      /* ignore */
    } finally {
      setCouriersLoading(false)
    }
  }, [])

  // Load zones
  const loadZones = useCallback(async () => {
    setZonesLoading(true)
    try {
      const data = await shippingApi.listZones()
      setZones((data as ShippingZone[]) ?? [])
    } catch {
      /* ignore */
    } finally {
      setZonesLoading(false)
    }
  }, [])

  // Load defaults
  const loadDefaults = useCallback(async () => {
    setDefaultsLoading(true)
    try {
      const data = (await shippingApi.getDefaults()) as ShippingDefaults
      setDefaults({
        defaultCourierId: data.defaultCourierId ?? null,
        autoGenerateAwb: data.autoGenerateAwb ?? false,
        autoAssignCourier: data.autoAssignCourier ?? false,
        selfPickupEnabled: data.selfPickupEnabled ?? false,
        defaultWeightKg: Number(data.defaultWeightKg ?? 1),
        defaultLengthCm: data.defaultLengthCm ?? 30,
        defaultWidthCm: data.defaultWidthCm ?? 20,
        defaultHeightCm: data.defaultHeightCm ?? 10,
        pickupSlaDays: data.pickupSlaDays ?? 1,
        currencyRates: (data.currencyRates as Record<string, number>) ?? { SGD: 3.5, BND: 3.5 },
      })
    } catch {
      /* ignore */
    } finally {
      setDefaultsLoading(false)
    }
  }, [])

  useEffect(() => { loadCouriers() }, [loadCouriers])
  useEffect(() => { loadZones() }, [loadZones])
  useEffect(() => { loadDefaults() }, [loadDefaults])

  // Courier actions
  async function handleSaveCourier(data: Partial<CourierAccount>) {
    if (courierModal.courier) {
      await shippingApi.updateCourier(courierModal.courier.id, data)
    } else {
      await shippingApi.createCourier(data)
    }
    await loadCouriers()
  }

  async function handleDeleteCourier(id: string) {
    if (!confirm('Delete this courier account?')) return
    await shippingApi.deleteCourier(id)
    await loadCouriers()
  }

  // Zone actions
  async function handleSaveZone(data: Partial<ShippingZone>) {
    if (zoneModal.zone) {
      await shippingApi.updateZone(zoneModal.zone.id, data)
    } else {
      await shippingApi.createZone(data)
    }
    await loadZones()
  }

  async function handleDeleteZone(id: string) {
    if (!confirm('Delete this shipping zone and all its rates?')) return
    await shippingApi.deleteZone(id)
    await loadZones()
  }

  // Rate actions
  async function handleSaveRate(data: Partial<ShippingRate>) {
    if (rateModal.rate) {
      await shippingApi.updateRate(rateModal.zoneId, rateModal.rate.id, data)
    } else {
      await shippingApi.createRate(rateModal.zoneId, data)
    }
    await loadZones()
  }

  async function handleDeleteRate(zoneId: string, rateId: string) {
    if (!confirm('Delete this rate?')) return
    await shippingApi.deleteRate(zoneId, rateId)
    await loadZones()
  }

  // Defaults save
  async function handleSaveDefaults() {
    setDefaultsSaving(true)
    setDefaultsError('')
    setDefaultsSuccess(false)
    try {
      await shippingApi.updateDefaults(defaults)
      setDefaultsSuccess(true)
      setTimeout(() => setDefaultsSuccess(false), 3000)
    } catch {
      setDefaultsError(s.saveError)
    } finally {
      setDefaultsSaving(false)
    }
  }

  const rateTypeLabel: Record<string, string> = {
    FLAT: s.rateFlat,
    WEIGHT_TIER: s.rateWeightTier,
    FREE_SHIPPING: s.rateFreeShipping,
    COD_SURCHARGE: s.rateCodSurcharge,
    REMOTE_SURCHARGE: s.rateRemoteSurcharge,
  }

  const tabs = [
    { key: 'couriers' as const, label: s.tabCouriers, icon: Truck },
    { key: 'zones' as const, label: s.tabZones, icon: MapPin },
    { key: 'defaults' as const, label: s.tabDefaults, icon: Settings2 },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{s.title}</h1>
        <p className="text-sm text-gray-500 mt-1">{s.subtitle}</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === key
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* ─── Couriers Tab ─── */}
      {activeTab === 'couriers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">{s.couriersTitle}</h2>
              <p className="text-sm text-gray-500">{s.couriersSubtitle}</p>
            </div>
            <button
              onClick={() => setCourierModal({ open: true, courier: null })}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium"
            >
              <Plus size={16} />
              {s.addCourier}
            </button>
          </div>

          {couriersLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="animate-spin text-amber-500" />
            </div>
          ) : couriers.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Truck size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">{s.noCouriers}</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {couriers.map((c) => (
                <div key={c.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                  <div className="flex-shrink-0">
                    {c.isActive ? (
                      <CheckCircle2 size={20} className="text-green-500" />
                    ) : (
                      <XCircle size={20} className="text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 text-sm">{c.label}</span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {PROVIDER_LABELS[c.provider] ?? c.provider}
                      </span>
                    </div>
                    <span className={`text-xs ${c.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                      {c.isActive ? s.courierActive : s.courierInactive}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCourierModal({ open: true, courier: c })}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => handleDeleteCourier(c.id)}
                      className="p-2 rounded-lg hover:bg-red-50 text-red-400"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Zones Tab ─── */}
      {activeTab === 'zones' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">{s.zonesTitle}</h2>
              <p className="text-sm text-gray-500">{s.zonesSubtitle}</p>
            </div>
            <button
              onClick={() => setZoneModal({ open: true, zone: null })}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium"
            >
              <Plus size={16} />
              {s.addZone}
            </button>
          </div>

          {zonesLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="animate-spin text-amber-500" />
            </div>
          ) : zones.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <MapPin size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">{s.noZones}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {zones.map((zone) => (
                <div key={zone.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* Zone header */}
                  <div className="flex items-center gap-3 p-4">
                    <button
                      onClick={() => setExpandedZone(expandedZone === zone.id ? null : zone.id)}
                      className="flex items-center gap-2 flex-1 min-w-0 text-left"
                    >
                      {expandedZone === zone.id ? (
                        <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 text-sm">{zone.name}</span>
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-mono">{zone.code}</span>
                          {!zone.isActive && (
                            <span className="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full">Inactive</span>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">
                          {zone.countries.join(', ')} &middot; {zone.rates.length} {s.zoneRates.toLowerCase()}
                        </span>
                      </div>
                    </button>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setZoneModal({ open: true, zone })}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDeleteZone(zone.id)}
                        className="p-2 rounded-lg hover:bg-red-50 text-red-400"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Zone rates (expanded) */}
                  {expandedZone === zone.id && (
                    <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{s.zoneRates}</span>
                        <button
                          onClick={() => setRateModal({ open: true, zoneId: zone.id, rate: null })}
                          className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium"
                        >
                          <Plus size={13} />
                          {s.addRate}
                        </button>
                      </div>
                      {zone.rates.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-4">{s.noRates}</p>
                      ) : (
                        <div className="space-y-2">
                          {zone.rates.map((rate) => (
                            <div key={rate.id} className="flex items-center gap-3 bg-white rounded-lg border border-gray-100 px-3 py-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-800">{rate.name}</span>
                                  <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">
                                    {rateTypeLabel[rate.rateType] ?? rate.rateType}
                                  </span>
                                  {!rate.isActive && (
                                    <span className="text-xs bg-red-50 text-red-400 px-2 py-0.5 rounded-full">Inactive</span>
                                  )}
                                </div>
                                <span className="text-xs text-gray-400">
                                  {rate.rateType === 'FREE_SHIPPING'
                                    ? `Free ≥ RM${rate.config?.freeThreshold ?? 0}`
                                    : `RM${rate.config?.amount ?? 0}`}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setRateModal({ open: true, zoneId: zone.id, rate })}
                                  className="p-1.5 rounded hover:bg-gray-100 text-gray-400"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  onClick={() => handleDeleteRate(zone.id, rate.id)}
                                  className="p-1.5 rounded hover:bg-red-50 text-red-300"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Defaults Tab ─── */}
      {activeTab === 'defaults' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{s.defaultsTitle}</h2>
            <p className="text-sm text-gray-500">{s.defaultsSubtitle}</p>
          </div>

          {defaultsLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="animate-spin text-amber-500" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Default Courier */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">{s.defaultCourier}</h3>
                <select
                  value={defaults.defaultCourierId ?? ''}
                  onChange={(e) => setDefaults({ ...defaults, defaultCourierId: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="">{s.noCourierSelected}</option>
                  {couriers.filter((c) => c.isActive).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label} ({PROVIDER_LABELS[c.provider] ?? c.provider})
                    </option>
                  ))}
                </select>
              </div>

              {/* Automation Toggles */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">Automation</h3>
                {[
                  { key: 'autoGenerateAwb' as const, label: s.autoGenerateAwb, hint: s.autoGenerateAwbHint },
                  { key: 'autoAssignCourier' as const, label: s.autoAssignCourier, hint: s.autoAssignCourierHint },
                  { key: 'selfPickupEnabled' as const, label: s.selfPickupEnabled, hint: s.selfPickupHint },
                ].map(({ key, label, hint }) => (
                  <div key={key} className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <button
                        onClick={() => setDefaults({ ...defaults, [key]: !defaults[key] })}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          defaults[key] ? 'bg-amber-500' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                            defaults[key] ? 'translate-x-4' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{label}</p>
                      <p className="text-xs text-gray-400">{hint}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Package Dimensions */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">{s.packageDimensions}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{s.defaultWeight}</label>
                    <input
                      type="number"
                      value={defaults.defaultWeightKg}
                      onChange={(e) => setDefaults({ ...defaults, defaultWeightKg: parseFloat(e.target.value) || 0 })}
                      step="0.1"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{s.pickupSla}</label>
                    <input
                      type="number"
                      value={defaults.pickupSlaDays}
                      onChange={(e) => setDefaults({ ...defaults, pickupSlaDays: parseInt(e.target.value) || 1 })}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{s.defaultLength}</label>
                    <input
                      type="number"
                      value={defaults.defaultLengthCm}
                      onChange={(e) => setDefaults({ ...defaults, defaultLengthCm: parseInt(e.target.value) || 0 })}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{s.defaultWidth}</label>
                    <input
                      type="number"
                      value={defaults.defaultWidthCm}
                      onChange={(e) => setDefaults({ ...defaults, defaultWidthCm: parseInt(e.target.value) || 0 })}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">{s.defaultHeight}</label>
                    <input
                      type="number"
                      value={defaults.defaultHeightCm}
                      onChange={(e) => setDefaults({ ...defaults, defaultHeightCm: parseInt(e.target.value) || 0 })}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                </div>
              </div>

              {/* Currency Rates */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-1">{s.currencyRates}</h3>
                <p className="text-xs text-gray-400 mb-4">{s.currencyRatesHint}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{s.sgdRate} (MYR)</label>
                    <input
                      type="number"
                      value={defaults.currencyRates.SGD ?? 3.5}
                      onChange={(e) =>
                        setDefaults({ ...defaults, currencyRates: { ...defaults.currencyRates, SGD: parseFloat(e.target.value) || 0 } })
                      }
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{s.bndRate} (MYR)</label>
                    <input
                      type="number"
                      value={defaults.currencyRates.BND ?? 3.5}
                      onChange={(e) =>
                        setDefaults({ ...defaults, currencyRates: { ...defaults.currencyRates, BND: parseFloat(e.target.value) || 0 } })
                      }
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                </div>
              </div>

              {/* Save Bar */}
              <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-3">
                <div>
                  {defaultsSuccess && <p className="text-sm text-green-600 font-medium">{s.savedSuccess}</p>}
                  {defaultsError && <p className="text-sm text-red-500">{defaultsError}</p>}
                </div>
                <button
                  onClick={handleSaveDefaults}
                  disabled={defaultsSaving}
                  className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {defaultsSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  {t.common.save}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {courierModal.open && (
        <CourierModal
          courier={courierModal.courier}
          labels={s}
          onSave={handleSaveCourier}
          onClose={() => setCourierModal({ open: false, courier: null })}
        />
      )}
      {zoneModal.open && (
        <ZoneModal
          zone={zoneModal.zone}
          labels={s}
          onSave={handleSaveZone}
          onClose={() => setZoneModal({ open: false, zone: null })}
        />
      )}
      {rateModal.open && (
        <RateModal
          rate={rateModal.rate}
          labels={s}
          couriers={couriers}
          onSave={handleSaveRate}
          onClose={() => setRateModal({ open: false, zoneId: '', rate: null })}
        />
      )}
    </div>
  )
}
