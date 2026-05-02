'use client'

import { useEffect, useState } from 'react'
import { inventory as inventoryApi } from '@/lib/api'
import { Badge, Pagination } from '@/components/ui'
import { Loader2, X } from 'lucide-react'

interface Variation {
  id: string
  sku: string
  name: string
}

interface Stock {
  id: string
  variationId: string
  variation?: { sku: string; name: string; product?: { name: string } }
  warehouse?: { name: string }
  quantity: number
  reserved: number
  available: number
}

interface Movement {
  id: string
  variation?: { sku: string; name: string }
  type: string
  quantity: number
  reason?: string | null
  createdAt: string
}

const MOVE_TYPES = ['IN', 'OUT', 'ADJUSTMENT']
const moveColor: Record<string, 'green' | 'red' | 'blue'> = { IN: 'green', OUT: 'red', ADJUSTMENT: 'blue' }

export default function InventoryPage() {
  const [tab, setTab] = useState<'stocks' | 'movements'>('stocks')
  const [stocks, setStocks] = useState<Stock[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [stockMeta, setStockMeta] = useState({ page: 1, totalPages: 1, total: 0 })
  const [moveMeta, setMoveMeta] = useState({ page: 1, totalPages: 1, total: 0 })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [adjustTarget, setAdjustTarget] = useState<Stock | null>(null)
  const [adjustForm, setAdjustForm] = useState({ quantity: '', type: 'IN', reason: '' })
  const [adjusting, setAdjusting] = useState(false)
  const [error, setError] = useState('')

  const loadStocks = () => {
    setLoading(true)
    inventoryApi.stocks({ page: String(page), limit: '20' })
      .then(res => { setStocks(res.items as Stock[]); setStockMeta(res.meta as typeof stockMeta) })
      .finally(() => setLoading(false))
  }

  const loadMovements = () => {
    setLoading(true)
    inventoryApi.movements({ page: String(page), limit: '20' })
      .then(res => { setMovements(res.items as Movement[]); setMoveMeta(res.meta as typeof moveMeta) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { tab === 'stocks' ? loadStocks() : loadMovements() }, [tab, page])

  const openAdjust = (s: Stock) => {
    setAdjustTarget(s)
    setAdjustForm({ quantity: '', type: 'IN', reason: '' })
  }

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adjustTarget) return
    setAdjusting(true); setError('')
    try {
      await inventoryApi.adjust({
        variationId: adjustTarget.variationId,
        quantity: Number(adjustForm.quantity),
        type: adjustForm.type,
        reason: adjustForm.reason || undefined,
      })
      setAdjustTarget(null); loadStocks()
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Gagal selaraskan stok') }
    finally { setAdjusting(false) }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inventori</h1>
        <p className="text-sm text-gray-500 mt-0.5">Urus stok dan pergerakan barang</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

      {adjustTarget && (
        <form onSubmit={handleAdjust} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Selaras Stok</h2>
            <button type="button" onClick={() => setAdjustTarget(null)}><X size={18} className="text-gray-400 hover:text-gray-700" /></button>
          </div>
          <div className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
            <span className="font-mono font-semibold">{adjustTarget.variation?.sku ?? adjustTarget.variationId}</span>
            {adjustTarget.variation?.name && <span className="ml-2 text-gray-500">— {adjustTarget.variation.name}</span>}
            <span className="ml-4">Tersedia: <strong>{adjustTarget.available}</strong></span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kuantiti</label>
              <input required type="number" min="1" value={adjustForm.quantity}
                onChange={e => setAdjustForm(f => ({ ...f, quantity: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jenis</label>
              <select value={adjustForm.type} onChange={e => setAdjustForm(f => ({ ...f, type: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {MOVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sebab</label>
              <input value={adjustForm.reason} onChange={e => setAdjustForm(f => ({ ...f, reason: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Contoh: Terima dari pembekal" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={adjusting} className="flex items-center gap-2 px-4 py-2 bg-[#d4a017] text-black font-semibold rounded-lg text-sm disabled:opacity-50 hover:bg-[#b8891a]">
              {adjusting && <Loader2 size={13} className="animate-spin" />}Selaraskan
            </button>
            <button type="button" onClick={() => setAdjustTarget(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Batal</button>
          </div>
        </form>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(['stocks', 'movements'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); setPage(1) }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'stocks' ? 'Stok' : 'Pergerakan'}
          </button>
        ))}
      </div>

      {loading ? <div className="h-64 bg-gray-100 rounded-xl animate-pulse" /> : tab === 'stocks' ? (
        <>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['SKU', 'Nama Variasi', 'Gudang', 'Stok', 'Ditempah', 'Tersedia', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stocks.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-400">Tiada rekod stok</td></tr>
                ) : stocks.map(s => (
                  <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{s.variation?.sku ?? s.variationId}</td>
                    <td className="px-4 py-3">{s.variation?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{s.warehouse?.name ?? 'Lalai'}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{s.quantity}</td>
                    <td className="px-4 py-3 text-yellow-600">{s.reserved}</td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${s.available < 5 ? 'text-red-500' : 'text-green-600'}`}>{s.available}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => openAdjust(s)} className="text-xs px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-[#d4a017] text-gray-600 transition-colors">Selaras</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={stockMeta.page} totalPages={stockMeta.totalPages} onChange={setPage} />
        </>
      ) : (
        <>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['SKU', 'Nama', 'Jenis', 'Kuantiti', 'Sebab', 'Tarikh'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {movements.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-gray-400">Tiada pergerakan</td></tr>
                ) : movements.map(m => (
                  <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{m.variation?.sku ?? '—'}</td>
                    <td className="px-4 py-3">{m.variation?.name ?? '—'}</td>
                    <td className="px-4 py-3"><Badge label={m.type} color={moveColor[m.type] ?? 'gray'} /></td>
                    <td className="px-4 py-3 font-semibold">{m.quantity}</td>
                    <td className="px-4 py-3 text-gray-500">{m.reason ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{new Date(m.createdAt).toLocaleDateString('ms-MY')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={moveMeta.page} totalPages={moveMeta.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  )
}

