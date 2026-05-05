'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { products as productsApi, brands as brandsApi } from '@/lib/api'
import { useLocale } from '@/lib/locale'

// ─── Drag-and-drop image upload component ───────────────────────────────────────
function ImageDropZone({
  value, onChange, labels,
}: {
  value: string
  onChange: (url: string) => void
  labels: {
    changeImage: string
    uploading: string
    imageHint: string
    imageTypes: string
    imageUrl: string
    uploadFailed: string
  }
}) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const doUpload = async (file: File) => {
    setUploading(true); setError('')
    try {
      const result = await productsApi.uploadImage(file)
      onChange(result.url)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : labels.uploadFailed)
    } finally { setUploading(false) }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) doUpload(file)
  }
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) doUpload(file)
    e.target.value = ''
  }

  return (
    <div className="space-y-2">
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={onFileChange} />
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`relative border-2 border-dashed rounded-xl transition-all cursor-pointer overflow-hidden
          ${dragging ? 'border-primary bg-yellow-50/60 scale-[1.01]' : 'border-gray-300 hover:border-primary/60 hover:bg-gray-50'}
          ${value ? 'h-44' : 'h-36'}`}
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="product" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <span className="text-white text-xs font-semibold bg-black/60 px-3 py-1.5 rounded-full">{labels.changeImage}</span>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
            {uploading
              ? <Loader2 size={28} className="text-primary animate-spin" />
              : <ImageIcon size={28} className="text-gray-300" />}
            <p className="text-sm font-medium text-gray-400">
              {uploading ? labels.uploading : labels.imageHint}
            </p>
            <p className="text-xs text-gray-300">{labels.imageTypes}</p>
          </div>
        )}
        {uploading && value && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60">
            <Loader2 size={24} className="text-primary animate-spin" />
          </div>
        )}
      </div>
      {value && (
        <div className="flex items-center gap-2">
          <input value={value} onChange={e => onChange(e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary" placeholder={labels.imageUrl} />
          <button type="button" onClick={() => onChange('')} className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"><X size={14} /></button>
        </div>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
import { Pagination } from '@/components/ui'
import {
  Plus, Loader2, X, ChevronDown, ChevronUp, Trash2, Edit2, Check, Copy,
  Package, Layers, Download, Upload, AlertTriangle, BarChart3,
  Info, ImageIcon, Truck, Eye, Star, Tag,
} from 'lucide-react'

// ─── Category dropdown with custom input ────────────────────────────────────────
const DEFAULT_CATEGORIES = [
  'Beauty & Personal Care',
  'Health & Wellness',
  'Fashion & Apparel',
  'Home & Living',
  'Electronics & Gadgets',
  'Food & Beverages',
  'Mother & Baby',
  'Sports & Outdoors',
  'Books & Stationery',
  'Automotive & Tools',
  'Pet Supplies',
  'Toys & Games',
  'Others',
]
const CUSTOM_KEY = '__custom__'
function CategorySelect({ value, onChange, categories, onAddCategory, labels }: {
  value: string; onChange: (v: string) => void
  categories: string[]; onAddCategory: (cat: string) => void
  labels: { selectPlaceholder: string; addCustom: string; typePlaceholder: string }
}) {
  const [customMode, setCustomMode] = useState(false)
  const [customVal, setCustomVal] = useState('')

  const confirm = () => {
    const trimmed = customVal.trim()
    if (trimmed) { onAddCategory(trimmed); onChange(trimmed) }
    setCustomMode(false); setCustomVal('')
  }

  if (customMode) {
    return (
      <input
        autoFocus
        value={customVal}
        onChange={e => setCustomVal(e.target.value)}
        onBlur={confirm}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confirm() } if (e.key === 'Escape') { setCustomMode(false); setCustomVal('') } }}
        placeholder={labels.typePlaceholder}
        className={'w-full border border-primary rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary'}
      />
    )
  }

  return (
    <select
      value={value}
      onChange={e => {
        if (e.target.value === CUSTOM_KEY) { setCustomMode(true); setCustomVal('') }
        else onChange(e.target.value)
      }}
      className={'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white'}
    >
      <option value="">{labels.selectPlaceholder}</option>
      {categories.map(c => <option key={c} value={c}>{c}</option>)}
      {value && !categories.includes(value) && <option value={value}>{value}</option>}
      <option value={CUSTOM_KEY}>{labels.addCustom}</option>
    </select>
  )
}

// ─── Types ──────────────────────────────────────────────────────────────────────
interface Variation {
  id: string; sku: string; name: string; price: string | number; weight: string | number; imageUrl?: string | null
  stocks?: { quantity: number; reserved: number }[]
}
interface Product {
  id: string; name: string; sku: string; description?: string | null; imageUrl?: string | null
  status: string; categoryId?: string | null; brandId?: string | null
  tags?: string | null; minOrderQty?: number | null; isFeatured?: boolean
  variations: Variation[]
}
interface Summary { totalProducts: number; totalVariations: number; totalStock: number; lowStock: number }
interface Brand { id: string; name: string; logoUrl?: string | null }

const STATUS_OPTIONS = ['ACTIVE', 'INACTIVE', 'ARCHIVED']
const emptyVariationRow = () => ({ sku: '', name: '', price: '', weight: '' })
type ProductType = 'simple' | 'variations'
type EditTab = 'basic' | 'detail' | 'shipping' | 'visibility'

const INPUT = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary'
const LABEL = 'block text-xs font-medium text-gray-700 mb-1.5'

// ─── Main Page ──────────────────────────────────────────────────────────────────
export default function ProductsPage() {
  const { t } = useLocale()
  const getStatusLabel = (status: string) => t.products.status[status as 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'] ?? status
  const catLabels = { selectPlaceholder: t.products.categorySelectPlaceholder, addCustom: t.products.categoryAddCustom, typePlaceholder: t.products.categoryTypePlaceholder }
  const [items, setItems] = useState<Product[]>([])
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 })
  const [summary, setSummary] = useState<Summary>({ totalProducts: 0, totalVariations: 0, totalStock: 0, lowStock: 0 })
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES)
  const [brands, setBrands] = useState<Brand[]>([])
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [sortBy, setSortBy] = useState('created_desc')
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)
  const [globalError, setGlobalError] = useState('')

  // Create wizard
  const [showCreate, setShowCreate] = useState(false)
  const [createStep, setCreateStep] = useState<1 | 2>(1)
  const [productType, setProductType] = useState<ProductType>('simple')
  const [simpleForm, setSimpleForm] = useState({ name: '', sku: '', price: '', weight: '', description: '', status: 'ACTIVE', categoryId: '' })
  const [varForm2, setVarForm2] = useState({ name: '', sku: '', description: '', status: 'ACTIVE', categoryId: '', rows: [emptyVariationRow()] })
  const [saving, setSaving] = useState(false)
  const [createError, setCreateError] = useState('')

  // Edit — tabbed
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [editTab, setEditTab] = useState<EditTab>('basic')
  const [editForm, setEditForm] = useState({
    sku: '', name: '', description: '', status: 'ACTIVE', categoryId: '', brandId: '',
    tags: '', minOrderQty: '', isFeatured: false, imageUrl: '',
  })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  // Variation management (used inside edit modal tab + inline table)
  const [editingVariation, setEditingVariation] = useState<{ productId: string; variation: Variation } | null>(null)
  const [varEditForm, setVarEditForm] = useState({ sku: '', name: '', price: '', weight: '', imageUrl: '' })
  const [savingVar, setSavingVar] = useState(false)
  const [addingVarTo, setAddingVarTo] = useState<string | null>(null)
  const [newVarForm, setNewVarForm] = useState({ sku: '', name: '', price: '', weight: '' })
  const [savingNewVar, setSavingNewVar] = useState(false)
  const [varError, setVarError] = useState('')

  // Edit modal inline variation states
  const [editModalVariations, setEditModalVariations] = useState<Variation[]>([])
  const [editingModalVar, setEditingModalVar] = useState<string | null>(null)
  const [editModalVarForm, setEditModalVarForm] = useState({ sku: '', name: '', price: '', weight: '', imageUrl: '' })
  const [addingModalVar, setAddingModalVar] = useState(false)
  const [newModalVarForm, setNewModalVarForm] = useState({ sku: '', name: '', price: '', weight: '' })
  const [savingModalVar, setSavingModalVar] = useState(false)

  // Import/Export
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleAddCategory = (cat: string) => {
    setCategories(prev => prev.includes(cat) ? prev : [...prev, cat])
  }

  // ─── Load ─────────────────────────────────────────────────────
  const loadSummary = useCallback(() => {
    productsApi.summary().then(setSummary).catch(() => null)
    productsApi.categories().then(apiCats => {
      setCategories(prev => {
        const merged = [...prev]
        for (const c of apiCats) { if (!merged.includes(c)) merged.push(c) }
        return merged
      })
    }).catch(() => null)
    brandsApi.list().then(d => setBrands(d as Brand[])).catch(() => null)
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    const params: Record<string, string | number> = { page, limit: 20, sortBy }
    if (search) params.search = search
    if (filterStatus) params.status = filterStatus
    if (filterCategory) params.categoryId = filterCategory
    productsApi.list(params)
      .then(res => { setItems(res.items as Product[]); setMeta(res.meta) })
      .finally(() => setLoading(false))
  }, [page, search, filterStatus, filterCategory, sortBy])

  useEffect(() => { loadSummary() }, [loadSummary])
  useEffect(() => { load() }, [load])

  // ─── Create ───────────────────────────────────────────────────
  const openCreate = () => {
    setCreateStep(1); setProductType('simple')
    setSimpleForm({ name: '', sku: '', price: '', weight: '', description: '', status: 'ACTIVE', categoryId: '' })
    setVarForm2({ name: '', sku: '', description: '', status: 'ACTIVE', categoryId: '', rows: [emptyVariationRow()] })
    setCreateError(''); setShowCreate(true)
  }

  const continueToStep2 = () => {
    const name = productType === 'simple' ? simpleForm.name : varForm2.name
      if (!name.trim()) { setCreateError(t.products.fields.name + ' ' + t.common.required); return }
    setCreateError(''); setCreateStep(2)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setCreateError('')
    try {
      if (productType === 'simple') {
        if (!simpleForm.sku) { setCreateError(t.products.skuRequired); setSaving(false); return }
        await productsApi.create({
          sku: simpleForm.sku, name: simpleForm.name,
          description: simpleForm.description || undefined,
          status: simpleForm.status, categoryId: simpleForm.categoryId || undefined,
          variations: [{ sku: simpleForm.sku, name: t.products.type.simple, price: Number(simpleForm.price) || 0, weight: Number(simpleForm.weight) || 0 }],
        })
      } else {
        if (!varForm2.sku) { setCreateError(t.products.productSkuRequired); setSaving(false); return }
        const validRows = varForm2.rows.filter(r => r.sku && r.name)
          if (validRows.length === 0) { setCreateError(t.products.variation.add); setSaving(false); return }
        await productsApi.create({
          sku: varForm2.sku, name: varForm2.name,
          description: varForm2.description || undefined,
          status: varForm2.status, categoryId: varForm2.categoryId || undefined,
          variations: validRows.map(r => ({ sku: r.sku, name: r.name, price: Number(r.price) || 0, weight: Number(r.weight) || 0 })),
        })
      }
      setShowCreate(false); load(); loadSummary()
      } catch (e: unknown) { setCreateError(e instanceof Error ? e.message : t.common.error) }
    finally { setSaving(false) }
  }

  const addVarRow = () => setVarForm2(f => ({ ...f, rows: [...f.rows, emptyVariationRow()] }))
  const removeVarRow = (i: number) => setVarForm2(f => ({ ...f, rows: f.rows.filter((_, idx) => idx !== i) }))
  const setVarRowField = (i: number, field: string, val: string) =>
    setVarForm2(f => ({ ...f, rows: f.rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r) }))

  // ─── Edit ─────────────────────────────────────────────────────
  const openEdit = (p: Product) => {
    setEditProduct(p)
    setEditTab('basic')
    setEditForm({
      sku: p.sku, name: p.name, description: p.description ?? '', status: p.status,
      categoryId: p.categoryId ?? '', brandId: p.brandId ?? '',
      tags: p.tags ?? '', minOrderQty: p.minOrderQty ? String(p.minOrderQty) : '',
      isFeatured: p.isFeatured ?? false, imageUrl: p.imageUrl ?? '',
    })
    setEditModalVariations([...p.variations])
    setEditingModalVar(null); setAddingModalVar(false)
    setEditError('')
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editProduct) return
    setEditSaving(true); setEditError('')
    try {
      await productsApi.update(editProduct.id, {
        sku: editForm.sku, name: editForm.name,
        description: editForm.description || undefined,
        status: editForm.status,
        categoryId: editForm.categoryId || undefined,
        brandId: editForm.brandId || undefined,
        tags: editForm.tags || undefined,
        minOrderQty: editForm.minOrderQty ? Number(editForm.minOrderQty) : undefined,
        isFeatured: editForm.isFeatured,
        imageUrl: editForm.imageUrl || undefined,
      })
      setEditProduct(null); load(); loadSummary()
      } catch (e: unknown) { setEditError(e instanceof Error ? e.message : t.common.error) }
    finally { setEditSaving(false) }
  }

  // ─── Edit Modal Variations ────────────────────────────────────
  const startEditModalVar = (v: Variation) => {
    setEditingModalVar(v.id)
    setEditModalVarForm({ sku: v.sku, name: v.name, price: String(v.price), weight: String(v.weight), imageUrl: v.imageUrl ?? '' })
  }

  const saveEditModalVar = async (v: Variation) => {
    if (!editProduct) return
    setSavingModalVar(true)
    try {
      const updated = await productsApi.updateVariation(editProduct.id, v.id, {
        sku: editModalVarForm.sku, name: editModalVarForm.name,
        price: Number(editModalVarForm.price), weight: Number(editModalVarForm.weight),
        imageUrl: editModalVarForm.imageUrl || undefined,
      })
      setEditModalVariations(prev => prev.map(x => x.id === v.id ? { ...x, ...updated as unknown as Variation } : x))
      setEditingModalVar(null)
      } catch (e: unknown) { setVarError(e instanceof Error ? e.message : t.common.error) }
    finally { setSavingModalVar(false) }
  }

  const deleteModalVar = async (varId: string) => {
    if (!editProduct || !confirm(t.products.variation.deleteConfirm)) return
    try {
      await productsApi.deleteVariation(editProduct.id, varId)
      setEditModalVariations(prev => prev.filter(x => x.id !== varId))
      loadSummary()
    } catch { /* ignore */ }
  }

  const saveNewModalVar = async () => {
    if (!editProduct || !newModalVarForm.sku || !newModalVarForm.name) {
      setVarError(t.products.skuAndNameRequired); return
    }
    setSavingModalVar(true); setVarError('')
    try {
      const created = await productsApi.addVariation(editProduct.id, {
        sku: newModalVarForm.sku, name: newModalVarForm.name,
        price: Number(newModalVarForm.price) || 0, weight: Number(newModalVarForm.weight) || 0,
      })
      setEditModalVariations(prev => [...prev, created as unknown as Variation])
      setAddingModalVar(false); setNewModalVarForm({ sku: '', name: '', price: '', weight: '' })
      loadSummary()
    } catch (e: unknown) { setVarError(e instanceof Error ? e.message : t.products.failedAddVariation) }
    finally { setSavingModalVar(false) }
  }

  // ─── Inline Table Variations ──────────────────────────────────
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
        sku: varEditForm.sku, name: varEditForm.name,
        price: Number(varEditForm.price), weight: Number(varEditForm.weight),
        imageUrl: varEditForm.imageUrl || undefined,
      })
      setEditingVariation(null); load()
    } catch (e: unknown) { setVarError(e instanceof Error ? e.message : t.common.error) }
    finally { setSavingVar(false) }
  }
  const deleteVariationFn = async (productId: string, varId: string) => {
    if (!confirm(t.products.variation.deleteConfirm)) return
    try { await productsApi.deleteVariation(productId, varId); load(); loadSummary() }
    catch { /* ignore */ }
  }
  const openAddVar = (productId: string) => {
    setAddingVarTo(productId); setNewVarForm({ sku: '', name: '', price: '', weight: '' }); setVarError('')
  }
  const saveNewVariation = async (productId: string) => {
    if (!newVarForm.sku || !newVarForm.name) { setVarError(t.products.skuAndNameRequired); return }
    setSavingNewVar(true); setVarError('')
    try {
      await productsApi.addVariation(productId, { sku: newVarForm.sku, name: newVarForm.name, price: Number(newVarForm.price) || 0, weight: Number(newVarForm.weight) || 0 })
      setAddingVarTo(null); load(); loadSummary()
    } catch (e: unknown) { setVarError(e instanceof Error ? e.message : t.products.failedAddVariation) }
    finally { setSavingNewVar(false) }
  }

  // ─── Delete ───────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm(t.products.deleteConfirm)) return
    try { await productsApi.delete(id); load(); loadSummary() } catch { /* ignore */ }
  }

  const duplicateProduct = async (p: Product) => {
    setDuplicatingId(p.id)
    setGlobalError('')
    try {
      const stamp = Date.now().toString().slice(-4)
      const copiedSku = `${p.sku}-COPY-${stamp}`
      const copiedName = `${p.name} (${t.common.copy})`
      const copiedVariations = p.variations.length
        ? p.variations.map((v, idx) => ({
            sku: `${v.sku}-C${idx + 1}${stamp}`,
            name: v.name,
            price: Number(v.price) || 0,
            weight: Number(v.weight) || 0,
          }))
        : [{ sku: copiedSku, name: t.products.type.simple, price: 0, weight: 0 }]

      await productsApi.create({
        sku: copiedSku,
        name: copiedName,
        description: p.description || undefined,
        status: p.status,
        categoryId: p.categoryId || undefined,
        brandId: p.brandId || undefined,
        tags: p.tags || undefined,
        minOrderQty: p.minOrderQty || undefined,
        isFeatured: !!p.isFeatured,
        imageUrl: p.imageUrl || undefined,
        variations: copiedVariations,
      })
      load(); loadSummary()
    } catch (e: unknown) {
      setGlobalError(e instanceof Error ? e.message : t.common.error)
    } finally {
      setDuplicatingId(null)
    }
  }

  // ─── Export / Import ──────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true)
    try {
      const csv = await productsApi.exportCsv()
      const blob = new Blob([csv as unknown as string], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = 'products.csv'; a.click()
      URL.revokeObjectURL(url)
    } catch { setGlobalError(t.common.error) }
    finally { setExporting(false) }
  }
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setImporting(true); setImportResult(null); setGlobalError('')
    try {
      const text = await file.text()
      const result = await productsApi.importCsv(text)
      setImportResult(result); load(); loadSummary()
    } catch (e: unknown) { setGlobalError(e instanceof Error ? e.message : t.common.error) }
    finally { setImporting(false); if (fileRef.current) fileRef.current.value = '' }
  }

  const totalStock = (v: Variation) => (v.stocks ?? []).reduce((s, r) => s + r.quantity, 0)
  const productTotalStock = (p: Product) => p.variations.reduce((sum, v) => sum + totalStock(v), 0)
  const getBrandName = (p: Product) => brands.find(b => b.id === p.brandId)?.name ?? t.products.fields.noBrand
  const productPrice = (p: Product) => {
    if (!p.variations.length) return null
    const minPrice = Math.min(...p.variations.map(v => Number(v.price) || 0))
    return `RM ${minPrice.toFixed(2)}`
  }
  const statusDotClass = (status: string) => {
    if (status === 'ACTIVE') return 'bg-green-500'
    if (status === 'INACTIVE') return 'bg-gray-400'
    if (status === 'ARCHIVED') return 'bg-red-500'
    return 'bg-gray-400'
  }

  // ─── Edit Tab config ──────────────────────────────────────────
  const EDIT_TABS: { key: EditTab; label: string; icon: React.ElementType }[] = [
    { key: 'basic', label: t.products.tabs.basic, icon: Info },
    { key: 'detail', label: t.products.tabs.detail, icon: ImageIcon },
    { key: 'shipping', label: t.products.tabs.shipping, icon: Truck },
    { key: 'visibility', label: t.products.tabs.visibility, icon: Eye },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.products.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{meta.total} {t.products.foundSuffix}</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImportFile} />
          <button onClick={() => fileRef.current?.click()} disabled={importing}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 text-gray-600 disabled:opacity-50">
            {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}{t.common.import} CSV
          </button>
          <button onClick={handleExport} disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 text-gray-600 disabled:opacity-50">
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}{t.common.export} CSV
          </button>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-semibold rounded-lg hover:bg-primary-dark transition-colors text-sm">
            <Plus size={15} />{t.products.new}
          </button>
        </div>
      </div>

      {globalError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg flex items-center justify-between"><span>{globalError}</span><button onClick={() => setGlobalError('')}><X size={14} /></button></div>}
      {varError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{varError}</div>}

      {importResult && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{t.products.importDone}: <strong>{importResult.created}</strong> {t.products.created}, <strong>{importResult.skipped}</strong> {t.products.skipped}.
            {importResult.errors.length > 0 && <span className="ml-2 text-red-600">{importResult.errors.length} {t.products.errors}.</span>}
          </span>
          <button onClick={() => setImportResult(null)}><X size={14} /></button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: t.products.totalProducts, value: summary.totalProducts, icon: Package, color: 'blue' },
          { label: t.products.totalVariations, value: summary.totalVariations, icon: Layers, color: 'purple' },
          { label: t.products.totalStock, value: summary.totalStock, icon: BarChart3, color: 'green' },
          { label: t.products.lowStock, value: summary.lowStock, icon: AlertTriangle, color: 'yellow' },
        ].map(card => (
          <div key={card.label} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4">
            <div className={`p-2.5 rounded-lg ${card.color === 'blue' ? 'bg-blue-50' : card.color === 'purple' ? 'bg-purple-50' : card.color === 'green' ? 'bg-green-50' : 'bg-yellow-50'}`}>
              <card.icon size={20} className={card.color === 'blue' ? 'text-blue-500' : card.color === 'purple' ? 'text-purple-500' : card.color === 'green' ? 'text-green-500' : 'text-yellow-500'} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-xs text-gray-500">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Create Modal ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative z-10 bg-white border border-gray-200 rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-8">
            <button onClick={() => setShowCreate(false)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-700"><X size={20} /></button>
            {createStep === 1 ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{t.products.addTitle}</h2>
                  <p className="text-sm text-gray-500 mt-1">{t.products.variation.afterCreate}</p>
                </div>
                {createError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg">{createError}</div>}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t.products.fields.name}</label>
                  <input autoFocus
                    value={productType === 'simple' ? simpleForm.name : varForm2.name}
                    onChange={e => { productType === 'simple' ? setSimpleForm(f => ({ ...f, name: e.target.value })) : setVarForm2(f => ({ ...f, name: e.target.value })) }}
                    onKeyDown={e => e.key === 'Enter' && continueToStep2()}
                    placeholder={t.products.fields.name}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">{t.products.typeLabel}</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['simple', 'variations'] as const).map(pt => (
                      <button key={pt} type="button" onClick={() => setProductType(pt)}
                        className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${productType === pt ? 'border-primary bg-primary/10' : 'border-gray-200 hover:border-gray-300'}`}>
                        {pt === 'simple' ? <Package size={30} className={productType === pt ? 'text-primary' : 'text-gray-400'} /> : <Layers size={30} className={productType === pt ? 'text-primary' : 'text-gray-400'} />}
                        <div className="text-center">
                          <div className={`font-semibold text-sm ${productType === pt ? 'text-gray-900' : 'text-gray-500'}`}>{pt === 'simple' ? t.products.type.simple : t.products.type.variations}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{pt === 'simple' ? t.products.type.simpleDesc : t.products.type.variationsDesc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <button type="button" onClick={continueToStep2}
                  className="w-full py-3.5 bg-primary text-black font-bold rounded-xl text-sm hover:bg-primary-dark transition-colors">
                  {t.common.next} →
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-5">
                <div className="flex items-center gap-3 mb-1">
                  <button type="button" onClick={() => { setCreateStep(1); setCreateError('') }} className="text-gray-500 hover:text-gray-800 text-sm">← {t.products.backToType}</button>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{productType === 'simple' ? t.products.type.simple : t.products.type.variations}</h2>
                    <p className="text-xs text-gray-400">{productType === 'simple' ? simpleForm.name : varForm2.name}</p>
                  </div>
                </div>
                {createError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg">{createError}</div>}
                {productType === 'simple' ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className={LABEL}>SKU <span className="text-red-400">*</span></label>
                        <input required value={simpleForm.sku} onChange={e => setSimpleForm(f => ({ ...f, sku: e.target.value }))} placeholder="PRD-001" className={INPUT} /></div>
                      <div><label className={LABEL}>{t.products.variation.price}</label>
                        <input type="number" step="0.01" min="0" value={simpleForm.price} onChange={e => setSimpleForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" className={INPUT} /></div>
                      <div><label className={LABEL}>{t.products.variation.weight}</label>
                        <input type="number" step="0.001" min="0" value={simpleForm.weight} onChange={e => setSimpleForm(f => ({ ...f, weight: e.target.value }))} placeholder="0.000" className={INPUT} /></div>
                      <div><label className={LABEL}>{t.common.status}</label>
                        <select value={simpleForm.status} onChange={e => setSimpleForm(f => ({ ...f, status: e.target.value }))} className={INPUT + ' bg-white'}>
                          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{getStatusLabel(s)}</option>)}</select></div>
                    </div>
                    <div><label className={LABEL}>{t.products.fields.category}</label>
                      <CategorySelect value={simpleForm.categoryId} onChange={v => setSimpleForm(f => ({ ...f, categoryId: v }))} categories={categories} onAddCategory={handleAddCategory} labels={catLabels} /></div>
                    <div><label className={LABEL}>{t.common.description}</label>
                      <textarea value={simpleForm.description} onChange={e => setSimpleForm(f => ({ ...f, description: e.target.value }))} rows={2} className={INPUT} /></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className={LABEL}>{t.products.fields.sku} <span className="text-red-400">*</span></label>
                        <input required value={varForm2.sku} onChange={e => setVarForm2(f => ({ ...f, sku: e.target.value }))} placeholder="PRD-001" className={INPUT} /></div>
                      <div><label className={LABEL}>{t.common.status}</label>
                        <select value={varForm2.status} onChange={e => setVarForm2(f => ({ ...f, status: e.target.value }))} className={INPUT + ' bg-white'}>
                          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{getStatusLabel(s)}</option>)}</select></div>
                    </div>
                    <div><label className={LABEL}>{t.products.fields.category}</label>
                      <CategorySelect value={varForm2.categoryId} onChange={v => setVarForm2(f => ({ ...f, categoryId: v }))} categories={categories} onAddCategory={handleAddCategory} labels={catLabels} /></div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-gray-700">{t.products.variation.title}</label>
                        <button type="button" onClick={addVarRow} className="text-xs text-primary hover:text-primary-dark flex items-center gap-1"><Plus size={12} />{t.products.variation.addRow}</button>
                      </div>
                      <div className="space-y-2">
                        {varForm2.rows.map((r, i) => (
                          <div key={i} className="border border-gray-200 rounded-lg p-2.5 space-y-2 bg-gray-50/50">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] text-gray-500 mb-1">{t.products.variation.sku}</label>
                                <input value={r.sku} onChange={e => setVarRowField(i, 'sku', e.target.value)} placeholder="SKU-S" className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary" />
                              </div>
                              <div>
                                <label className="block text-[10px] text-gray-500 mb-1">{t.products.variation.name}</label>
                                <input value={r.name} onChange={e => setVarRowField(i, 'name', e.target.value)} placeholder={t.products.variation.name} className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary" />
                              </div>
                            </div>
                            <div className="flex items-end gap-2">
                              <div className="flex-1">
                                <label className="block text-[10px] text-gray-500 mb-1">{t.products.variation.price}</label>
                                <input type="number" step="0.01" value={r.price} onChange={e => setVarRowField(i, 'price', e.target.value)} placeholder="0.00" className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary" />
                              </div>
                              <div className="flex-1">
                                <label className="block text-[10px] text-gray-500 mb-1">{t.products.variation.weight}</label>
                                <input type="number" step="0.001" value={r.weight} onChange={e => setVarRowField(i, 'weight', e.target.value)} placeholder="0.000" className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary" />
                              </div>
                              {varForm2.rows.length > 1 && (
                                <button type="button" onClick={() => removeVarRow(i)} className="p-1.5 text-gray-400 hover:text-red-400 shrink-0 mb-0.5"><Trash2 size={13} /></button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <button type="submit" disabled={saving}
                  className="w-full py-3.5 bg-primary text-black font-bold rounded-xl text-sm hover:bg-primary-dark disabled:opacity-50 flex items-center justify-center gap-2">
                    {saving && <Loader2 size={14} className="animate-spin" />}{t.common.save}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Edit Modal (Tabbed) ── */}
      {editProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditProduct(null)} />
          <div className="relative z-10 bg-white border border-gray-200 rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">

            {/* Modal Header */}
            <div className="flex items-start justify-between px-8 pt-7 pb-0 shrink-0">
              <div>
                <h2 className="font-bold text-gray-900 text-xl">{t.products.editTitle}</h2>
                <p className="text-xs text-gray-500 mt-0.5 font-mono">{editProduct.sku} · {editProduct.name}</p>
              </div>
              <button onClick={() => setEditProduct(null)} className="text-gray-400 hover:text-gray-700 mt-0.5"><X size={20} /></button>
            </div>

            {/* Tabs */}
            <div className="flex gap-0 px-8 mt-5 border-b border-gray-200 shrink-0 overflow-x-auto">
              {EDIT_TABS.map(tab => (
                <button key={tab.key} type="button" onClick={() => setEditTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${
                    editTab === tab.key ? 'border-primary text-primary-dark' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}>
                  <tab.icon size={14} />{tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <form onSubmit={handleEdit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-8 py-6">
                {editError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg mb-4">{editError}</div>}

                {/* ── TAB 1: Basic Information ── */}
                {editTab === 'basic' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={LABEL}>{t.products.fields.name} <span className="text-red-400">*</span></label>
                        <input required value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className={INPUT} />
                      </div>
                      <div>
                        <label className={LABEL}>{t.products.fields.sku} <span className="text-red-400">*</span></label>
                        <input required value={editForm.sku} onChange={e => setEditForm(f => ({ ...f, sku: e.target.value }))} className={INPUT} />
                      </div>
                      <div>
                        <label className={LABEL}>{t.products.fields.category}</label>
                        <CategorySelect value={editForm.categoryId} onChange={v => setEditForm(f => ({ ...f, categoryId: v }))} categories={categories} onAddCategory={handleAddCategory} labels={catLabels} />
                      </div>
                      <div>
                        <label className={LABEL}>{t.products.fields.brand}</label>
                        <select value={editForm.brandId} onChange={e => setEditForm(f => ({ ...f, brandId: e.target.value }))} className={INPUT + ' bg-white'}>
                          <option value="">{t.products.fields.noBrand}</option>
                          {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className={LABEL}>{t.common.description}</label>
                      <textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                        rows={4} placeholder={t.products.fields.descriptionPlaceholder} className={INPUT + ' resize-none'} />
                    </div>
                  </div>
                )}

                {/* ── TAB 2: Detail & Media ── */}
                {editTab === 'detail' && (
                  <div className="space-y-5">
                    {/* Product Main Image */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-2">{t.products.fields.imageMain}</label>
                      <ImageDropZone
                        value={editForm.imageUrl}
                        onChange={url => setEditForm(f => ({ ...f, imageUrl: url }))}
                        labels={{
                          changeImage: t.products.fields.changeImage,
                          uploading: t.products.fields.uploading,
                          imageHint: t.products.fields.imageHint,
                          imageTypes: t.products.fields.imageTypes,
                          imageUrl: t.products.variation.imageUrl,
                          uploadFailed: t.products.fields.uploadFailed,
                        }}
                      />
                    </div>

                    <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-700">{t.products.variation.title} ({editModalVariations.length})</p>
                      {!addingModalVar && (
                        <button type="button" onClick={() => { setAddingModalVar(true); setEditingModalVar(null) }}
                          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-dark font-semibold border border-primary/40 px-3 py-1.5 rounded-lg">
                          <Plus size={13} />{t.products.variation.add}
                        </button>
                      )}
                    </div>

                    {varError && <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">{varError}</div>}

                    <div className="border border-gray-200 rounded-xl overflow-x-auto">
                      <table className="w-full text-xs min-w-[500px]">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                              {[t.products.variation.sku, t.products.variation.name, t.products.variation.price, t.products.variation.weight, t.products.fields.imageMain, ''].map(h => (
                              <th key={h} className="text-left px-3 py-2.5 font-semibold text-gray-500">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {editModalVariations.length === 0 && !addingModalVar && (
                            <tr><td colSpan={6} className="text-center py-6 text-gray-400 italic">{t.products.variation.noVariations}</td></tr>
                          )}
                          {editModalVariations.map(v => (
                            <tr key={v.id} className="hover:bg-gray-50">
                              {editingModalVar === v.id ? (
                                <>
                                  <td className="px-2 py-2"><input value={editModalVarForm.sku} onChange={e => setEditModalVarForm(f => ({ ...f, sku: e.target.value }))} className="border border-gray-300 rounded px-2 py-1.5 w-full text-xs" /></td>
                                  <td className="px-2 py-2"><input value={editModalVarForm.name} onChange={e => setEditModalVarForm(f => ({ ...f, name: e.target.value }))} className="border border-gray-300 rounded px-2 py-1.5 w-full text-xs" /></td>
                                  <td className="px-2 py-2"><input type="number" step="0.01" value={editModalVarForm.price} onChange={e => setEditModalVarForm(f => ({ ...f, price: e.target.value }))} className="border border-gray-300 rounded px-2 py-1.5 w-20 text-xs" /></td>
                                  <td className="px-2 py-2"><input type="number" step="0.001" value={editModalVarForm.weight} onChange={e => setEditModalVarForm(f => ({ ...f, weight: e.target.value }))} className="border border-gray-300 rounded px-2 py-1.5 w-20 text-xs" /></td>
                                  <td className="px-2 py-2"><input value={editModalVarForm.imageUrl} onChange={e => setEditModalVarForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder="https://..." className="border border-gray-300 rounded px-2 py-1.5 w-full text-xs" /></td>
                                  <td className="px-2 py-2">
                                    <div className="flex gap-1">
                                      <button type="button" onClick={() => saveEditModalVar(v)} disabled={savingModalVar} className="p-1 text-green-600 hover:bg-green-50 rounded">
                                        {savingModalVar ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                                      </button>
                                      <button type="button" onClick={() => setEditingModalVar(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X size={13} /></button>
                                    </div>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="px-3 py-2.5 font-mono text-gray-600">{v.sku}</td>
                                  <td className="px-3 py-2.5 font-medium text-gray-800">{v.name}</td>
                                  <td className="px-3 py-2.5 text-gray-600">RM {Number(v.price).toFixed(2)}</td>
                                  <td className="px-3 py-2.5 text-gray-500">{Number(v.weight).toFixed(3)} kg</td>
                                  <td className="px-3 py-2.5 max-w-[120px]">
                                    {v.imageUrl
                                      ? <a href={v.imageUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline truncate block text-xs">{v.imageUrl}</a>
                                      : <span className="text-gray-300">—</span>}
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <div className="flex gap-1">
                                      <button type="button" onClick={() => { startEditModalVar(v); setAddingModalVar(false) }} className="p-1 text-gray-400 hover:text-primary rounded"><Edit2 size={13} /></button>
                                      <button type="button" onClick={() => deleteModalVar(v.id)} className="p-1 text-gray-400 hover:text-red-500 rounded"><Trash2 size={13} /></button>
                                    </div>
                                  </td>
                                </>
                              )}
                            </tr>
                          ))}
                          {addingModalVar && (
                            <tr className="bg-yellow-50/60 border-t-2 border-primary/30">
                              <td className="px-2 py-2"><input autoFocus placeholder="SKU*" value={newModalVarForm.sku} onChange={e => setNewModalVarForm(f => ({ ...f, sku: e.target.value }))} className="border border-gray-300 rounded px-2 py-1.5 w-full text-xs" /></td>
                                  <td className="px-2 py-2"><input placeholder={t.products.addNewRowNamePlaceholder} value={newModalVarForm.name} onChange={e => setNewModalVarForm(f => ({ ...f, name: e.target.value }))} className="border border-gray-300 rounded px-2 py-1.5 w-full text-xs" /></td>
                              <td className="px-2 py-2"><input type="number" step="0.01" placeholder="0.00" value={newModalVarForm.price} onChange={e => setNewModalVarForm(f => ({ ...f, price: e.target.value }))} className="border border-gray-300 rounded px-2 py-1.5 w-20 text-xs" /></td>
                              <td className="px-2 py-2"><input type="number" step="0.001" placeholder="0.000" value={newModalVarForm.weight} onChange={e => setNewModalVarForm(f => ({ ...f, weight: e.target.value }))} className="border border-gray-300 rounded px-2 py-1.5 w-20 text-xs" /></td>
                              <td className="px-2 py-2"><span className="text-gray-400 text-xs">—</span></td>
                              <td className="px-2 py-2">
                                <div className="flex gap-1">
                                  <button type="button" onClick={saveNewModalVar} disabled={savingModalVar} className="p-1 text-green-600 hover:bg-green-50 rounded">
                                    {savingModalVar ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                                  </button>
                                  <button type="button" onClick={() => { setAddingModalVar(false); setVarError('') }} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X size={13} /></button>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-gray-400">{t.products.variation.imageUrl} (https://...)</p>
                  </div>
                )}

                {/* ── TAB 3: Shipping & Payment ── */}
                {editTab === 'shipping' && (
                  <div className="space-y-5">
                    <div>
                      <label className={LABEL}>{t.products.fields.minOrderQty}</label>
                      <div className="flex items-center gap-3">
                        <input type="number" min="1" value={editForm.minOrderQty} onChange={e => setEditForm(f => ({ ...f, minOrderQty: e.target.value }))}
                          placeholder="1" className="w-32 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                        <span className="text-xs text-gray-500">{t.common.optional}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-3">{t.products.variation.title}</label>
                      <div className="border border-gray-200 rounded-xl overflow-hidden">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                {[t.products.variation.title, t.products.variation.sku, t.products.variation.price, t.products.variation.weight, t.products.variation.stock].map(h => (
                                <th key={h} className="text-left px-4 py-2.5 font-semibold text-gray-500">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {editModalVariations.length === 0 && (
                              <tr><td colSpan={5} className="text-center py-6 text-gray-400">{t.products.noVariationInTab}</td></tr>
                            )}
                            {editModalVariations.map(v => (
                              <tr key={v.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium text-gray-800">{v.name}</td>
                                <td className="px-4 py-3 font-mono text-gray-500">{v.sku}</td>
                                <td className="px-4 py-3 text-gray-700">RM {Number(v.price).toFixed(2)}</td>
                                <td className="px-4 py-3 text-gray-600">{Number(v.weight).toFixed(3)} kg</td>
                                <td className="px-4 py-3">
                                  <span className={`font-semibold ${totalStock(v) < 5 ? 'text-red-500' : 'text-gray-800'}`}>{totalStock(v)}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">{t.products.editPriceWeightHint}</p>
                    </div>
                  </div>
                )}

                {/* ── TAB 4: Visibility ── */}
                {editTab === 'visibility' && (
                  <div className="space-y-5">
                    <div>
                      <label className={LABEL}>{t.common.status}</label>
                      <div className="grid grid-cols-3 gap-3">
                        {STATUS_OPTIONS.map(s => (
                          <button key={s} type="button" onClick={() => setEditForm(f => ({ ...f, status: s }))}
                            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                              editForm.status === s ? 'border-primary bg-primary/10' : 'border-gray-200 hover:border-gray-300'
                            }`}>
                            <div className={`w-3 h-3 rounded-full ${s === 'ACTIVE' ? 'bg-green-500' : s === 'INACTIVE' ? 'bg-gray-400' : 'bg-red-400'}`} />
                            <span className={`text-xs font-semibold ${editForm.status === s ? 'text-gray-900' : 'text-gray-500'}`}>{getStatusLabel(s)}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className={LABEL}>{t.products.fields.tags}</label>
                      <div className="relative">
                        <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input value={editForm.tags} onChange={e => setEditForm(f => ({ ...f, tags: e.target.value }))}
                            placeholder={t.products.fields.tagsPlaceholder}
                          className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                      </div>
                          <p className="text-xs text-gray-400 mt-1.5">{t.products.fields.tagsHint}</p>
                    </div>

                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-yellow-100 rounded-lg"><Star size={16} className="text-yellow-500" /></div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{t.products.fields.featured}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{t.products.fields.featuredDesc}</p>
                          </div>
                        </div>
                        <button type="button" onClick={() => setEditForm(f => ({ ...f, isFeatured: !f.isFeatured }))}
                          className={`relative w-11 h-6 rounded-full transition-colors ${editForm.isFeatured ? 'bg-primary' : 'bg-gray-300'}`}>
                          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${editForm.isFeatured ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="shrink-0 px-8 py-5 border-t border-gray-100 flex items-center justify-between gap-3 bg-gray-50/50 rounded-b-2xl">
                <div className="flex gap-2">
                    {EDIT_TABS.findIndex(tab => tab.key === editTab) > 0 && (
                    <button type="button"
                        onClick={() => setEditTab(EDIT_TABS[EDIT_TABS.findIndex(tab => tab.key === editTab) - 1].key)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-100 text-gray-600">
                      ← {t.common.previous}
                    </button>
                  )}
                    {EDIT_TABS.findIndex(tab => tab.key === editTab) < EDIT_TABS.length - 1 && (
                    <button type="button"
                        onClick={() => setEditTab(EDIT_TABS[EDIT_TABS.findIndex(tab => tab.key === editTab) + 1].key)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-100 text-gray-600">
                      {t.common.next} →
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setEditProduct(null)} className="px-5 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">{t.common.cancel}</button>
                  <button type="submit" disabled={editSaving} className="flex items-center gap-2 px-6 py-2 bg-primary text-black font-semibold rounded-lg text-sm disabled:opacity-50 hover:bg-primary-dark">
                    {editSaving && <Loader2 size={13} className="animate-spin" />}{t.common.update}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-2">
        <input type="text" placeholder={t.products.searchPlaceholder} value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary w-52" />
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
          <option value="">{t.products.allStatus}</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{getStatusLabel(s)}</option>)}
        </select>
        {categories.length > 0 && (
          <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(1) }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
            <option value="">{t.products.allCategories}</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <select value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
          <option value="created_desc">{t.products.sort.newest}</option>
          <option value="created_asc">{t.products.sort.oldest}</option>
          <option value="name_asc">{t.products.sort.nameAZ}</option>
          <option value="name_desc">{t.products.sort.nameZA}</option>
        </select>
        {(search || filterStatus || filterCategory) && (
          <button onClick={() => { setSearch(''); setFilterStatus(''); setFilterCategory(''); setPage(1) }}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50">
            {t.common.reset}
          </button>
        )}
      </div>

      {/* ── Table ── */}
      {loading ? <div className="h-64 bg-gray-100 rounded-xl animate-pulse" /> : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-8 px-4 py-3"></th>
                  {[t.products.fields.name, t.products.fields.sku, t.products.fields.category, t.common.price, t.common.status, t.common.actions].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-gray-400">{t.products.noProducts}</td></tr>}
              {items.map(p => (
                <>
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <button onClick={() => setExpandedId(expandedId === p.id ? null : p.id)} className="text-gray-400 hover:text-gray-700">
                        {expandedId === p.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{p.name}</span>
                        {p.isFeatured && <Star size={12} className="text-yellow-500 fill-yellow-500" />}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-500 text-xs">{p.sku}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{p.categoryId ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{productPrice(p) ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block h-2.5 w-2.5 rounded-full ${statusDotClass(p.status)}`} title={getStatusLabel(p.status)} aria-label={getStatusLabel(p.status)} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => openEdit(p)} className="p-1.5 text-gray-400 hover:text-primary hover:bg-yellow-50 rounded-lg" title={t.common.edit}><Edit2 size={14} /></button>
                        <button onClick={() => duplicateProduct(p)} disabled={duplicatingId === p.id} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50" title={t.common.copy}>{duplicatingId === p.id ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}</button>
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg" title={t.common.delete}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === p.id && (
                    <tr key={`${p.id}-exp`} className="bg-[#f8fafc] border-b border-gray-100">
                      <td colSpan={7} className="px-6 py-5">
                        <div className="border border-gray-200 rounded-2xl bg-white overflow-hidden">
                          <div className="p-5 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6 border-b border-gray-100">
                            <div className="h-44 md:h-48 rounded-2xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
                              {p.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                              ) : (
                                <ImageIcon size={54} className="text-gray-300" />
                              )}
                            </div>
                            <div className="space-y-5">
                              <div>
                                <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight">{p.name}</h3>
                                <p className="text-2xl font-semibold text-gray-800 mt-2">{productPrice(p) ?? '—'}</p>
                                <p className="text-base text-gray-500 mt-2">{p.description || t.products.noDescription}</p>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                  <p className="text-sm font-medium text-gray-500">{t.products.fields.category}</p>
                                  <p className="text-2xl font-semibold text-gray-900 mt-1">{p.categoryId || '—'}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-500">{t.products.fields.brand}</p>
                                  <p className="text-2xl font-semibold text-gray-900 mt-1">{getBrandName(p)}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-500">{t.products.totalStock}</p>
                                  <p className="text-2xl font-semibold text-gray-900 mt-1">{productTotalStock(p)} {t.products.units}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="p-5">
                            <div className="flex items-center gap-2 text-gray-900 font-semibold mb-3">
                              <Tag size={16} className="text-[#2b6cb0]" />
                              <span>{t.products.detailSectionTitle}</span>
                            </div>

                            <div className="rounded-2xl border border-gray-200 overflow-hidden">
                              <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                  <tr className="text-gray-500">
                                    {[t.products.variation.sku, t.common.name, t.products.variation.price, t.products.variation.weight, t.products.variation.stock, t.common.actions].map(h => (
                                      <th key={h} className="text-left py-3 px-4 font-semibold">{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {p.variations.length === 0 && <tr><td colSpan={6} className="py-4 px-4 text-gray-400 italic">{t.products.variation.noVariations}</td></tr>}
                                  {p.variations.map(v => (
                                    <tr key={v.id} className="border-b border-gray-100 last:border-0">
                                      {editingVariation?.variation.id === v.id ? (
                                        <>
                                          <td className="px-4 py-2"><input value={varEditForm.sku} onChange={e => setVarEditForm(f => ({ ...f, sku: e.target.value }))} className="border border-gray-300 rounded px-2 py-1 w-full" /></td>
                                          <td className="px-4 py-2"><input value={varEditForm.name} onChange={e => setVarEditForm(f => ({ ...f, name: e.target.value }))} className="border border-gray-300 rounded px-2 py-1 w-full" /></td>
                                          <td className="px-4 py-2"><input type="number" step="0.01" value={varEditForm.price} onChange={e => setVarEditForm(f => ({ ...f, price: e.target.value }))} className="border border-gray-300 rounded px-2 py-1 w-28" /></td>
                                          <td className="px-4 py-2"><input type="number" step="0.001" value={varEditForm.weight} onChange={e => setVarEditForm(f => ({ ...f, weight: e.target.value }))} className="border border-gray-300 rounded px-2 py-1 w-24" /></td>
                                          <td className="px-4 py-2 text-gray-400">—</td>
                                          <td className="px-4 py-2">
                                            <div className="flex gap-1">
                                              <button onClick={saveVariation} disabled={savingVar} className="p-1 text-green-600 hover:bg-green-50 rounded">{savingVar ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}</button>
                                              <button onClick={() => { setEditingVariation(null); setVarError('') }} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X size={13} /></button>
                                            </div>
                                          </td>
                                        </>
                                      ) : (
                                        <>
                                          <td className="px-4 py-3 font-mono text-gray-700">{v.sku}</td>
                                          <td className="px-4 py-3 font-medium text-gray-800">{v.name}</td>
                                          <td className="px-4 py-3 text-gray-700">RM {Number(v.price).toFixed(2)}</td>
                                          <td className="px-4 py-3 text-gray-600">{Number(v.weight).toFixed(3)} kg</td>
                                          <td className="px-4 py-3">
                                            <span className={`font-semibold ${totalStock(v) < 5 ? 'text-red-500' : 'text-gray-800'}`}>{totalStock(v)}</span>
                                          </td>
                                          <td className="px-4 py-3">
                                            <div className="flex gap-1">
                                              <button onClick={() => { openEditVar(p.id, v); setAddingVarTo(null) }} className="p-1 text-gray-400 hover:text-primary rounded"><Edit2 size={13} /></button>
                                              <button onClick={() => deleteVariationFn(p.id, v.id)} className="p-1 text-gray-400 hover:text-red-500 rounded"><Trash2 size={13} /></button>
                                            </div>
                                          </td>
                                        </>
                                      )}
                                    </tr>
                                  ))}
                                  {addingVarTo === p.id ? (
                                    <tr className="border-t-2 border-primary/30 bg-yellow-50/50">
                                      <td className="px-4 pt-2 pb-2"><input autoFocus placeholder={`${t.products.fields.sku}*`} value={newVarForm.sku} onChange={e => setNewVarForm(f => ({ ...f, sku: e.target.value }))} className="border border-gray-300 rounded px-2 py-1 w-full" /></td>
                                      <td className="px-4 pt-2 pb-2"><input placeholder={t.products.addNewRowNamePlaceholder} value={newVarForm.name} onChange={e => setNewVarForm(f => ({ ...f, name: e.target.value }))} className="border border-gray-300 rounded px-2 py-1 w-full" /></td>
                                      <td className="px-4 pt-2 pb-2"><input type="number" step="0.01" placeholder={t.products.variation.price} value={newVarForm.price} onChange={e => setNewVarForm(f => ({ ...f, price: e.target.value }))} className="border border-gray-300 rounded px-2 py-1 w-28" /></td>
                                      <td className="px-4 pt-2 pb-2"><input type="number" step="0.001" placeholder={t.products.variation.weight} value={newVarForm.weight} onChange={e => setNewVarForm(f => ({ ...f, weight: e.target.value }))} className="border border-gray-300 rounded px-2 py-1 w-24" /></td>
                                      <td className="px-4"></td>
                                      <td className="px-4 pt-2 pb-2">
                                        <div className="flex gap-1">
                                          <button onClick={() => saveNewVariation(p.id)} disabled={savingNewVar} className="p-1 text-green-600 hover:bg-green-50 rounded">{savingNewVar ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}</button>
                                          <button onClick={() => { setAddingVarTo(null); setVarError('') }} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X size={13} /></button>
                                        </div>
                                      </td>
                                    </tr>
                                  ) : (
                                    <tr>
                                      <td colSpan={6} className="px-4 py-3">
                                        <button onClick={() => { openAddVar(p.id); setEditingVariation(null) }}
                                          className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-dark font-semibold py-1">
                                          <Plus size={14} />{t.products.variation.add}
                                        </button>
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
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
