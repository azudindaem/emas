'use client'

import { useEffect, useState } from 'react'
import { team as teamApi } from '@/lib/api'
import { Table } from '@/components/ui'
import { useLocale } from '@/lib/locale'

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
  const { t } = useLocale()
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
        <h2 className="text-lg font-semibold text-gray-800">{t.team.title}</h2>
        <p className="text-sm text-gray-400">{t.team.subtitle}</p>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(['members', 'roles'] as const).map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === tabKey ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tabKey === 'members' ? t.team.tabMembers : t.team.tabRoles}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
      ) : tab === 'members' ? (
        <Table
          headers={[t.team.name, t.team.email, t.team.role, t.team.joinedAt]}
          rows={memberRows}
          empty={t.team.noMembers}
        />
      ) : (
        <Table
          headers={[t.team.roleName, t.team.memberCount, t.team.rolesPermissions]}
          rows={roleRows}
          empty={t.team.noRoles}
        />
      )}
    </div>
  )
}
