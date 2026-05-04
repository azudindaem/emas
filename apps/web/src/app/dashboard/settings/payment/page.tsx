'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLocale } from '@/lib/locale'
import { paymentSettings } from '@/lib/api'
import {
  CreditCard,
  Percent,
  Info,
  Save,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  Key,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type GatewayKey = 'GENERAL' | 'CHIP' | 'STRIPE' | 'AHAPAY' | 'BILLPLZ' | 'BAYARCASH' | 'TOYYIBPAY'

interface GatewayState {
  isEnabled: boolean
  config: Record<string, string>
}

// ─── Gateway field definitions ────────────────────────────────────────────────

interface Field {
  key: string
  labelKey: keyof ReturnType<typeof useLocale>['t']['paymentSettings']
  type: 'text' | 'password' | 'select' | 'textarea'
  placeholder?: string
  options?: { value: string; label: string }[]
  fetchPublicKey?: boolean // show "Get Public Key" button
}

const ENV_OPTIONS = (p: ReturnType<typeof useLocale>['t']['paymentSettings']) => [
  { value: 'sandbox', label: p.envSandbox },
  { value: 'production', label: p.envProduction },
]

function gatewayFields(p: ReturnType<typeof useLocale>['t']['paymentSettings']): Record<GatewayKey, Field[]> {
  return {
    GENERAL: [],
    CHIP: [
      { key: 'brand_id', labelKey: 'chipBrandId', type: 'text', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
      { key: 'public_key', labelKey: 'chipPublicKey', type: 'textarea', fetchPublicKey: true },
      { key: 'secret_key', labelKey: 'chipSecretKey', type: 'password' },
      { key: 'environment', labelKey: 'envLabel', type: 'select', options: ENV_OPTIONS(p) },
    ],
    STRIPE: [
      { key: 'publishable_key', labelKey: 'stripePublishableKey', type: 'text', placeholder: 'pk_...' },
      { key: 'secret_key', labelKey: 'stripeSecretKey', type: 'password', placeholder: 'sk_...' },
      { key: 'webhook_secret', labelKey: 'stripeWebhookSecret', type: 'password', placeholder: 'whsec_...' },
      { key: 'environment', labelKey: 'envLabel', type: 'select', options: ENV_OPTIONS(p) },
    ],
    AHAPAY: [
      { key: 'merchant_id', labelKey: 'ahapayMerchantId', type: 'text' },
      { key: 'api_key', labelKey: 'ahapayApiKey', type: 'password' },
      { key: 'secret_key', labelKey: 'ahapaySecretKey', type: 'password' },
      { key: 'environment', labelKey: 'envLabel', type: 'select', options: ENV_OPTIONS(p) },
    ],
    BILLPLZ: [
      { key: 'api_key', labelKey: 'billplzApiKey', type: 'password' },
      { key: 'collection_id', labelKey: 'billplzCollectionId', type: 'text' },
      { key: 'x_signature_key', labelKey: 'billplzXSignatureKey', type: 'password' },
      { key: 'environment', labelKey: 'envLabel', type: 'select', options: ENV_OPTIONS(p) },
    ],
    BAYARCASH: [
      { key: 'api_token', labelKey: 'bayarcashApiToken', type: 'password' },
      { key: 'collection_id', labelKey: 'bayarcashCollectionId', type: 'text' },
      { key: 'environment', labelKey: 'envLabel', type: 'select', options: ENV_OPTIONS(p) },
    ],
    TOYYIBPAY: [
      { key: 'user_secret_key', labelKey: 'toyyibpayUserSecretKey', type: 'password' },
      { key: 'category_code', labelKey: 'toyyibpayCategoryCode', type: 'text' },
      { key: 'environment', labelKey: 'envLabel', type: 'select', options: ENV_OPTIONS(p) },
    ],
  }
}

// ─── Toggle component ─────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 ${checked ? 'bg-amber-500' : 'bg-gray-300'}`}
    >
      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )
}

