'use client'

import { useEffect, useState } from 'react'
import { commission as commissionApi } from '@/lib/api'
import { Table, Badge } from '@/components/ui'
import { useLocale } from '@/lib/locale'

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
  const { t } = useLocale()
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
        <p className="text-sm text-gray-400">{t.commission.subtitle}</p>
      </div>

      {loading ? (
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
      ) : (
        <Table
          headers={[t.commission.name, t.commission.type, t.commission.value, t.commission.minLevel, t.commission.maxLevel, t.common.status]}
          rows={rows}
          empty={t.commission.noRules}
        />
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <p className="font-semibold mb-1">{t.commission.howToTitle}</p>
        <ol className="list-decimal list-inside space-y-1 text-xs">
          <li>{t.commission.step1} <code>POST /api/v1/commission/rules</code></li>
          <li>{t.commission.step2} <code>POST /api/v1/commission/calculate</code></li>
          <li>{t.commission.step3}</li>
        </ol>
      </div>
    </div>
  )
}
