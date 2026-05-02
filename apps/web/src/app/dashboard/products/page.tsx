'use client'

import { useEffect, useState } from 'react'
import { products as productsApi } from '@/lib/api'
import { Badge, Pagination } from '@/components/ui'
import { Plus, Loader2, X, ChevronDown, ChevronUp, Trash2, Edit2, Check, Package, Layers } from 'lucide-react'

interface Variation {
  id: string
  sku: string
  name: string
  price: string | number
  weight: string | number
  imageUrl?: string | null
}

interface Product {
  id: string
  name: string
  sku: string
  description?: string | null
  status: string
  variations: Variation[]
}

const STATUS_OPTIONS = ['ACTIVE', 'INACTIVE', 'ARCHIVED']
const statusColor: Record<string, 'green' | 'gray' | 'red'> = {
  ACTIVE: 'green', INACTIVE: 'gray', ARCHIVED: 'red',
}

const emptyVariationRow = () => ({ sku: '', name: '', price: '', weight: '' })
type ProductType = 'simple' | 'variations'

interface SimpleForm { name: string; sku: string; price: string; weight: string; description: string; status: string }
interface VariationsForm { name: string; sku: string; description: string; status: string; rows: { sku: string; name: string; price: string; weight: string }[] }
interface EditForm { sku: string; name: string; description: string; status: string }

