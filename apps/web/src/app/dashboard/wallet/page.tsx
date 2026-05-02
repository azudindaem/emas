'use client'

import { useEffect, useState } from 'react'
import { wallet as walletApi } from '@/lib/api'
import { Table, Badge, Pagination, StatCard } from '@/components/ui'
import { Wallet } from 'lucide-react'

type WalletEntry = { id: string; balance: number; holdBalance: number; user: { name: string; email: string } }
type Transaction = {
  id: string
  type: string
  amount: number
  balanceBefore: number
  balanceAfter: number
  note: string | null
  createdAt: string
  wallet: { userId: string }
}

const txTypeColor: Record<string, 'green' | 'red' | 'blue' | 'purple' | 'gray'> = {
  CREDIT: 'green',
  DEBIT: 'red',
  COMMISSION: 'blue',
  WITHDRAWAL: 'red',
  REFUND: 'green',
  TRANSFER_IN: 'green',
  TRANSFER_OUT: 'red',
}

export default function WalletPage() {
  const [tab, setTab] = useState<'balances' | 'transactions'>('balances')
  const [balances, setBalances] = useState<WalletEntry[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const totalBalance = balances.reduce((sum, w) => sum + Number(w.balance), 0)

  useEffect(() => {
    setLoading(true)
    if (tab === 'balances') {
      walletApi.balances().then((res) => {
        setBalances(res as WalletEntry[])
        setLoading(false)
      })
    } else {
      walletApi
        .transactions({ page: String(page), limit: '20' })
        .then((res) => {
          setTransactions(res.items as Transaction[])
          setMeta(res.meta as typeof meta)
        })
        .finally(() => setLoading(false))
    }
  }, [tab, page])

  const balanceRows = balances.map((w) => [
    w.user?.name ?? '-',
    w.user?.email ?? '-',
    `RM ${Number(w.balance).toFixed(2)}`,
    `RM ${Number(w.holdBalance).toFixed(2)}`,
    `RM ${(Number(w.balance) - Number(w.holdBalance)).toFixed(2)}`,
  ])

  const txRows = transactions.map((t) => [
    <Badge label={t.type} color={txTypeColor[t.type] ?? 'gray'} />,
    <span className={`font-semibold ${txTypeColor[t.type] === 'green' ? 'text-green-600' : 'text-red-500'}`}>
      RM {Number(t.amount).toFixed(2)}
    </span>,
    `RM ${Number(t.balanceAfter).toFixed(2)}`,
    t.note ?? '-',
    new Date(t.createdAt).toLocaleDateString('ms-MY'),
  ])

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Wallet</h2>
        <p className="text-sm text-gray-400">Baki dan transaksi wallet ahli</p>
      </div>

      <StatCard
        label="Jumlah Baki Wallet"
        value={`RM ${totalBalance.toFixed(2)}`}
        icon={<Wallet size={18} />}
        color="bg-green-500"
      />

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(['balances', 'transactions'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setPage(1) }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'balances' ? 'Baki Ahli' : 'Transaksi'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
      ) : tab === 'balances' ? (
        <Table
          headers={['Nama', 'E-mel', 'Baki', 'Ditahan', 'Tersedia']}
          rows={balanceRows}
          empty="Tiada wallet ahli"
        />
      ) : (
        <>
          <Table
            headers={['Jenis', 'Amaun', 'Baki Selepas', 'Nota', 'Tarikh']}
            rows={txRows}
            empty="Tiada transaksi"
          />
          <Pagination page={meta.page} totalPages={meta.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  )
}
