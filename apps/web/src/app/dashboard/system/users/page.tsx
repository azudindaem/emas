'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'
import { useLocale } from '@/lib/locale'
import { systemUsers } from '@/lib/api'
import { Loader2, Users, Building2 } from 'lucide-react'

type Subscriber = {
  membershipId: string
  workspaceId: string
  workspaceName: string
  workspaceSlug: string
  workspaceCreatedAt: string
  userId: string
  name: string
  email: string
  status: string
  role: string
  level: number
  joinedAt: string
}

export default function SystemUsersPage() {
  const { t } = useLocale()
  const u = t.systemUsers
  const { isSuperAdmin, loading: authLoading } = useAuth()
  const router = useRouter()

  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) router.replace('/dashboard')
  }, [authLoading, isSuperAdmin, router])

  useEffect(() => {
    if (!isSuperAdmin) return
    systemUsers.list().then((data) => {
      setSubscribers(data as Subscriber[])
      setLoading(false)
    })
  }, [isSuperAdmin])

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
          <h1 className="text-2xl font-bold text-gray-900">{u.title}</h1>
          <p className="text-sm text-gray-500">Senarai semua subscriber yang berdaftar</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-6 py-4 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-gray-400" />
          <span className="font-semibold text-gray-800">Subscribers</span>
          <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{subscribers.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-6 py-3 text-left font-medium text-gray-500">Nama</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Email</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Workspace</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Status</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Daftar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {subscribers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-400">Tiada subscriber berdaftar</td>
                </tr>
              ) : subscribers.map((s) => (
                <tr key={s.membershipId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{s.name}</td>
                  <td className="px-6 py-4 text-gray-600">{s.email}</td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{s.workspaceName}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      s.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(s.joinedAt).toLocaleDateString('ms-MY')}
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