export default function ProductsPage() {
  const [items, setItems] = useState<Product[]>([])
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 })
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  // Create wizard
  const [showCreate, setShowCreate] = useState(false)
  const [createStep, setCreateStep] = useState<1 | 2>(1)
  const [productType, setProductType] = useState<ProductType>('simple')
  const [simpleForm, setSimpleForm] = useState<SimpleForm>({ name: '', sku: '', price: '', weight: '', description: '', status: 'ACTIVE' })
  const [varForm2, setVarForm2] = useState<VariationsForm>({ name: '', sku: '', description: '', status: 'ACTIVE', rows: [emptyVariationRow()] })
  const [saving, setSaving] = useState(false)
  const [createError, setCreateError] = useState('')

  // Edit product
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ sku: '', name: '', description: '', status: 'ACTIVE' })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  // Variation management
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingVariation, setEditingVariation] = useState<{ productId: string; variation: Variation } | null>(null)
  const [varEditForm, setVarEditForm] = useState({ sku: '', name: '', price: '', weight: '', imageUrl: '' })
  const [savingVar, setSavingVar] = useState(false)
  const [addingVarTo, setAddingVarTo] = useState<string | null>(null)
  const [newVarForm, setNewVarForm] = useState({ sku: '', name: '', price: '', weight: '' })
  const [savingNewVar, setSavingNewVar] = useState(false)
  const [varError, setVarError] = useState('')

  const load = () => {
    setLoading(true)
    const params: Record<string, string | number> = { page, limit: 20 }
    if (search) params.search = search
    productsApi.list(params)
      .then(res => { setItems(res.items as Product[]); setMeta(res.meta as typeof meta) })
      .finally(() => setLoading(false))
  }

  useEffect(load, [page, search])

  const openCreate = () => {
    setCreateStep(1); setProductType('simple')
    setSimpleForm({ name: '', sku: '', price: '', weight: '', description: '', status: 'ACTIVE' })
    setVarForm2({ name: '', sku: '', description: '', status: 'ACTIVE', rows: [emptyVariationRow()] })
    setCreateError(''); setShowCreate(true)
  }

  const continueToStep2 = () => {
    const name = productType === 'simple' ? simpleForm.name : varForm2.name
    if (!name.trim()) { setCreateError('Nama produk wajib diisi'); return }
    setCreateError(''); setCreateStep(2)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setCreateError('')
    try {
      if (productType === 'simple') {
        if (!simpleForm.sku) { setCreateError('SKU wajib diisi'); setSaving(false); return }
        await productsApi.create({
          sku: simpleForm.sku, name: simpleForm.name,
          description: simpleForm.description || undefined, status: simpleForm.status,
          variations: [{ sku: simpleForm.sku, name: 'Default', price: Number(simpleForm.price) || 0, weight: Number(simpleForm.weight) || 0 }],
        })
      } else {
        if (!varForm2.sku) { setCreateError('SKU produk wajib diisi'); setSaving(false); return }
        const validRows = varForm2.rows.filter(r => r.sku && r.name)
        if (validRows.length === 0) { setCreateError('Tambah sekurang-kurangnya satu variasi dengan SKU dan Nama'); setSaving(false); return }
        await productsApi.create({
          sku: varForm2.sku, name: varForm2.name,
          description: varForm2.description || undefined, status: varForm2.status,
          variations: validRows.map(r => ({ sku: r.sku, name: r.name, price: Number(r.price) || 0, weight: Number(r.weight) || 0 })),
        })
      }
      setShowCreate(false); load()
    } catch (e: unknown) { setCreateError(e instanceof Error ? e.message : 'Gagal menyimpan') }
    finally { setSaving(false) }
  }

  const addVarRow = () => setVarForm2(f => ({ ...f, rows: [...f.rows, emptyVariationRow()] }))
  const removeVarRow = (i: number) => setVarForm2(f => ({ ...f, rows: f.rows.filter((_, idx) => idx !== i) }))
  const setVarRowField = (i: number, field: string, val: string) =>
    setVarForm2(f => ({ ...f, rows: f.rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r) }))

  const openEdit = (p: Product) => {
    setEditProduct(p)
    setEditForm({ sku: p.sku, name: p.name, description: p.description ?? '', status: p.status })
    setEditError('')
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editProduct) return
    setEditSaving(true); setEditError('')
    try {
      await productsApi.update(editProduct.id, { sku: editForm.sku, name: editForm.name, description: editForm.description || undefined, status: editForm.status })
      setEditProduct(null); load()
    } catch (e: unknown) { setEditError(e instanceof Error ? e.message : 'Gagal kemaskini') }
    finally { setEditSaving(false) }
  }

  const openEditVar = (productId: string, v: Variation) => {
    setEditingVariation({ productId, variation: v })
    setVarEditForm({ sku: v.sku, name: v.name, price: String(v.price), weight: String(v.weight), imageUrl: v.imageUrl ?? '' })
    setVarError('')
  }

  const saveVariation = async () => {
    if (!editingVariation) return
    setSavingVar(true); setVarError('')
    try {
      await productsApi.updateVariation(editingVariation.productId, editingVariation.variation.id, {
        sku: varEditForm.sku, name: varEditForm.name, price: Number(varEditForm.price), weight: Number(varEditForm.weight), imageUrl: varEditForm.imageUrl || undefined,
      })
      setEditingVariation(null); load()
    } catch (e: unknown) { setVarError(e instanceof Error ? e.message : 'Gagal kemaskini variasi') }
    finally { setSavingVar(false) }
  }

  const deleteVariationFn = async (productId: string, varId: string) => {
    if (!confirm('Padam variasi ini?')) return
    setVarError('')
    try { await productsApi.deleteVariation(productId, varId); load() }
    catch (e: unknown) { setVarError(e instanceof Error ? e.message : 'Gagal padam variasi') }
  }

  const openAddVar = (productId: string) => {
    setAddingVarTo(productId); setNewVarForm({ sku: '', name: '', price: '', weight: '' }); setVarError('')
  }

  const saveNewVariation = async (productId: string) => {
    if (!newVarForm.sku || !newVarForm.name) { setVarError('SKU dan Nama wajib diisi'); return }
    setSavingNewVar(true); setVarError('')
    try {
      await productsApi.addVariation(productId, { sku: newVarForm.sku, name: newVarForm.name, price: Number(newVarForm.price) || 0, weight: Number(newVarForm.weight) || 0 })
      setAddingVarTo(null); load()
    } catch (e: unknown) { setVarError(e instanceof Error ? e.message : 'Gagal tambah variasi') }
    finally { setSavingNewVar(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Padam produk ini? Semua variasi akan dipadam.')) return
    try { await productsApi.delete(id); load() } catch { /* ignore */ }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produk</h1>
          <p className="text-sm text-gray-500 mt-0.5">Jumlah: {meta.total} produk</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-[#d4a017] text-black font-semibold rounded-lg hover:bg-[#b8891a] transition-colors text-sm">
          <Plus size={15} />Produk Baru
        </button>
      </div>

      {varError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{varError}</div>}

      {/* ── Create Modal ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative z-10 bg-white border border-gray-200 rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-8">
            <button onClick={() => setShowCreate(false)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-700"><X size={20} /></button>

            {createStep === 1 ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Tambah produk baru</h2>
                  <p className="text-sm text-gray-500 mt-1">Anda boleh tambah lebih banyak produk kemudian.</p>
                </div>
                {createError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg">{createError}</div>}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nama Produk</label>
                  <input autoFocus
                    value={productType === 'simple' ? simpleForm.name : varForm2.name}
                    onChange={e => {
                      if (productType === 'simple') setSimpleForm(f => ({ ...f, name: e.target.value }))
                      else setVarForm2(f => ({ ...f, name: e.target.value }))
                    }}
                    onKeyDown={e => e.key === 'Enter' && continueToStep2()}
                    placeholder="cth. Baju T-Shirt Basic"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:outline-none focus:ring-2 focus:ring-[#d4a017]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Jenis Produk</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setProductType('simple')}
                      className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${productType === 'simple' ? 'border-[#d4a017] bg-[#d4a017]/10' : 'border-gray-200 hover:border-gray-300'}`}>
                      <Package size={30} className={productType === 'simple' ? 'text-[#d4a017]' : 'text-gray-400'} />
                      <div className="text-center">
                        <div className={`font-semibold text-sm ${productType === 'simple' ? 'text-gray-900' : 'text-gray-500'}`}>Produk Simple</div>
                        <div className="text-xs text-gray-500 mt-0.5">Tiada variasi</div>
                      </div>
                    </button>
                    <button type="button" onClick={() => setProductType('variations')}
                      className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${productType === 'variations' ? 'border-[#d4a017] bg-[#d4a017]/10' : 'border-gray-200 hover:border-gray-300'}`}>
                      <Layers size={30} className={productType === 'variations' ? 'text-[#d4a017]' : 'text-gray-400'} />
                      <div className="text-center">
                        <div className={`font-semibold text-sm ${productType === 'variations' ? 'text-gray-900' : 'text-gray-500'}`}>Dengan Variasi</div>
                        <div className="text-xs text-gray-500 mt-0.5">Saiz, warna, dll.</div>
                      </div>
                    </button>
                  </div>
                </div>
                <button type="button" onClick={continueToStep2}
                  className="w-full py-3.5 bg-[#d4a017] text-black font-bold rounded-xl text-sm hover:bg-[#b8891a] transition-colors flex items-center justify-center gap-2">
                  Teruskan →
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-5">
                <div className="flex items-center gap-3 mb-1">
                  <button type="button" onClick={() => { setCreateStep(1); setCreateError('') }} className="text-gray-500 hover:text-gray-800 text-sm">← Kembali</button>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{productType === 'simple' ? 'Produk Simple' : 'Produk dengan Variasi'}</h2>
                    <p className="text-xs text-gray-400">{productType === 'simple' ? simpleForm.name : varForm2.name}</p>
                  </div>
                </div>
                {createError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg">{createError}</div>}

                {productType === 'simple' ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">SKU <span className="text-red-400">*</span></label>
                        <input required value={simpleForm.sku} onChange={e => setSimpleForm(f => ({ ...f, sku: e.target.value }))}
                          placeholder="PRD-001" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a017]" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Harga (RM)</label>
                        <input type="number" step="0.01" min="0" value={simpleForm.price} onChange={e => setSimpleForm(f => ({ ...f, price: e.target.value }))}
                          placeholder="0.00" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a017]" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Berat (kg)</label>
                        <input type="number" step="0.001" min="0" value={simpleForm.weight} onChange={e => setSimpleForm(f => ({ ...f, weight: e.target.value }))}
                          placeholder="0.000" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a017]" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Status</label>
                        <select value={simpleForm.status} onChange={e => setSimpleForm(f => ({ ...f, status: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a017]">
                          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">Penerangan</label>
                      <textarea value={simpleForm.description} onChange={e => setSimpleForm(f => ({ ...f, description: e.target.value }))} rows={2}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a017]" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">SKU Produk <span className="text-red-400">*</span></label>
                        <input required value={varForm2.sku} onChange={e => setVarForm2(f => ({ ...f, sku: e.target.value }))}
                          placeholder="PRD-001" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a017]" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Status</label>
                        <select value={varForm2.status} onChange={e => setVarForm2(f => ({ ...f, status: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a017]">
                          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-gray-700">Variasi</label>
                        <button type="button" onClick={addVarRow} className="text-xs text-[#d4a017] hover:text-[#b8891a] flex items-center gap-1 font-medium"><Plus size={12} />Tambah Baris</button>
                      </div>
                      <div className="grid grid-cols-9 gap-1.5 text-xs text-gray-500 px-1">
                        <div className="col-span-2">SKU</div><div className="col-span-3">Nama Variasi</div>
                        <div className="col-span-2">Harga (RM)</div><div className="col-span-2">Berat (kg)</div>
                      </div>
                      {varForm2.rows.map((r, i) => (
                        <div key={i} className="grid grid-cols-9 gap-1.5 items-center">
                          <input value={r.sku} onChange={e => setVarRowField(i, 'sku', e.target.value)} placeholder="SKU-S"
                            className="col-span-2 border border-gray-300 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#d4a017]" />
                          <input value={r.name} onChange={e => setVarRowField(i, 'name', e.target.value)} placeholder="Saiz S"
                            className="col-span-3 border border-gray-300 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#d4a017]" />
                          <input type="number" step="0.01" value={r.price} onChange={e => setVarRowField(i, 'price', e.target.value)} placeholder="0.00"
                            className="col-span-2 border border-gray-300 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#d4a017]" />
                          <div className="col-span-2 flex items-center gap-1">
                            <input type="number" step="0.001" value={r.weight} onChange={e => setVarRowField(i, 'weight', e.target.value)} placeholder="0.000"
                              className="flex-1 border border-gray-300 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#d4a017]" />
                            {varForm2.rows.length > 1 && (
                              <button type="button" onClick={() => removeVarRow(i)} className="p-1.5 text-gray-500 hover:text-red-400"><Trash2 size={12} /></button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button type="submit" disabled={saving}
                  className="w-full py-3.5 bg-[#d4a017] text-black font-bold rounded-xl text-sm hover:bg-[#b8891a] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving && <Loader2 size={14} className="animate-spin" />}Simpan Produk
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditProduct(null)} />
          <div className="relative z-10 bg-white border border-gray-200 rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-8">
            <button onClick={() => setEditProduct(null)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-700"><X size={20} /></button>
            <h2 className="font-bold text-gray-900 text-xl mb-6">Edit Produk</h2>
            {editError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg mb-4">{editError}</div>}
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">SKU Produk</label>
                  <input required value={editForm.sku} onChange={e => setEditForm(f => ({ ...f, sku: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a017]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Nama Produk</label>
                  <input required value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a017]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Status</label>
                  <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a017]">
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Penerangan</label>
                  <input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a017]" />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={editSaving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#d4a017] text-black font-semibold rounded-lg text-sm disabled:opacity-50 hover:bg-[#b8891a]">
                  {editSaving && <Loader2 size={13} className="animate-spin" />}Kemaskini
                </button>
                <button type="button" onClick={() => setEditProduct(null)} className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="flex gap-3">
        <input type="text" placeholder="Cari nama / SKU..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a017] w-64" />
      </div>

      {/* Table */}
      {loading ? <div className="h-64 bg-gray-100 rounded-xl animate-pulse" /> : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-8 px-4 py-3"></th>
                {['Nama Produk', 'SKU', 'Variasi', 'Status', 'Tindakan'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Tiada produk ditemui</td></tr>
              )}
              {items.map(p => (
                <>
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <button onClick={() => setExpandedId(expandedId === p.id ? null : p.id)} className="text-gray-400 hover:text-gray-700">
                        {expandedId === p.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                    <td className="px-4 py-3 font-mono text-gray-500 text-xs">{p.sku}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{p.variations.length} variasi</td>
                    <td className="px-4 py-3"><Badge label={p.status} color={statusColor[p.status] ?? 'gray'} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => openEdit(p)} className="p-1.5 text-gray-400 hover:text-[#d4a017] hover:bg-yellow-50 rounded-lg" title="Edit"><Edit2 size={14} /></button>
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg" title="Padam"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === p.id && (
                    <tr key={`${p.id}-exp`} className="bg-gray-50 border-b border-gray-100">
                      <td colSpan={6} className="px-6 py-4">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-gray-500 border-b border-gray-200">
                              <th className="text-left py-1.5 pr-4 font-semibold">SKU Variasi</th>
                              <th className="text-left py-1.5 pr-4 font-semibold">Nama</th>
                              <th className="text-left py-1.5 pr-4 font-semibold">Harga</th>
                              <th className="text-left py-1.5 pr-4 font-semibold">Berat</th>
                              <th className="py-1.5"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {p.variations.length === 0 && (
                              <tr><td colSpan={5} className="py-3 text-gray-400 italic">Tiada variasi lagi</td></tr>
                            )}
                            {p.variations.map(v => (
                              <tr key={v.id} className="border-b border-gray-100 last:border-0">
                                {editingVariation?.variation.id === v.id ? (
                                  <>
                                    <td className="pr-2 py-1.5"><input value={varEditForm.sku} onChange={e => setVarEditForm(f => ({ ...f, sku: e.target.value }))} className="border border-gray-300 rounded px-2 py-1 w-full" /></td>
                                    <td className="pr-2 py-1.5"><input value={varEditForm.name} onChange={e => setVarEditForm(f => ({ ...f, name: e.target.value }))} className="border border-gray-300 rounded px-2 py-1 w-full" /></td>
                                    <td className="pr-2 py-1.5"><input type="number" step="0.01" value={varEditForm.price} onChange={e => setVarEditForm(f => ({ ...f, price: e.target.value }))} className="border border-gray-300 rounded px-2 py-1 w-24" /></td>
                                    <td className="pr-2 py-1.5"><input type="number" step="0.001" value={varEditForm.weight} onChange={e => setVarEditForm(f => ({ ...f, weight: e.target.value }))} className="border border-gray-300 rounded px-2 py-1 w-20" /></td>
                                    <td className="py-1.5">
                                      <div className="flex gap-1">
                                        <button onClick={saveVariation} disabled={savingVar} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Simpan">{savingVar ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}</button>
                                        <button onClick={() => { setEditingVariation(null); setVarError('') }} className="p-1 text-gray-400 hover:bg-gray-100 rounded" title="Batal"><X size={13} /></button>
                                      </div>
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="pr-4 py-1.5 font-mono text-gray-700">{v.sku}</td>
                                    <td className="pr-4 py-1.5 font-medium text-gray-800">{v.name}</td>
                                    <td className="pr-4 py-1.5 text-gray-700">RM {Number(v.price).toFixed(2)}</td>
                                    <td className="pr-4 py-1.5 text-gray-600">{Number(v.weight).toFixed(3)} kg</td>
                                    <td className="py-1.5">
                                      <div className="flex gap-1">
                                        <button onClick={() => { openEditVar(p.id, v); setAddingVarTo(null) }} className="p-1 text-gray-400 hover:text-[#d4a017] rounded" title="Edit variasi"><Edit2 size={13} /></button>
                                        <button onClick={() => deleteVariationFn(p.id, v.id)} className="p-1 text-gray-400 hover:text-red-500 rounded" title="Padam variasi"><Trash2 size={13} /></button>
                                      </div>
                                    </td>
                                  </>
                                )}
                              </tr>
                            ))}
                            {addingVarTo === p.id ? (
                              <tr className="border-t-2 border-[#d4a017]/30 bg-yellow-50/50">
                                <td className="pr-2 pt-2 pb-1"><input autoFocus placeholder="SKU*" value={newVarForm.sku} onChange={e => setNewVarForm(f => ({ ...f, sku: e.target.value }))} className="border border-gray-300 rounded px-2 py-1 w-full" /></td>
                                <td className="pr-2 pt-2 pb-1"><input placeholder="Nama*" value={newVarForm.name} onChange={e => setNewVarForm(f => ({ ...f, name: e.target.value }))} className="border border-gray-300 rounded px-2 py-1 w-full" /></td>
                                <td className="pr-2 pt-2 pb-1"><input type="number" step="0.01" placeholder="Harga" value={newVarForm.price} onChange={e => setNewVarForm(f => ({ ...f, price: e.target.value }))} className="border border-gray-300 rounded px-2 py-1 w-24" /></td>
                                <td className="pr-2 pt-2 pb-1"><input type="number" step="0.001" placeholder="Berat" value={newVarForm.weight} onChange={e => setNewVarForm(f => ({ ...f, weight: e.target.value }))} className="border border-gray-300 rounded px-2 py-1 w-20" /></td>
                                <td className="pt-2 pb-1">
                                  <div className="flex gap-1">
                                    <button onClick={() => saveNewVariation(p.id)} disabled={savingNewVar} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Simpan">{savingNewVar ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}</button>
                                    <button onClick={() => { setAddingVarTo(null); setVarError('') }} className="p-1 text-gray-400 hover:bg-gray-100 rounded" title="Batal"><X size={13} /></button>
                                  </div>
                                </td>
                              </tr>
                            ) : (
                              <tr>
                                <td colSpan={5} className="pt-2">
                                  <button onClick={() => { openAddVar(p.id); setEditingVariation(null) }}
                                    className="flex items-center gap-1.5 text-xs text-[#d4a017] hover:text-[#b8891a] font-semibold py-1">
                                    <Plus size={13} />Tambah Variasi
                                  </button>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={meta.page} totalPages={meta.totalPages} onChange={setPage} />
    </div>
  )
}
