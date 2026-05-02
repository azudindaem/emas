'use client'

import { useEffect, useState } from 'react'
import { team as teamApi } from '@/lib/api'
import { Table } from '@/components/ui'

type Member = {
  id: string
  role: { name: string }
  user: { name: string; email: string }
  joinedAt: string
}

type Role = {
  id: string
  name: string
  permissions: string[]
  _count?: { memberships: number }
}

export default function TeamPage() {
  const [tab, setTab] = useState<'members' | 'roles'>('members')
  const [members, setMembers] = useState<Member[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    if (tab === 'members') {
      teamApi.members().then((res) => { setMembers(res as Member[]); setLoading(false) })
    } else {
      teamApi.roles().then((res) => { setRoles(res as Role[]); setLoading(false) })
    }
  }, [tab])

  const memberRows = members.map((m) => [
    m.user?.name ?? '-',
    m.user?.email ?? '-',
    m.role?.name ?? '-',
    new Date(m.joinedAt).toLocaleDateString('ms-MY'),
  ])

  const roleRows = roles.map((r) => [
    r.name,
    r._count?.memberships ?? 0,
    <span className="text-xs text-gray-500 font-mono truncate max-w-xs block">
      {(r.permissions as string[]).join(', ')}
    </span>,
  ])

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Pasukan</h2>
        <p className="text-sm text-gray-400">Urus ahli dan peranan</p>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(['members', 'roles'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'members' ? 'Ahli' : 'Peranan'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
      ) : tab === 'members' ? (
        <Table
          headers={['Nama', 'E-mel', 'Peranan', 'Tarikh Sertai']}
          rows={memberRows}
          empty="Tiada ahli pasukan"
        />
      ) : (
        <Table
          headers={['Nama Peranan', 'Bilangan Ahli', 'Kebenaran']}
          rows={roleRows}
          empty="Tiada peranan ditakrifkan"
        />
      )}
    </div>
  )
}
