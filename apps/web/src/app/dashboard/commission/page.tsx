'use client'

import { useEffect, useState } from 'react'
import { commission as commissionApi } from '@/lib/api'
import { Badge } from '@/components/ui'
import { useLocale } from '@/lib/locale'
import { Plus, Pencil, Trash2, X, Save, ChevronDown } from 'lucide-react'

type Rule = {
  id: string
  name: string
  type: string
  value: number
  valueType: string
  isActive: boolean
  minLevel: number | null
  maxLevel: number | null
}

type Log = {
  id: string
  orderId: string
  commissionAmount: number
  ruleType: string
  status: string
  createdAt: string
  order?: { orderNo: string; total: number }
  recipient?: { name: string; email: string }
}

const COMMISSION_TYPES = ['SALES', 'RECRUITMENT', 'CHANNEL', 'NETWORK', 'POINT', 'SAME_LEVEL', 'BONUS']
const VALUE_TYPES = ['PERCENTAGE', 'FIXED']

const emptyForm = { name: '', type: 'SALES', value: '', valueType: 'PERCENTAGE', minLevel: '', maxLevel: '', isActive: true }

export default function CommissionPage() {
  const { t } = useLocale()
  const ct = t.commission as any
  const [tab, setTab] = useState<'rules' | 'logs'>('rules')
  const [rules, setRules] = useState<Rule[]>([])
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [logsLoading, setLogsLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadRules = () => {
    setLoading(true)
    commissionApi.rules().then((res) => {
      setRules(res as Rule[])
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  const loadLogs = () => {
    setLogsLoading(true)
    commissionApi.logs().then((res) => {
      setLogs(res as Log[])
      setLogsLoading(false)
    }).catch(() => setLogsLoading(false))
  }

  useEffect(() => { loadRules() }, [])
  useEffect(() => { if (tab === 'logs') loadLogs() }, [tab])

  const openNew = () => {
    setEditId(null)
    setForm({ ...emptyForm })
    setError('')
    setShowForm(true)
  }

  const openEdit = (r: Rule) => {
    setEditId(r.id)
    setForm({
      name: r.name,
      type: r.type,
      value: String(r.value),
      valueType: r.valueType,
      minLevel: r.minLevel !== null ? String(r.minLevel) : '',
      maxLevel: r.maxLevel !== null ? String(r.maxLevel) : '',
      isActive: r.isActive,
    })
    setError('')
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm(ct.deleteConfirm)) return
    await commissionApi.deleteRule(id)
    loadRules()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.value) { setError(ct.failedSave); return }
    setSaving(true)
    setError('')
    try {
      const payload = {
        name: form.name,
        type: form.type,
        value: Number(form.value),
        valueType: form.valueType,
        minLevel: form.minLevel ? Number(form.minLevel) : undefined,
        maxLevel: form.maxLevel ? Number(form.maxLevel) : undefined,
        isActive: form.isActive,
      }
      if (editId) {
        await commissionApi.updateRule(editId, payload)
      } else {
        await commissionApi.createRule(payload)
      }
      setShowForm(false)
      loadRules()
    } catch {
      setError(ct.failedSave)
    } finally {
      setSaving(false)
    }
  }

  const typeLabel = (type: string) => ct.types?.[type] ?? type
  const valueTypeLabel = (vt: string) => ct.valueTypes?.[vt] ?? vt

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">{ct.title}</h2>
          <p className="text-sm text-gray-400">{ct.subtitle}</p>
        </div>
        {tab === 'rules' && (
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-black text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} />
            {ct.newRule}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(['rules', 'logs'] as const).map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === tabKey ? 'border-primary text-primary-dark' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tabKey === 'rules' ? ct.title : ct.logs}
          </button>
        ))}
      </div>

      {/* Rules Tab */}
      {tab === 'rules' && (
        loading ? (
          <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
        ) : rules.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm bg-white border border-gray-200 rounded-xl">
            <p className="mb-3">{ct.noRules}</p>
            <button onClick={openNew} className="text-primary-dark font-medium hover:underline text-sm">
              + {ct.newRule}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {[ct.name, ct.type, ct.value, ct.minLevel, ct.maxLevel, t.common.status, ''].map((h, i) => (
                    <th key={i} className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{r.name}</td>
                    <td className="px-4 py-3">
                      <Badge label={typeLabel(r.type)} color="blue" />
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {r.valueType === 'PERCENTAGE' ? `${Number(r.value).toFixed(2)}%` : `RM ${Number(r.value).toFixed(2)}`}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{r.minLevel ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{r.maxLevel ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge label={r.isActive ? ct.active : ct.inactive ?? 'Inactive'} color={r.isActive ? 'green' : 'gray'} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(r)} className="p-1 text-gray-400 hover:text-blue-600 transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(r.id)} className="p-1 text-gray-400 hover:text-red-600 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Logs Tab */}
      {tab === 'logs' && (
        logsLoading ? (
          <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm bg-white border border-gray-200 rounded-xl">
            {ct.noLogs}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {[ct.logOrder, ct.logRecipient, ct.logRule, ct.logAmount, ct.logStatus, ct.logDate].map((h, i) => (
                    <th key={i} className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{log.order?.orderNo ?? log.orderId.slice(0, 8)}</td>
                    <td className="px-4 py-3">
                      <div className="text-gray-800 font-medium text-xs">{log.recipient?.name ?? '—'}</div>
                      <div className="text-gray-400 text-xs">{log.recipient?.email ?? ''}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={typeLabel(log.ruleType)} color="blue" />
                    </td>
                    <td className="px-4 py-3 font-semibold text-green-700">
                      RM {Number(log.commissionAmount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        label={log.status}
                        color={log.status === 'PAID' ? 'green' : log.status === 'PENDING' ? 'yellow' : 'gray'}
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">{editId ? ct.editRule : ct.addRule}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <p className="text-red-600 text-sm">{error}</p>}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{ct.name} *</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={ct.namePlaceholder}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{ct.type}</label>
                  <div className="relative">
                    <select
                      className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 pr-8"
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                    >
                      {COMMISSION_TYPES.map((t) => (
                        <option key={t} value={t}>{typeLabel(t)}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Value Type</label>
                  <div className="relative">
                    <select
                      className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 pr-8"
                      value={form.valueType}
                      onChange={(e) => setForm({ ...form, valueType: e.target.value })}
                    >
                      {VALUE_TYPES.map((vt) => (
                        <option key={vt} value={vt}>{valueTypeLabel(vt)}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {ct.value} {form.valueType === 'PERCENTAGE' ? '(%)' : '(RM)'} *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  placeholder={form.valueType === 'PERCENTAGE' ? '5.00' : '10.00'}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{ct.minLevel} <span className="text-gray-400">({ct.optional})</span></label>
                  <input
                    type="number" min="1"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    value={form.minLevel}
                    onChange={(e) => setForm({ ...form, minLevel: e.target.value })}
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{ct.maxLevel} <span className="text-gray-400">({ct.optional})</span></label>
                  <input
                    type="number" min="1"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    value={form.maxLevel}
                    onChange={(e) => setForm({ ...form, maxLevel: e.target.value })}
                    placeholder="5"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed -mt-1">{ct.levelHint}</p>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="accent-primary w-4 h-4"
                />
                <span className="text-sm text-gray-700">{ct.active}</span>
              </label>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-black font-medium rounded-lg py-2 text-sm transition-colors disabled:opacity-50"
                >
                  <Save size={14} />
                  {saving ? 'Saving...' : t.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