// ─── Password field with show/hide ────────────────────────────────────────────

function PasswordField({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600"
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PaymentSettingsPage() {
  const { t } = useLocale()
  const p = t.paymentSettings

  const tabs: { key: GatewayKey; label: string }[] = [
    { key: 'GENERAL', label: p.tabGeneral },
    { key: 'CHIP', label: p.tabChip },
    { key: 'STRIPE', label: p.tabStripe },
    { key: 'AHAPAY', label: p.tabAhapay },
    { key: 'BILLPLZ', label: p.tabBillplz },
    { key: 'BAYARCASH', label: p.tabBayarcash },
    { key: 'TOYYIBPAY', label: p.tabToyyibpay },
  ]

  const [activeTab, setActiveTab] = useState<GatewayKey>('GENERAL')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fetchingKey, setFetchingKey] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [states, setStates] = useState<Record<GatewayKey, GatewayState>>({
    GENERAL: { isEnabled: false, config: { feeType: 'percent', feeAmount: '' } },
    CHIP: { isEnabled: false, config: {} },
    STRIPE: { isEnabled: false, config: {} },
    AHAPAY: { isEnabled: false, config: {} },
    BILLPLZ: { isEnabled: false, config: {} },
    BAYARCASH: { isEnabled: false, config: {} },
    TOYYIBPAY: { isEnabled: false, config: {} },
  })

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const all = await paymentSettings.listAll()
      setStates((prev) => {
        const next = { ...prev }
        for (const item of all) {
          const g = item.gateway as GatewayKey
          if (g in next) {
            next[g] = {
              isEnabled: item.isEnabled,
              config: Object.fromEntries(
                Object.entries(item.config).map(([k, v]) => {
                  const str = String(v ?? '')
                  // Normalize literal \n to real newlines (e.g. PEM keys stored from older format)
                  return [k, str.replace(/\\n/g, '\n')]
                }),
              ),
            }
          }
        }
        return next
      })
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleSave() {
    const current = states[activeTab]
    setSaving(true)
    try {
      const config: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(current.config)) {
        if (v !== '') config[k] = v
      }
      await paymentSettings.upsert(activeTab, { isEnabled: current.isEnabled, config })
      showToast('success', p.savedSuccess)
    } catch {
      showToast('error', p.saveError)
    } finally {
      setSaving(false)
    }
  }

  function setField(key: string, value: string) {
    setStates((prev) => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        config: { ...prev[activeTab].config, [key]: value },
      },
    }))
  }

  async function handleFetchChipPublicKey() {
    const secretKey = states.CHIP.config.secret_key ?? ''
    const environment = states.CHIP.config.environment ?? 'production'
    if (!secretKey) {
      showToast('error', 'Sila isi Secret Key dahulu')
      return
    }
    setFetchingKey(true)
    try {
      const { publicKey } = await paymentSettings.fetchChipPublicKey(secretKey, environment)
      setStates((prev) => ({
        ...prev,
        CHIP: { ...prev.CHIP, config: { ...prev.CHIP.config, public_key: publicKey } },
      }))
      showToast('success', 'Public key berjaya diambil dari CHIP')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal mengambil public key')
    } finally {
      setFetchingKey(false)
    }
  }

  function setEnabled(value: boolean) {
    setStates((prev) => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], isEnabled: value },
    }))
  }

  const current = states[activeTab]
  const fields = gatewayFields(p)
  const currentFields = fields[activeTab]

  const gatewayTitles: Record<GatewayKey, string> = {
    GENERAL: p.generalTitle,
    CHIP: p.chipTitle,
    STRIPE: p.stripeTitle,
    AHAPAY: p.ahapayTitle,
    BILLPLZ: p.billplzTitle,
    BAYARCASH: p.bayarcashTitle,
    TOYYIBPAY: p.toyyibpayTitle,
  }

  const gatewaySubtitles: Record<GatewayKey, string> = {
    GENERAL: p.generalSubtitle,
    CHIP: p.chipSubtitle,
    STRIPE: p.stripeSubtitle,
    AHAPAY: p.ahapaySubtitle,
    BILLPLZ: p.billplzSubtitle,
    BAYARCASH: p.bayarcashSubtitle,
    TOYYIBPAY: p.toyyibpaySubtitle,
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
          <CheckCircle2 size={16} />
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
          <CreditCard size={20} className="text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{p.title}</h1>
          <p className="text-sm text-gray-500">{p.subtitle}</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === key
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="animate-spin text-amber-500" size={28} />
        </div>
      ) : (
        <div className="max-w-2xl space-y-6">
          {/* Card */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Card header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                {activeTab === 'GENERAL' ? (
                  <Percent size={18} className="text-amber-600" />
                ) : (
                  <CreditCard size={18} className="text-amber-600" />
                )}
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">{gatewayTitles[activeTab]}</h2>
                <p className="text-xs text-gray-500">{gatewaySubtitles[activeTab]}</p>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Info box for General */}
              {activeTab === 'GENERAL' && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
                  <Info size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">{p.feeInfoTitle}</p>
                    <p>{p.feeInfoDesc}</p>
                  </div>
                </div>
              )}

              {/* Sandbox warning for non-production */}
              {activeTab !== 'GENERAL' && current.config.environment === 'sandbox' && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <Info size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-700">{p.sandboxHint}</p>
                </div>
              )}

              {/* Enable toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 text-sm">
                    {activeTab === 'GENERAL' ? p.enableFee : p.enableGateway}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {activeTab === 'GENERAL' ? p.enableFeeHint : p.enableGatewayHint}
                  </p>
                </div>
                <Toggle checked={current.isEnabled} onChange={setEnabled} />
              </div>

              {/* General-specific fields */}
              {activeTab === 'GENERAL' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{p.feeType}</label>
                    <select
                      value={current.config.feeType ?? 'percent'}
                      onChange={(e) => setField('feeType', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    >
                      <option value="percent">{p.feeTypePercent}</option>
                      <option value="fixed">{p.feeTypeFixed}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{p.feeAmount}</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={current.config.feeAmount ?? ''}
                      onChange={(e) => setField('feeAmount', e.target.value)}
                      placeholder={p.feeAmountHint}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <p className="text-xs text-gray-400 mt-1">{p.feeAmountHint}</p>
                  </div>
                </>
              )}

              {/* Gateway credential fields */}
              {currentFields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {p[field.labelKey] as string}
                  </label>
                  {field.type === 'select' ? (
                    <select
                      value={current.config[field.key] ?? ''}
                      onChange={(e) => setField(field.key, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    >
                      {field.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : field.type === 'password' ? (
                    <PasswordField
                      value={current.config[field.key] ?? ''}
                      onChange={(v) => setField(field.key, v)}
                      placeholder={field.placeholder}
                    />
                  ) : field.type === 'textarea' ? (
                    <div className="space-y-2">
                      <textarea
                        value={current.config[field.key] ?? ''}
                        onChange={(e) => setField(field.key, e.target.value)}
                        placeholder={field.placeholder ?? '-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----'}
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-400 resize-y"
                      />
                      {field.fetchPublicKey && (
                        <button
                          type="button"
                          onClick={handleFetchChipPublicKey}
                          disabled={fetchingKey}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 disabled:opacity-60 text-blue-700 border border-blue-200 rounded-lg text-sm font-medium transition-colors"
                        >
                          {fetchingKey ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
                          {fetchingKey ? 'Mengambil...' : 'Get Public Key dari CHIP'}
                        </button>
                      )}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={current.config[field.key] ?? ''}
                      onChange={(e) => setField(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {p.saveSettings}
          </button>
        </div>
      )}
    </div>
  )
}
