'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLocale } from '@/lib/locale'
import { webhooks as webhooksApi, notificationChannels, type NotificationChannelConfig } from '@/lib/api'
import {
  Bell,
  Webhook,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  Shield,
  Globe,
  Zap,
  Mail,
  MessageSquare,
  MessageCircle,
  Save,
  CreditCard,
  Info,
  TrendingUp,
  History,
  Wallet,
  Send,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface WebhookItem {
  id: string
  name: string
  url: string
  secret?: string
  events: string[]
  isActive: boolean
  lastTriggeredAt?: string | null
  createdAt: string
}

type ChannelTab = 'channel' | 'emasNotify' | 'email' | 'sms' | 'whatsapp' | 'wsapme' | 'webhook'
type EmasNotifyTab = 'dashboard' | 'settings' | 'history' | 'creditHistory'

// ─── Event definitions ────────────────────────────────────────────────────────

const EVENT_GROUPS: Record<string, string[]> = {
  orders: [
    'order.created',
    'order.updated',
    'order.status_changed',
    'order.completed',
    'order.cancelled',
  ],
  payment: ['payment.received', 'payment.failed'],
  shipment: ['shipment.created', 'shipment.updated', 'shipment.delivered'],
  customer: ['customer.created'],
}

// ─── Webhook Form Modal ───────────────────────────────────────────────────────

interface WebhookFormProps {
  initial?: WebhookItem | null
  onSave: (data: Omit<WebhookItem, 'id' | 'createdAt' | 'lastTriggeredAt'>) => Promise<void>
  onClose: () => void
  saving: boolean
  t: ReturnType<typeof useLocale>['t']
}

function WebhookForm({ initial, onSave, onClose, saving, t }: WebhookFormProps) {
  const wt = t.notifications.webhook
  const [name, setName] = useState(initial?.name ?? '')
  const [url, setUrl] = useState(initial?.url ?? '')
  const [secret, setSecret] = useState(initial?.secret ?? '')
  const [events, setEvents] = useState<string[]>(initial?.events ?? [])
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const toggleEvent = (event: string) => {
    setEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    )
  }

  const toggleGroup = (group: string) => {
    const groupEvents = EVENT_GROUPS[group]
    const allSelected = groupEvents.every((e) => events.includes(e))
    if (allSelected) {
      setEvents((prev) => prev.filter((e) => !groupEvents.includes(e)))
    } else {
      setEvents((prev) => [...new Set([...prev, ...groupEvents])])
    }
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = wt.nameRequired
    if (!url.trim()) {
      errs.url = wt.urlRequired
    } else if (!/^https?:\/\/.+/.test(url.trim())) {
      errs.url = wt.urlInvalid
    }
    if (events.length === 0) errs.events = wt.noEventsSelected
    return errs
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    await onSave({ name: name.trim(), url: url.trim(), secret: secret.trim() || undefined, events, isActive })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-amber-100 p-1.5 text-amber-700">
              <Webhook size={16} />
            </div>
            <h3 className="font-semibold text-slate-800">
              {initial ? wt.edit : wt.add}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="max-h-[70vh] overflow-y-auto p-6 space-y-5">
            {/* Name */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">{wt.name}</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={wt.namePlaceholder}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
            </div>

            {/* URL */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">{wt.url}</label>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-100">
                <Globe size={14} className="shrink-0 text-slate-400" />
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={wt.urlPlaceholder}
                  className="w-full bg-transparent text-sm text-slate-800 outline-none"
                />
              </div>
              {errors.url && <p className="mt-1 text-xs text-red-500">{errors.url}</p>}
            </div>

            {/* Secret */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">{wt.secret}</label>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-100">
                <Shield size={14} className="shrink-0 text-slate-400" />
                <input
                  type="password"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder={wt.secretPlaceholder}
                  className="w-full bg-transparent text-sm text-slate-800 outline-none"
                />
              </div>
              <p className="mt-1 text-xs text-slate-400">{wt.secretHint}</p>
            </div>

            {/* Events */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">{wt.events}</label>
              <p className="mb-3 text-xs text-slate-400">{wt.eventsHint}</p>
              <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                {Object.entries(EVENT_GROUPS).map(([group, groupEvents]) => {
                  const allSelected = groupEvents.every((e) => events.includes(e))
                  const someSelected = groupEvents.some((e) => events.includes(e))
                  return (
                    <div key={group}>
                      <button
                        type="button"
                        onClick={() => toggleGroup(group)}
                        className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-amber-700"
                      >
                        <div
                          className={`h-3.5 w-3.5 rounded border transition-colors ${
                            allSelected
                              ? 'border-amber-500 bg-amber-500'
                              : someSelected
                                ? 'border-amber-400 bg-amber-200'
                                : 'border-slate-300 bg-white'
                          }`}
                        />
                        {wt.eventGroups[group as keyof typeof wt.eventGroups]}
                      </button>
                      <div className="grid grid-cols-2 gap-1.5 pl-5">
                        {groupEvents.map((event) => (
                          <label
                            key={event}
                            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white"
                          >
                            <input
                              type="checkbox"
                              checked={events.includes(event)}
                              onChange={() => toggleEvent(event)}
                              className="accent-amber-600"
                            />
                            <span className="text-xs text-slate-700">
                              {wt.eventLabels[event as keyof typeof wt.eventLabels]}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
              {errors.events && <p className="mt-1 text-xs text-red-500">{errors.events}</p>}
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm font-medium text-slate-700">{wt.active}</p>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${
                  isActive ? 'bg-amber-500' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
                    isActive ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {t.common.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Test Event Modal ─────────────────────────────────────────────────────────

interface TestModalProps {
  item: WebhookItem
  onTest: (event: string) => Promise<void>
  onClose: () => void
  testing: boolean
  t: ReturnType<typeof useLocale>['t']
}

function TestModal({ item, onTest, onClose, testing, t }: TestModalProps) {
  const wt = t.notifications.webhook
  const [selected, setSelected] = useState<string>(item.events[0] ?? '')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-indigo-100 p-1.5 text-indigo-700">
              <Zap size={16} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">{wt.test}</h3>
              <p className="text-xs text-slate-400">{item.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600">{wt.testPickEvent}</p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {item.events.map((event) => (
              <label
                key={event}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                  selected === event
                    ? 'border-indigo-300 bg-indigo-50'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="test-event"
                  value={event}
                  checked={selected === event}
                  onChange={() => setSelected(event)}
                  className="accent-indigo-600"
                />
                <span className="text-sm text-slate-700">{wt.eventLabels[event as keyof typeof wt.eventLabels] ?? event}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            onClick={() => onTest(selected)}
            disabled={!selected || testing}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {testing && <Loader2 size={14} className="animate-spin" />}
            {testing ? wt.testing : wt.testSend}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const { t } = useLocale()
  const nt = t.notifications
  const wt = t.notifications.webhook
  const ct = t.notifications.channel
  const et = t.notifications.emasNotify
  const [activeChannelTab, setActiveChannelTab] = useState<ChannelTab>('channel')
  const [activeEmasNotifyTab, setActiveEmasNotifyTab] = useState<EmasNotifyTab>('dashboard')
  const [webhookList, setWebhookList] = useState<WebhookItem[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<WebhookItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [testingItem, setTestingItem] = useState<WebhookItem | null>(null)
  const [testing, setTesting] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // ── Channel Config State ──────────────────────────────────────────────────
  const [channelConfigs, setChannelConfigs] = useState<Record<string, NotificationChannelConfig>>({})
  const [channelLoading, setChannelLoading] = useState(false)
  const [channelSaving, setChannelSaving] = useState<string | null>(null)

  // Email form
  const [emailForm, setEmailForm] = useState({ host: '', port: '587', secure: false, user: '', pass: '', from: '' })
  // SMS form
  const [smsForm, setSmsForm] = useState({ provider: 'adasms', apiKey: '', apiPassword: '', senderId: '' })
  // Wsapme form
  const [wsapmeForm, setWsapmeForm] = useState({ apiUrl: 'https://api.wsapme.com/v1/sendMessage', userToken: '', deviceId: '' })

  const loadChannelConfigs = useCallback(async () => {
    setChannelLoading(true)
    try {
      const data = await notificationChannels.list()
      const map: Record<string, NotificationChannelConfig> = {}
      for (const cfg of data) {
        map[cfg.channel] = cfg
        if (cfg.channel === 'EMAIL') {
          const s = cfg.settings as Record<string, unknown>
          setEmailForm({
            host: (s.host as string) ?? '',
            port: String(s.port ?? '587'),
            secure: Boolean(s.secure),
            user: (s.user as string) ?? '',
            pass: (s.pass as string) ?? '',
            from: (s.from as string) ?? '',
          })
        } else if (cfg.channel === 'SMS') {
          const s = cfg.settings as Record<string, unknown>
          setSmsForm({
            provider: (s.provider as string) ?? 'adasms',
            apiKey: (s.apiKey as string) ?? '',
            apiPassword: (s.apiPassword as string) ?? '',
            senderId: (s.senderId as string) ?? '',
          })
        } else if (cfg.channel === 'WHATSAPP_UNOFFICIAL') {
          const s = cfg.settings as Record<string, unknown>
          setWsapmeForm({
            apiUrl: (s.apiUrl as string) ?? 'https://api.wsapme.com/v1/sendMessage',
            userToken: (s.userToken as string) ?? '',
            deviceId: String(s.deviceId ?? ''),
          })
        }
      }
      setChannelConfigs(map)
    } catch {
      setChannelConfigs({})
    } finally {
      setChannelLoading(false)
    }
  }, [])

  const saveChannel = async (channel: 'EMAIL' | 'SMS' | 'WHATSAPP_UNOFFICIAL', settings: Record<string, unknown>, isActive: boolean) => {
    setChannelSaving(channel)
    try {
      const cfg = await notificationChannels.upsert(channel, settings, isActive)
      setChannelConfigs((prev) => ({ ...prev, [channel]: cfg }))
      showToast(nt.saveSuccess)
    } catch {
      showToast(nt.saveFail, 'error')
    } finally {
      setChannelSaving(null)
    }
  }

  const toggleChannel = async (channel: 'EMAIL' | 'SMS' | 'WHATSAPP_UNOFFICIAL') => {
    const cfg = channelConfigs[channel]
    if (!cfg) return
    setChannelSaving(channel)
    try {
      const updated = await notificationChannels.upsert(channel, cfg.settings, !cfg.isActive)
      setChannelConfigs((prev) => ({ ...prev, [channel]: updated }))
    } catch {
      showToast(nt.saveFail, 'error')
    } finally {
      setChannelSaving(null)
    }
  }

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadWebhooks = useCallback(async () => {
    setLoading(true)
    try {
      const data = await webhooksApi.list()
      setWebhookList((data as WebhookItem[]) ?? [])
    } catch {
      setWebhookList([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeChannelTab === 'webhook') {
      loadWebhooks()
      return
    }
    loadChannelConfigs()
  }, [activeChannelTab, loadWebhooks, loadChannelConfigs])

  const handleSave = async (data: Omit<WebhookItem, 'id' | 'createdAt' | 'lastTriggeredAt'>) => {
    setSaving(true)
    try {
      if (editing) {
        await webhooksApi.update(editing.id, data)
      } else {
        await webhooksApi.create(data)
      }
      showToast(wt.saveSuccess)
      setShowForm(false)
      setEditing(null)
      loadWebhooks()
    } catch (e) {
      showToast((e as Error).message ?? t.common.error, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await webhooksApi.delete(id)
      showToast(wt.deleteSuccess)
      setWebhookList((prev) => prev.filter((w) => w.id !== id))
    } catch (e) {
      showToast((e as Error).message ?? t.common.error, 'error')
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  const handleToggle = async (item: WebhookItem) => {
    setTogglingId(item.id)
    try {
      await webhooksApi.toggle(item.id, !item.isActive)
      setWebhookList((prev) =>
        prev.map((w) => (w.id === item.id ? { ...w, isActive: !w.isActive } : w)),
      )
    } catch (e) {
      showToast((e as Error).message ?? t.common.error, 'error')
    } finally {
      setTogglingId(null)
    }
  }

  const handleTest = async (event: string) => {
    if (!testingItem) return
    setTesting(true)
    try {
      const res = await webhooksApi.test(testingItem.id, event)
      if (res.success) {
        showToast(wt.testSuccess)
      } else {
        showToast(`${wt.testFailed}${res.status ? ` (HTTP ${res.status})` : ''}`, 'error')
      }
      setTestingItem(null)
      loadWebhooks()
    } catch (e) {
      showToast((e as Error).message ?? wt.testFailed, 'error')
    } finally {
      setTesting(false)
    }
  }

  const tabs: { key: ChannelTab; label: string; icon: React.ElementType }[] = [
    { key: 'channel', label: nt.tabs.channel, icon: Bell },
    { key: 'emasNotify', label: nt.tabs.emasNotify, icon: MessageCircle },
    { key: 'email', label: nt.tabs.email, icon: Mail },
    { key: 'sms', label: nt.tabs.sms, icon: MessageSquare },
    { key: 'whatsapp', label: nt.tabs.whatsapp, icon: MessageCircle },
    { key: 'wsapme', label: nt.tabs.wsapme, icon: MessageCircle },
    { key: 'webhook', label: nt.tabs.webhook, icon: Webhook },
  ]

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed right-6 top-6 z-50 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 size={16} className="text-emerald-500" />
          ) : (
            <XCircle size={16} className="text-red-500" />
          )}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800">{t.notifications.title}</h2>
        <p className="text-sm text-gray-400">{t.notifications.subtitle}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 w-fit">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveChannelTab(key)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeChannelTab === key
                ? 'bg-white text-amber-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Channels Tab */}
      {activeChannelTab !== 'webhook' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-semibold text-slate-800">{nt.channelsTitle}</h3>
            <p className="text-sm text-slate-500">{nt.subtitle}</p>
          </div>

          {channelLoading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">

              {activeChannelTab === 'channel' && (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                  {nt.channelPlaceholder}
                </div>
              )}

              {activeChannelTab === 'emasNotify' && (
                <div className="space-y-5 rounded-2xl bg-slate-100 p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl border border-amber-200 bg-white p-2.5 shadow-sm text-amber-700">
                        <Zap size={22} />
                      </div>
                      <div>
                        <h3 className="text-3xl font-bold text-slate-900">{et.title}</h3>
                        <p className="text-slate-600">{et.subtitle}</p>
                      </div>
                    </div>
                    <button className="flex items-center gap-2 rounded-xl bg-amber-600 px-6 py-2 font-medium text-white hover:bg-amber-700">
                      <CreditCard size={16} />
                      {et.topUpCredits}
                    </button>
                  </div>

                  <div className="relative rounded-2xl border border-slate-300 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
                    <div className="flex items-start gap-4">
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-amber-700">
                        <Info size={18} />
                      </div>
                      <div className="pr-4">
                        <h4 className="mb-1 font-semibold text-slate-900">{et.whatIsTitle}</h4>
                        <p className="text-sm text-slate-600">
                          {et.whatIsDescription} <span className="font-semibold">{et.ratePerMessage}</span>.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveEmasNotifyTab('dashboard')}
                      className={`flex items-center gap-2 rounded-xl px-5 py-2.5 font-medium transition-all ${
                        activeEmasNotifyTab === 'dashboard'
                          ? 'border border-amber-200 bg-amber-50 text-amber-700'
                          : 'text-slate-500 hover:bg-white hover:text-slate-900'
                      }`}
                    >
                      <TrendingUp size={16} />
                      {et.tabs.dashboard}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveEmasNotifyTab('settings')}
                      className={`flex items-center gap-2 rounded-xl px-5 py-2.5 font-medium transition-all ${
                        activeEmasNotifyTab === 'settings'
                          ? 'border border-amber-200 bg-amber-50 text-amber-700'
                          : 'text-slate-500 hover:bg-white hover:text-slate-900'
                      }`}
                    >
                      <Bell size={16} />
                      {et.tabs.settings}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveEmasNotifyTab('history')}
                      className={`flex items-center gap-2 rounded-xl px-5 py-2.5 font-medium transition-all ${
                        activeEmasNotifyTab === 'history'
                          ? 'border border-amber-200 bg-amber-50 text-amber-700'
                          : 'text-slate-500 hover:bg-white hover:text-slate-900'
                      }`}
                    >
                      <History size={16} />
                      {et.tabs.history}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveEmasNotifyTab('creditHistory')}
                      className={`flex items-center gap-2 rounded-xl px-5 py-2.5 font-medium transition-all ${
                        activeEmasNotifyTab === 'creditHistory'
                          ? 'border border-amber-200 bg-amber-50 text-amber-700'
                          : 'text-slate-500 hover:bg-white hover:text-slate-900'
                      }`}
                    >
                      <Wallet size={16} />
                      {et.tabs.creditHistory}
                    </button>
                  </div>

                  {activeEmasNotifyTab === 'dashboard' && (
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl border border-slate-300 bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
                          <div className="mb-4 flex items-center gap-3">
                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-amber-700"><Wallet size={18} /></div>
                            <span className="text-slate-500">{et.stats.creditBalance}</span>
                          </div>
                          <div className="text-4xl font-bold text-slate-900">RM 0.00</div>
                          <p className="mt-2 text-sm text-slate-500">{et.stats.messagesRemaining}</p>
                        </div>

                        <div className="rounded-2xl border border-slate-300 bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
                          <div className="mb-4 flex items-center gap-3">
                            <div className="rounded-lg border border-blue-200 bg-blue-50 p-2 text-blue-500"><Send size={18} /></div>
                            <span className="text-slate-500">{et.stats.sent30Days}</span>
                          </div>
                          <div className="text-4xl font-bold text-slate-900">0</div>
                          <p className="mt-2 text-sm text-slate-500">{et.stats.readCount}</p>
                        </div>

                        <div className="rounded-2xl border border-slate-300 bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
                          <div className="mb-4 flex items-center gap-3">
                            <div className="rounded-lg bg-green-100 p-2 text-green-600"><CheckCircle2 size={18} /></div>
                            <span className="text-slate-500">{et.stats.successRate}</span>
                          </div>
                          <div className="text-4xl font-bold text-slate-900">0%</div>
                          <p className="mt-2 text-sm text-slate-500">{et.stats.failedCount}</p>
                        </div>

                        <div className="rounded-2xl border border-slate-300 bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
                          <div className="mb-4 flex items-center gap-3">
                            <div className="rounded-lg bg-amber-100 p-2 text-amber-600"><TrendingUp size={18} /></div>
                            <span className="text-slate-500">{et.stats.spent30Days}</span>
                          </div>
                          <div className="text-4xl font-bold text-slate-900">RM 0.00</div>
                          <p className="mt-2 text-sm text-slate-500">{et.stats.spentRate}</p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-300 bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
                        <div className="mb-4 flex items-center justify-between">
                          <h4 className="text-lg font-semibold text-slate-900">{et.serviceStatus.title}</h4>
                          <div className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600">{et.serviceStatus.inactive}</div>
                        </div>
                        <p className="mb-4 text-sm text-slate-600">{et.serviceStatus.description}</p>
                        <button
                          type="button"
                          onClick={() => setActiveEmasNotifyTab('settings')}
                          className="text-sm font-medium text-amber-700 hover:text-amber-800"
                        >
                          {et.serviceStatus.goToSettings}
                        </button>
                      </div>
                    </div>
                  )}

                  {activeEmasNotifyTab === 'settings' && (
                    <div className="rounded-2xl border border-slate-300 bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
                      <h4 className="mb-2 text-lg font-semibold text-slate-900">{et.panels.settingsTitle}</h4>
                      <p className="text-sm text-slate-600">{et.panels.settingsDescription}</p>
                    </div>
                  )}

                  {activeEmasNotifyTab === 'history' && (
                    <div className="rounded-2xl border border-slate-300 bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
                      <h4 className="mb-2 text-lg font-semibold text-slate-900">{et.panels.historyTitle}</h4>
                      <p className="py-8 text-center text-slate-500">{et.panels.historyEmpty}</p>
                    </div>
                  )}

                  {activeEmasNotifyTab === 'creditHistory' && (
                    <div className="rounded-2xl border border-slate-300 bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
                      <h4 className="mb-2 text-lg font-semibold text-slate-900">{et.panels.creditHistoryTitle}</h4>
                      <p className="py-8 text-center text-slate-500">{et.panels.creditHistoryEmpty}</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── Email ─────────────────────────────────────────── */}
              {activeChannelTab === 'email' && (
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg p-2 ${channelConfigs['EMAIL']?.isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                      <Mail size={16} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{ct.email.title}</p>
                      <p className="text-xs text-slate-400">{ct.email.subtitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {channelConfigs['EMAIL'] && (
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border ${channelConfigs['EMAIL'].isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        {channelConfigs['EMAIL'].isActive ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                        {channelConfigs['EMAIL'].isActive ? nt.enabled : nt.disabled}
                      </span>
                    )}
                    {channelConfigs['EMAIL'] && (
                      <button
                        type="button"
                        onClick={() => toggleChannel('EMAIL')}
                        disabled={channelSaving === 'EMAIL'}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50"
                      >
                        {channelSaving === 'EMAIL' ? <Loader2 size={12} className="animate-spin" /> : channelConfigs['EMAIL']?.isActive ? nt.disable : nt.enable}
                      </button>
                    )}
                  </div>
                </div>

                <form
                  className="border-t border-slate-100 bg-slate-50 px-5 py-5 space-y-4"
                  onSubmit={(e) => { e.preventDefault(); saveChannel('EMAIL', { host: emailForm.host, port: Number(emailForm.port), secure: emailForm.secure, user: emailForm.user, pass: emailForm.pass, from: emailForm.from }, channelConfigs['EMAIL']?.isActive ?? true) }}
                >
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">{ct.email.host}</label>
                        <input value={emailForm.host} onChange={(e) => setEmailForm((f) => ({ ...f, host: e.target.value }))} placeholder={ct.email.hostPlaceholder} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">{ct.email.port}</label>
                        <input type="number" value={emailForm.port} onChange={(e) => setEmailForm((f) => ({ ...f, port: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100" />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">{ct.email.user}</label>
                      <input value={emailForm.user} onChange={(e) => setEmailForm((f) => ({ ...f, user: e.target.value }))} placeholder={ct.email.userPlaceholder} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">{ct.email.pass}</label>
                      <input type="password" value={emailForm.pass} onChange={(e) => setEmailForm((f) => ({ ...f, pass: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">{ct.email.from}</label>
                      <input value={emailForm.from} onChange={(e) => setEmailForm((f) => ({ ...f, from: e.target.value }))} placeholder={ct.email.fromPlaceholder} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100" />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" checked={emailForm.secure} onChange={(e) => setEmailForm((f) => ({ ...f, secure: e.target.checked }))} className="accent-amber-600" />
                      <span className="text-sm text-slate-700">{ct.email.secure}</span>
                    </label>
                    <div className="flex justify-end">
                      <button type="submit" disabled={channelSaving === 'EMAIL'} className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60">
                        {channelSaving === 'EMAIL' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        {t.common.save}
                      </button>
                    </div>
                </form>
              </div>
              )}

              {/* ── SMS ───────────────────────────────────────────── */}
              {activeChannelTab === 'sms' && (
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg p-2 ${channelConfigs['SMS']?.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                      <MessageSquare size={16} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{ct.sms.title}</p>
                      <p className="text-xs text-slate-400">{ct.sms.subtitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {channelConfigs['SMS'] && (
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border ${channelConfigs['SMS'].isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        {channelConfigs['SMS'].isActive ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                        {channelConfigs['SMS'].isActive ? nt.enabled : nt.disabled}
                      </span>
                    )}
                    {channelConfigs['SMS'] && (
                      <button type="button" onClick={() => toggleChannel('SMS')} disabled={channelSaving === 'SMS'} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50">
                        {channelSaving === 'SMS' ? <Loader2 size={12} className="animate-spin" /> : channelConfigs['SMS']?.isActive ? nt.disable : nt.enable}
                      </button>
                    )}
                  </div>
                </div>

                <form
                  className="border-t border-slate-100 bg-slate-50 px-5 py-5 space-y-4"
                  onSubmit={(e) => { e.preventDefault(); saveChannel('SMS', { provider: smsForm.provider, apiKey: smsForm.apiKey, apiPassword: smsForm.apiPassword, senderId: smsForm.senderId }, channelConfigs['SMS']?.isActive ?? true) }}
                >
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">{ct.sms.provider}</label>
                      <select value={smsForm.provider} onChange={(e) => setSmsForm((f) => ({ ...f, provider: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100">
                        <option value="adasms">{ct.sms.providerAdasms}</option>
                        <option value="smsniaga">{ct.sms.providerSmsniaga}</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">{ct.sms.apiKey}</label>
                      <input value={smsForm.apiKey} onChange={(e) => setSmsForm((f) => ({ ...f, apiKey: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100" />
                    </div>
                    {smsForm.provider === 'smsniaga' && (
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">{ct.sms.apiPassword}</label>
                        <input type="password" value={smsForm.apiPassword} onChange={(e) => setSmsForm((f) => ({ ...f, apiPassword: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100" />
                        <p className="mt-1 text-xs text-slate-400">{ct.sms.apiPasswordHint}</p>
                      </div>
                    )}
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">{ct.sms.senderId}</label>
                      <input value={smsForm.senderId} onChange={(e) => setSmsForm((f) => ({ ...f, senderId: e.target.value }))} placeholder={ct.sms.senderIdPlaceholder} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100" />
                    </div>
                    <div className="flex justify-end">
                      <button type="submit" disabled={channelSaving === 'SMS'} className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60">
                        {channelSaving === 'SMS' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        {t.common.save}
                      </button>
                    </div>
                </form>
              </div>
              )}

              {activeChannelTab === 'whatsapp' && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-indigo-100 p-2 text-indigo-700">
                      <MessageCircle size={16} />
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-indigo-900">WhatsApp Rasmi (WABA)</p>
                      <p className="text-sm text-indigo-800">Coming soon. Official WhatsApp Business API integration will be available in upcoming release.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Wsapme ────────────────────────────────────────── */}
              {activeChannelTab === 'wsapme' && (
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg p-2 ${channelConfigs['WHATSAPP_UNOFFICIAL']?.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                      <MessageCircle size={16} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{ct.wsapme.title}</p>
                      <p className="text-xs text-slate-400">{ct.wsapme.subtitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {channelConfigs['WHATSAPP_UNOFFICIAL'] && (
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border ${channelConfigs['WHATSAPP_UNOFFICIAL'].isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        {channelConfigs['WHATSAPP_UNOFFICIAL'].isActive ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                        {channelConfigs['WHATSAPP_UNOFFICIAL'].isActive ? nt.enabled : nt.disabled}
                      </span>
                    )}
                    {channelConfigs['WHATSAPP_UNOFFICIAL'] && (
                      <button type="button" onClick={() => toggleChannel('WHATSAPP_UNOFFICIAL')} disabled={channelSaving === 'WHATSAPP_UNOFFICIAL'} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50">
                        {channelSaving === 'WHATSAPP_UNOFFICIAL' ? <Loader2 size={12} className="animate-spin" /> : channelConfigs['WHATSAPP_UNOFFICIAL']?.isActive ? nt.disable : nt.enable}
                      </button>
                    )}
                  </div>
                </div>

                <form
                  className="border-t border-slate-100 bg-slate-50 px-5 py-5 space-y-4"
                  onSubmit={(e) => { e.preventDefault(); saveChannel('WHATSAPP_UNOFFICIAL', { apiUrl: wsapmeForm.apiUrl, userToken: wsapmeForm.userToken, deviceId: Number(wsapmeForm.deviceId) }, channelConfigs['WHATSAPP_UNOFFICIAL']?.isActive ?? true) }}
                >
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">{ct.wsapme.apiUrl}</label>
                      <input value={wsapmeForm.apiUrl} onChange={(e) => setWsapmeForm((f) => ({ ...f, apiUrl: e.target.value }))} placeholder={ct.wsapme.apiUrlPlaceholder} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">{ct.wsapme.userToken}</label>
                      <input type="password" value={wsapmeForm.userToken} onChange={(e) => setWsapmeForm((f) => ({ ...f, userToken: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">{ct.wsapme.deviceId}</label>
                      <input type="number" value={wsapmeForm.deviceId} onChange={(e) => setWsapmeForm((f) => ({ ...f, deviceId: e.target.value }))} placeholder="e.g. 10" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100" />
                    </div>
                    <div className="flex justify-end">
                      <button type="submit" disabled={channelSaving === 'WHATSAPP_UNOFFICIAL'} className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60">
                        {channelSaving === 'WHATSAPP_UNOFFICIAL' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        {t.common.save}
                      </button>
                    </div>
                </form>
              </div>
              )}

            </div>
          )}
        </div>
      )}

      {/* Webhooks Tab */}
      {activeChannelTab === 'webhook' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-800">{wt.title}</h3>
              <p className="text-sm text-slate-500">{wt.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => { setEditing(null); setShowForm(true) }}
              className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
            >
              <Plus size={15} />
              {wt.add}
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : webhookList.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-16 text-center">
              <div className="mb-4 rounded-2xl bg-amber-100 p-4 text-amber-600">
                <Zap size={28} />
              </div>
              <p className="font-medium text-slate-700">{wt.noWebhooks}</p>
              <p className="mt-1 text-sm text-slate-400">{wt.noWebhooksHint}</p>
              <button
                type="button"
                onClick={() => { setEditing(null); setShowForm(true) }}
                className="mt-5 flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
              >
                <Plus size={14} />
                {wt.add}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {webhookList.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`mt-0.5 shrink-0 rounded-lg p-2 ${item.isActive ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'}`}>
                        <Webhook size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-slate-800">{item.name}</p>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                              item.isActive
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}
                          >
                            {item.isActive ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                            {item.isActive ? wt.active : wt.inactive}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-sm text-slate-400">{item.url}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {item.events.map((event) => (
                            <span
                              key={event}
                              className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                            >
                              {event}
                            </span>
                          ))}
                        </div>
                        {item.lastTriggeredAt && (
                          <p className="mt-2 text-xs text-slate-400">
                            {wt.lastTriggered}: {new Date(item.lastTriggeredAt).toLocaleString('en-MY')}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggle(item)}
                        disabled={togglingId === item.id}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                          item.isActive
                            ? 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                            : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        {togglingId === item.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : item.isActive ? wt.disable : wt.enable}
                      </button>

                      <button
                        type="button"
                        onClick={() => setTestingItem(item)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200"
                      >
                        {wt.test}
                      </button>

                      <button
                        type="button"
                        onClick={() => { setEditing(item); setShowForm(true) }}
                        className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 hover:text-amber-700"
                      >
                        <Pencil size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(item.id)}
                        className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <WebhookForm
          initial={editing}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null) }}
          saving={saving}
          t={t}
        />
      )}

      {/* Test Event Modal */}
      {testingItem && (
        <TestModal
          item={testingItem}
          onTest={handleTest}
          onClose={() => setTestingItem(null)}
          testing={testing}
          t={t}
        />
      )}

      {/* Delete Confirm Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
              <Trash2 size={20} />
            </div>
            <h3 className="font-semibold text-slate-800">{wt.delete}</h3>
            <p className="mt-2 text-sm text-slate-500">{wt.deleteConfirm}</p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={deletingId === confirmDeleteId}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deletingId === confirmDeleteId && <Loader2 size={14} className="animate-spin" />}
                {t.common.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

