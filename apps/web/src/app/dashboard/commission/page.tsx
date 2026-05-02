'use client'

import { useEffect, useState } from 'react'
import { commission as commissionApi } from '@/lib/api'
import { Table, Badge } from '@/components/ui'

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

export default function CommissionPage() {
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    commissionApi.rules().then((res) => {
      setRules(res as Rule[])
      setLoading(false)
    })
  }, [])

  const rows = rules.map((r) => [
    r.name,
    <Badge label={r.type} color="blue" />,
    `${Number(r.value).toFixed(2)}${r.valueType === 'PERCENTAGE' ? '%' : ' (Fixed)'}`,
    r.minLevel ?? '-',
    r.maxLevel ?? '-',
    <Badge label={r.isActive ? 'Aktif' : 'Tidak Aktif'} color={r.isActive ? 'green' : 'gray'} />,
  ])

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Komisen</h2>
        <p className="text-sm text-gray-400">Urus kadar dan peraturan komisen</p>
      </div>

      {loading ? (
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
      ) : (
        <Table
          headers={['Nama', 'Jenis', 'Nilai', 'Level Min', 'Level Max', 'Status']}
          rows={rows}
          empty="Tiada peraturan komisen. Tambah melalui API /commission/rules"
        />
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <p className="font-semibold mb-1">Cara menggunakan komisen:</p>
        <ol className="list-decimal list-inside space-y-1 text-xs">
          <li>Buat peraturan komisen melalui API <code>POST /api/v1/commission/rules</code></li>
          <li>Apabila pesanan dikonfirmasi, panggil <code>POST /api/v1/commission/calculate</code> dengan orderId</li>
          <li>Komisen akan dikreditkan ke wallet ahli secara automatik</li>
        </ol>
      </div>
    </div>
  )
}
