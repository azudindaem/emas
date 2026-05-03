'use client'

import { useEffect, useState } from 'react'
import { coupons } from '@/lib/api'
import { useLocale } from '@/lib/locale'
import { Tag, Plus, Trash2, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react'

interface Coupon {
  id: string
  code: string
  type: 'PERCENTAGE' | 'FIXED'
  value: string | number
  minOrderAmount?: string | number | null
  maxDiscount?: string | number | null
  usageLimit?: number | null
  usedCount: number
  startsAt?: string | null
  expiresAt?: string | null
  isActive: boolean
  createdAt: string
}

const defaultForm = {
  code: '',
  type: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
  value: '',
  minOrderAmount: '',
  maxDiscount: '',
  usageLimit: '',
  startsAt: '',
  expiresAt: '',
  isActive: true,
}

export default function CouponsPage() {
  const { t } = useLocale()
  const [items, setItems] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    try {
      const data = await coupons.list()
      setItems(data as Coupon[])
    } catch {
      setError(t.coupons.failedLoad)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await coupons.create({
        code: form.code,
        type: form.type,
        value: Number(form.value),
        minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : undefined,
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
        startsAt: form.startsAt || undefined,
        expiresAt: form.expiresAt || undefined,
        isActive: form.isActive,
      })
      setForm(defaultForm)
      setShowForm(false)
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Gagal mencipta kupon')
      setError(e instanceof Error ? e.message : t.coupons.failedCreate)
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (item: Coupon) => {
    try {
      await coupons.update(item.id, { isActive: !item.isActive })
      await load()
    } catch { /* ignore */ }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Padam kupon ini?')) return
      if (!confirm(t.coupons.deleteConfirm)) return
    try {
      await coupons.delete(id)
      await load()
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kupon Diskaun</h1>
          <p className="text-sm text-gray-500 mt-1">Urus kupon promosi untuk pelanggan</p>
                  <p className="text-sm text-gray-500 mt-1">{t.coupons.subtitle}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-semibold rounded-lg hover:bg-primary-dark transition-colors"
        >
          <Plus size={16} />
          {t.coupons.newCoupon}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Kupon Baru</h2>
                    <h2 className="font-semibold text-gray-800">{t.coupons.newCoupon}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kod Kupon</label>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t.coupons.couponCode}</label>
              <input
                required
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="RAYA10"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm uppercase"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jenis</label>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.coupons.type}</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value as 'PERCENTAGE' | 'FIXED' }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="PERCENTAGE">{t.coupons.percentage}</option>
                <option value="FIXED">{t.coupons.fixed}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nilai {form.type === 'PERCENTAGE' ? '(%)' : '(RM)'}
              </label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.value}
                onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min. Pesanan (RM)</label>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.coupons.minOrder}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.minOrderAmount}
                onChange={e => setForm(f => ({ ...f, minOrderAmount: e.target.value }))}
                placeholder={t.coupons.noLimit}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            {form.type === 'PERCENTAGE' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Maks. Diskaun (RM)</label>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.coupons.maxDiscount}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.maxDiscount}
                  onChange={e => setForm(f => ({ ...f, maxDiscount: e.target.value }))}
                  placeholder={t.coupons.noLimit}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Had Penggunaan</label>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.coupons.usageLimit}</label>
              <input
                type="number"
                min="1"
                value={form.usageLimit}
                onChange={e => setForm(f => ({ ...f, usageLimit: e.target.value }))}
                placeholder={t.coupons.noLimit}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mula</label>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t.coupons.starts}</label>
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tamat</label>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t.coupons.end}</label>
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-semibold rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors text-sm"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {t.coupons.saveCoupon}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              {t.common.cancel}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Tag size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="font-medium">Tiada kupon</p>
            <p className="text-sm mt-1">Buat kupon diskaun pertama anda</p>
                      <p className="text-sm mt-1">{t.coupons.noCouponsHint}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Kod</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">{t.coupons.type}</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">{t.coupons.value}</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">{t.coupons.usage}</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">{t.coupons.expires}</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">{t.common.status}</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono font-bold text-primary">{item.code}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                      item.type === 'PERCENTAGE' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {item.type === 'PERCENTAGE' ? `${item.value}%` : `RM${item.value}`}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {item.type === 'PERCENTAGE' ? `${item.value}%` : `RM${Number(item.value).toFixed(2)}`}
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {item.usedCount}/{item.usageLimit ?? '∞'}
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">
                    {item.expiresAt ? new Date(item.expiresAt).toLocaleDateString('ms-MY') : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <button onClick={() => toggleActive(item)} className="flex items-center gap-1.5 text-xs">
                      {item.isActive
                        ? <><ToggleRight size={18} className="text-green-500" /><span className="text-green-600">{t.coupons.active}</span></>
                        : <><ToggleLeft size={18} className="text-gray-400" /><span className="text-gray-400">{t.coupons.inactive}</span></>}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
