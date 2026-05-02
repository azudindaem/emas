'use client'

import { useEffect, useState, useCallback } from 'react'
import { inventory as inventoryApi } from '@/lib/api'
import { Badge, Pagination } from '@/components/ui'
import { useLocale } from '@/lib/locale'
import { Loader2, X, Plus, Pencil, Trash2, Warehouse, Package, AlertTriangle } from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Stock {
  id: string; variationId: string
  variation?: { id: string; sku: string; name: string; product?: { name: string } }
  warehouse?: { id: string; name: string }
  quantity: number; reserved: number; available?: number
}
interface Movement {
  id: string; variationId: string; type: string; quantity: number
  note?: string | null; createdAt: string
  variation?: { sku: string; name: string; product?: { name: string } }
}
interface WarehouseRow {
  id: string; name: string; address?: string | null; isDefault: boolean
  _count?: { stocks: number }
}
interface Summary { totalStocks: number; lowStocks: number; warehouses: number }
interface Meta { page: number; totalPages: number; total: number }

const MOVE_TYPES = ['IN', 'OUT', 'ADJUSTMENT']
const moveColor: Record<string, 'green' | 'red' | 'blue'> = { IN: 'green', OUT: 'red', ADJUSTMENT: 'blue', RESERVED: 'blue', RELEASED: 'blue' }

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function InventoryPage() {
  const { t } = useLocale()
  const [tab, setTab] = useState<'stocks' | 'movements' | 'warehouses'>('stocks')
  const [stocks, setStocks] = useState<Stock[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([])
  const [summary, setSummary] = useState<Summary>({ totalStocks: 0, lowStocks: 0, warehouses: 0 })
  const [stockMeta, setStockMeta] = useState<Meta>({ page: 1, totalPages: 1, total: 0 })
  const [moveMeta, setMoveMeta] = useState<Meta>({ page: 1, totalPages: 1, total: 0 })
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Adjust stock
  const [adjustTarget, setAdjustTarget] = useState<Stock | null>(null)
  const [adjustForm, setAdjustForm] = useState({ quantity: '', type: 'IN', note: '' })
  const [adjusting, setAdjusting] = useState(false)

  // Warehouse modal
  const [warehouseModal, setWarehouseModal] = useState<{ mode: 'create' | 'edit'; row?: WarehouseRow } | null>(null)
  const [warehouseForm, setWarehouseForm] = useState({ name: '', address: '', isDefault: false })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const loadSummary = useCallback(() => {
    inventoryApi.summary().then(s => setSummary(s)).catch(() => null)
  }, [])

  const loadStocks = useCallback(() => {
    setLoading(true)
    const params: Record<string, string> = { page: String(page), limit: '20' }
    if (search) params.search = search
    inventoryApi.stocks(params)
      .then(res => {
        setStocks(res.items as Stock[])
        setStockMeta(res.meta as Meta)
      })
      .finally(() => setLoading(false))
  }, [page, search])

  const loadMovements = useCallback(() => {
    setLoading(true)
    const params: Record<string, string> = { page: String(page), limit: '20' }
    if (filterType) params.type = filterType
    inventoryApi.movements(params)
      .then(res => {
        setMovements(res.items as Movement[])
        setMoveMeta(res.meta as Meta)
      })
      .finally(() => setLoading(false))
  }, [page, filterType])

  const loadWarehouses = useCallback(() => {
    setLoading(true)
    inventoryApi.warehouses()
      .then(r => setWarehouses(r as WarehouseRow[]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadSummary() }, [loadSummary])
  useEffect(() => {
    if (tab === 'stocks') loadStocks()
    else if (tab === 'movements') loadMovements()
    else loadWarehouses()
  }, [tab, page, search, filterType, loadStocks, loadMovements, loadWarehouses])

  // ─── Adjust Stock ───────────────────────────────────────────
  const openAdjust = (s: Stock) => {
    setAdjustTarget(s); setAdjustForm({ quantity: '', type: 'IN', note: '' }); setError('')
  }
  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault(); if (!adjustTarget) return
    setAdjusting(true); setError('')
    try {
      await inventoryApi.adjust({
        variationId: adjustTarget.variationId,
        quantity: Number(adjustForm.quantity),
        type: adjustForm.type,
        note: adjustForm.note || undefined,
      })
      setAdjustTarget(null); loadStocks(); loadSummary()
    } catch (err: unknown) { setError(err instanceof Error ? err.message : t.inventory.failedAdjust) }
    finally { setAdjusting(false) }
  }

  // ─── Warehouse CRUD ─────────────────────────────────────────
  const openCreateWarehouse = () => {
    setWarehouseForm({ name: '', address: '', isDefault: false })
    setWarehouseModal({ mode: 'create' }); setError('')
  }
  const openEditWarehouse = (row: WarehouseRow) => {
    setWarehouseForm({ name: row.name, address: row.address ?? '', isDefault: row.isDefault })
    setWarehouseModal({ mode: 'edit', row }); setError('')
  }
  const handleSaveWarehouse = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      const data = { name: warehouseForm.name, address: warehouseForm.address || undefined, isDefault: warehouseForm.isDefault }
      if (warehouseModal?.mode === 'edit' && warehouseModal.row) {
        await inventoryApi.updateWarehouse(warehouseModal.row.id, data)
      } else {
        await inventoryApi.createWarehouse(data)
      }
      setWarehouseModal(null); loadWarehouses(); loadSummary()
    } catch (err: unknown) { setError(err instanceof Error ? err.message : t.inventory.failedSave) }
    finally { setSaving(false) }
  }
  const handleDeleteWarehouse = async (id: string) => {
    if (!confirm('Padam gudang ini?')) return
    setDeleting(id)
    try { await inventoryApi.deleteWarehouse(id); loadWarehouses(); loadSummary() }
    catch (err: unknown) { alert(err instanceof Error ? err.message : 'Gagal padam') }
    finally { setDeleting(null) }
  }

  const available = (s: Stock) => s.available ?? (s.quantity - s.reserved)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t.inventory.title}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t.inventory.subtitle}</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: t.inventory.totalSKU, value: summary.totalStocks, icon: Package, color: 'blue' },
          { label: t.inventory.lowStock, value: summary.lowStocks, icon: AlertTriangle, color: 'yellow' },
          { label: t.inventory.warehouses, value: summary.warehouses, icon: Warehouse, color: 'green' },
        ].map(card => (
          <div key={card.label} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4">
            <div className={`p-2 rounded-lg ${card.color === 'blue' ? 'bg-blue-50' : card.color === 'yellow' ? 'bg-yellow-50' : 'bg-green-50'}`}>
              <card.icon size={20} className={card.color === 'blue' ? 'text-blue-500' : card.color === 'yellow' ? 'text-yellow-500' : 'text-green-500'} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-xs text-gray-500">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Adjust Stock Form */}
      {adjustTarget && (
        <form onSubmit={handleAdjust} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">{t.inventory.adjustStock}</h2>
            <button type="button" onClick={() => setAdjustTarget(null)}><X size={18} className="text-gray-400 hover:text-gray-700" /></button>
          </div>
          <div className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 flex flex-wrap gap-4">
            <span><span className="text-gray-400">{t.inventory.product}:</span> <strong>{adjustTarget.variation?.product?.name ?? '—'}</strong></span>
            <span><span className="text-gray-400">{t.inventory.sku}:</span> <span className="font-mono">{adjustTarget.variation?.sku ?? adjustTarget.variationId}</span></span>
            <span><span className="text-gray-400">{t.inventory.warehouses}:</span> {adjustTarget.warehouse?.name ?? t.inventory.default}</span>
            <span><span className="text-gray-400">{t.inventory.available}:</span> <strong className={available(adjustTarget) < 5 ? 'text-red-500' : 'text-green-600'}>{available(adjustTarget)}</strong></span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.inventory.quantity}</label>
              <input required type="number" min="1" value={adjustForm.quantity}
                onChange={e => setAdjustForm(f => ({ ...f, quantity: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.inventory.type}</label>
              <select value={adjustForm.type} onChange={e => setAdjustForm(f => ({ ...f, type: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {MOVE_TYPES.map(t2 => <option key={t2} value={t2}>{t2 === 'IN' ? `${t2} (In)` : t2 === 'OUT' ? `${t2} (Out)` : `${t2} (Adj.)`}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.inventory.note}</label>
              <input value={adjustForm.note} onChange={e => setAdjustForm(f => ({ ...f, note: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Contoh: Terima dari pembekal" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={adjusting}
              className="flex items-center gap-2 px-4 py-2 bg-[#d4a017] text-black font-semibold rounded-lg text-sm disabled:opacity-50 hover:bg-[#b8891a]">
              {adjusting && <Loader2 size={13} className="animate-spin" />}{t.inventory.adjustBtn}
            </button>
            <button type="button" onClick={() => setAdjustTarget(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">{t.common.cancel}</button>
          </div>
        </form>
      )}

      {/* Warehouse Modal */}
      {warehouseModal && (
        <form onSubmit={handleSaveWarehouse} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">{warehouseModal.mode === 'create' ? t.inventory.addWarehouse : t.inventory.editWarehouse}</h2>
            <button type="button" onClick={() => setWarehouseModal(null)}><X size={18} className="text-gray-400 hover:text-gray-700" /></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.inventory.warehouseName} <span className="text-red-500">*</span></label>
              <input required value={warehouseForm.name} onChange={e => setWarehouseForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Contoh: Gudang Utama" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.inventory.address}</label>
              <input value={warehouseForm.address} onChange={e => setWarehouseForm(f => ({ ...f, address: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="No. 1, Jalan..." />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={warehouseForm.isDefault}
              onChange={e => setWarehouseForm(f => ({ ...f, isDefault: e.target.checked }))}
              className="rounded border-gray-300" />
            <span className="text-gray-700">{t.inventory.defaultWarehouse}</span>
          </label>
          <div className="flex gap-3">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-[#d4a017] text-black font-semibold rounded-lg text-sm disabled:opacity-50 hover:bg-[#b8891a]">
              {saving && <Loader2 size={13} className="animate-spin" />}{t.common.save}
            </button>
            <button type="button" onClick={() => setWarehouseModal(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">{t.common.cancel}</button>
          </div>
        </form>
      )}

      {/* Tabs + Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {(['stocks', 'movements', 'warehouses'] as const).map(tabKey => (
            <button key={tabKey} onClick={() => { setTab(tabKey); setPage(1); setSearch(''); setFilterType('') }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === tabKey ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {tabKey === 'stocks' ? t.inventory.tabStocks : tabKey === 'movements' ? t.inventory.tabMovements : t.inventory.tabWarehouses}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {tab === 'stocks' && (
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder={t.inventory.searchSKU}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-52 focus:outline-none focus:ring-1 focus:ring-[#d4a017]" />
          )}
          {tab === 'movements' && (
            <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1) }}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#d4a017]">
              <option value="">{t.inventory.allTypes}</option>
              {['IN', 'OUT', 'ADJUSTMENT', 'RESERVED', 'RELEASED'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
          {tab === 'warehouses' && (
            <button onClick={openCreateWarehouse}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#d4a017] text-black font-semibold rounded-lg text-sm hover:bg-[#b8891a]">
              <Plus size={14} />{t.inventory.addWarehouse}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
      ) : tab === 'stocks' ? (
        <>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>{[t.inventory.product, t.inventory.sku, t.inventory.warehouses, t.inventory.stockQty, t.inventory.reserved, t.inventory.available, ''].map(h =>
                  <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>)}</tr>
              </thead>
              <tbody>
                {stocks.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-400">{t.inventory.noStock}</td></tr>
                ) : stocks.map(s => (
                  <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-800">{s.variation?.product?.name ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{s.variation?.sku ?? s.variationId}</td>
                    <td className="px-4 py-3 text-gray-500">{s.warehouse?.name ?? t.inventory.default}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{s.quantity}</td>
                    <td className="px-4 py-3 text-yellow-600">{s.reserved}</td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${available(s) < 5 ? 'text-red-500' : 'text-green-600'}`}>{available(s)}</span>
                      {available(s) < 5 && <span className="ml-1 text-xs text-red-400">{t.inventory.low}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => openAdjust(s)}
                        className="text-xs px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-[#d4a017] text-gray-600 transition-colors">
                        {t.inventory.adjust}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={stockMeta.page} totalPages={stockMeta.totalPages} onChange={p => setPage(p)} />
        </>
      ) : tab === 'movements' ? (
        <>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>{[t.inventory.product, t.inventory.sku, t.inventory.type, t.common.quantity, t.inventory.note, t.inventory.date].map(h =>
                  <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>)}</tr>
              </thead>
              <tbody>
                {movements.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-gray-400">{t.inventory.noMovements}</td></tr>
                ) : movements.map(m => (
                  <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-800">{m.variation?.product?.name ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{m.variation?.sku ?? '—'}</td>
                    <td className="px-4 py-3"><Badge label={m.type} color={moveColor[m.type] ?? 'gray'} /></td>
                    <td className="px-4 py-3 font-semibold">{m.quantity}</td>
                    <td className="px-4 py-3 text-gray-500">{m.note ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{new Date(m.createdAt).toLocaleString('ms-MY')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={moveMeta.page} totalPages={moveMeta.totalPages} onChange={p => setPage(p)} />
        </>
      ) : (
        /* Warehouses */
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{[t.common.name, t.inventory.address, t.inventory.stockCount, t.common.status, ''].map(h =>
                <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>)}</tr>
            </thead>
            <tbody>
              {warehouses.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-gray-400">{t.inventory.noWarehouses}</td></tr>
              ) : warehouses.map(w => (
                <tr key={w.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{w.name}</td>
                  <td className="px-4 py-3 text-gray-500">{w.address ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{w._count?.stocks ?? 0}</td>
                  <td className="px-4 py-3">
                    {w.isDefault ? <Badge label={t.inventory.default} color="green" /> : <span className="text-gray-400 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEditWarehouse(w)} className="p-1.5 text-gray-400 hover:text-[#d4a017] transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => handleDeleteWarehouse(w.id)} disabled={deleting === w.id || w.isDefault}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-30">
                        {deleting === w.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
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
