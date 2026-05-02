'use client'

import { useEffect, useState } from 'react'
import { brands } from '@/lib/api'
import { Palette, Plus, Trash2, ToggleLeft, ToggleRight, Loader2, Save } from 'lucide-react'

interface Brand {
  id: string
  name: string
  logoUrl?: string | null
  isActive: boolean
  createdAt: string
}

interface Branding {
  companyName: string
  primaryColor: string
  logoUrl?: string | null
  faviconUrl?: string | null
  emailHeader?: string | null
  customCss?: string | null
}

export default function BrandsPage() {
  const [items, setItems] = useState<Brand[]>([])
  const [branding, setBranding] = useState<Branding>({ companyName: '', primaryColor: '#d4a017' })
  const [loading, setLoading] = useState(true)
  const [showBrandForm, setShowBrandForm] = useState(false)
  const [newBrandName, setNewBrandName] = useState('')
  const [newBrandLogo, setNewBrandLogo] = useState('')
  const [saving, setSaving] = useState(false)
  const [savingBranding, setSavingBranding] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = async () => {
    try {
      const [brandList, brandingData] = await Promise.all([
        brands.list(),
        brands.getBranding(),
      ])
      setItems(brandList as Brand[])
      setBranding(brandingData as Branding)
    } catch {
      setError('Gagal memuatkan data brand')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await brands.create({ name: newBrandName, logoUrl: newBrandLogo || undefined })
      setNewBrandName('')
      setNewBrandLogo('')
      setShowBrandForm(false)
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Gagal mencipta brand')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (item: Brand) => {
    try {
      await brands.update(item.id, { isActive: !item.isActive })
      await load()
    } catch { /* ignore */ }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Padam brand ini?')) return
    try {
      await brands.delete(id)
      await load()
    } catch { /* ignore */ }
  }

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingBranding(true)
    setError('')
    setSuccess('')
    try {
      await brands.saveBranding(branding)
      setSuccess('Tetapan branding berjaya disimpan')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan branding')
    } finally {
      setSavingBranding(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Brand Management</h1>
        <p className="text-sm text-gray-500 mt-1">Urus brand dan tetapan white-label</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">{success}</div>
      )}

      {/* White-label Branding */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="font-semibold text-gray-800 mb-5 flex items-center gap-2">
          <Palette size={18} className="text-[#d4a017]" />
          Tetapan White-Label
        </h2>
        <form onSubmit={handleSaveBranding} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Syarikat</label>
              <input
                value={branding.companyName}
                onChange={e => setBranding(b => ({ ...b, companyName: e.target.value }))}
                placeholder="Nama syarikat anda"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Warna Utama</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={branding.primaryColor}
                  onChange={e => setBranding(b => ({ ...b, primaryColor: e.target.value }))}
                  className="h-9 w-16 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  value={branding.primaryColor}
                  onChange={e => setBranding(b => ({ ...b, primaryColor: e.target.value }))}
                  placeholder="#d4a017"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL Logo</label>
              <input
                value={branding.logoUrl ?? ''}
                onChange={e => setBranding(b => ({ ...b, logoUrl: e.target.value }))}
                placeholder="https://..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL Favicon</label>
              <input
                value={branding.faviconUrl ?? ''}
                onChange={e => setBranding(b => ({ ...b, faviconUrl: e.target.value }))}
                placeholder="https://..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Header E-mel</label>
              <textarea
                value={branding.emailHeader ?? ''}
                onChange={e => setBranding(b => ({ ...b, emailHeader: e.target.value }))}
                placeholder="HTML header untuk e-mel..."
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">CSS Tersuai</label>
              <textarea
                value={branding.customCss ?? ''}
                onChange={e => setBranding(b => ({ ...b, customCss: e.target.value }))}
                placeholder=":root { --brand-color: #d4a017; }"
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={savingBranding}
            className="flex items-center gap-2 px-4 py-2 bg-[#d4a017] text-black font-semibold rounded-lg hover:bg-[#b8891a] disabled:opacity-50 transition-colors text-sm"
          >
            {savingBranding ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Simpan Branding
          </button>
        </form>
      </div>

      {/* Brand List */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Senarai Brand</h2>
          <button
            onClick={() => setShowBrandForm(!showBrandForm)}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#d4a017] text-black font-semibold rounded-lg hover:bg-[#b8891a] transition-colors text-sm"
          >
            <Plus size={14} />
            Brand Baru
          </button>
        </div>

        {showBrandForm && (
          <form onSubmit={handleCreateBrand} className="px-5 py-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Brand</label>
                <input
                  required
                  value={newBrandName}
                  onChange={e => setNewBrandName(e.target.value)}
                  placeholder="Nama brand"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">URL Logo (pilihan)</label>
                <input
                  value={newBrandLogo}
                  onChange={e => setNewBrandLogo(e.target.value)}
                  placeholder="https://..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-[#d4a017] text-black font-semibold rounded-lg text-sm disabled:opacity-50 hover:bg-[#b8891a]"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : 'Simpan'}
              </button>
              <button
                type="button"
                onClick={() => setShowBrandForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-100"
              >
                Batal
              </button>
            </div>
          </form>
        )}

        {items.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Palette size={36} className="mx-auto mb-3 text-gray-300" />
            <p className="font-medium">Tiada brand</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Nama Brand</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Logo</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Dicipta</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{item.name}</td>
                  <td className="px-5 py-3">
                    {item.logoUrl ? (
                      <img src={item.logoUrl} alt={item.name} className="h-7 w-auto object-contain" />
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <button onClick={() => toggleActive(item)} className="flex items-center gap-1.5 text-xs">
                      {item.isActive
                        ? <><ToggleRight size={18} className="text-green-500" /><span className="text-green-600">Aktif</span></>
                        : <><ToggleLeft size={18} className="text-gray-400" /><span className="text-gray-400">Tidak Aktif</span></>}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">
                    {new Date(item.createdAt).toLocaleDateString('ms-MY')}
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
