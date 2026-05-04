'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'
import { systemUsers } from '@/lib/api'
import { Loader2, Users, ShieldCheck } from 'lucide-react'

type Member = {
  id: string
  level: number
  joinedAt: string
  role: { id: string; name: string; level: number; permissions: string[] }
  user: { id: string; name: string; email: string; status: string }
}

type Role = {
  id: string
  name: string
  level: number
  permissions: string[]
}

export default function SystemUsersPage() {
  const { isOwner, loading: authLoading } = useAuth()
  const router = useRouter()

  const [members, setMembers] = useState<Member[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [assigningId, setAssigningId] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !isOwner) router.replace('/dashboard')
  }, [authLoading, isOwner, router])

  useEffect(() => {
    if (!isOwner) return
    Promise.all([systemUsers.list(), systemUsers.listRoles()]).then(([m, r]) => {
      setMembers(m as Member[])
      setRoles(r as Role[])
      setLoading(false)
    })
  }, [isOwner])

  const handleAssign = async (membershipId: string, roleId: string) => {
    setAssigningId(membershipId)
    try {
      await systemUsers.assignRole(membershipId, roleId)
      const updated = await systemUsers.list()
      setMembers(updated as Member[])
    } finally {
      setAssigningId(null)
    }
  }

  if (loading || authLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User List</h1>
          <p className="text-sm text-gray-500">Manage all users and their roles in this tenant</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-gray-400" />
            <span className="font-semibold text-gray-800">Members</span>
            <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{members.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-6 py-3 text-left font-medium text-gray-500">Name</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Email</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Status</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Role</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-400">No users found</td>
                </tr>
              ) : members.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{m.user?.name ?? '-'}</td>
                  <td className="px-6 py-4 text-gray-600">{m.user?.email ?? '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      m.user?.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {m.user?.status ?? '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {assigningId === m.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    ) : (
                      <select
                        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                        value={m.role?.id ?? ''}
                        onChange={(e) => handleAssign(m.id, e.target.value)}
                      >
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {m.joinedAt ? new Date(m.joinedAt).toLocaleDateString('ms-MY') : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
