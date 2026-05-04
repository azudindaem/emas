'use client'

import { useEffect, useState, useCallback } from 'react'
import { team as teamApi, TeamMember, TeamInvite, TeamRole } from '@/lib/api'
import { useLocale } from '@/lib/locale'

// ── Icons ───────────────────────────────────────────────────────────────────
function IconPlus() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

function IconX() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

// ── Modal ────────────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <IconX />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

// ── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, avatarUrl }: { name: string; avatarUrl?: string }) {
  const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  if (avatarUrl) return <img src={avatarUrl} alt={name} className="w-8 h-8 rounded-full object-cover" />
  return (
    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-xs font-bold text-amber-700">
      {initials}
    </div>
  )
}

// ── Badge ────────────────────────────────────────────────────────────────────
function Badge({ label, color = 'gray' }: { label: string; color?: 'amber' | 'green' | 'gray' | 'red' }) {
  const cls = {
    amber: 'bg-amber-100 text-amber-700',
    green: 'bg-green-100 text-green-700',
    gray: 'bg-gray-100 text-gray-600',
    red: 'bg-red-100 text-red-600',
  }[color]
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function TeamPage() {
  const { t } = useLocale()
  type Tab = 'members' | 'invites' | 'roles'
  const [tab, setTab] = useState<Tab>('members')

  const [members, setMembers] = useState<TeamMember[]>([])
  const [invites, setInvites] = useState<TeamInvite[]>([])
  const [roles, setRoles] = useState<TeamRole[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Invite modal
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRoleId, setInviteRoleId] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState('')
  const [inviteError, setInviteError] = useState('')

  // New role modal
  const [showNewRole, setShowNewRole] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleLevel, setNewRoleLevel] = useState('50')
  const [newRolePerms, setNewRolePerms] = useState('')
  const [newRoleLoading, setNewRoleLoading] = useState(false)
  const [newRoleError, setNewRoleError] = useState('')

  const loadMembers = useCallback(() => {
    setLoading(true); setError('')
    teamApi.members()
      .then(setMembers)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const loadInvites = useCallback(() => {
    setLoading(true); setError('')
    teamApi.invites()
      .then(setInvites)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const loadRoles = useCallback(() => {
    setLoading(true); setError('')
    teamApi.roles()
      .then(setRoles)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (tab === 'members') loadMembers()
    else if (tab === 'invites') loadInvites()
    else loadRoles()
  }, [tab, loadMembers, loadInvites, loadRoles])

  // Load roles for invite dropdown
  useEffect(() => {
    if (roles.length === 0) teamApi.roles().then(setRoles).catch(() => {})
  }, [])

  const handleAssignRole = async (membershipId: string, roleId: string) => {
    try {
      await teamApi.assignRole(membershipId, roleId)
      loadMembers()
    } catch (e: unknown) {
      alert((e as Error).message)
    }
  }

  const handleRemoveMember = async (membershipId: string, name: string) => {
    if (!confirm(`${t.team.removeMemberConfirm} (${name})`)) return
    try {
      await teamApi.removeMember(membershipId)
      loadMembers()
    } catch (e: unknown) {
      alert((e as Error).message)
    }
  }

  const handleCancelInvite = async (inviteId: string) => {
    if (!confirm(t.team.cancelInviteConfirm)) return
    try {
      await teamApi.cancelInvite(inviteId)
      loadInvites()
    } catch (e: unknown) {
      alert((e as Error).message)
    }
  }

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail || !inviteRoleId) return
    setInviteLoading(true); setInviteError(''); setInviteSuccess('')
    try {
      await teamApi.sendInvite(inviteEmail, inviteRoleId)
      setInviteSuccess(`${t.team.inviteSent} ${inviteEmail}`)
      setInviteEmail(''); setInviteRoleId('')
      if (tab === 'invites') loadInvites()
    } catch (e: unknown) {
      setInviteError((e as Error).message)
    } finally {
      setInviteLoading(false)
    }
  }

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRoleName) return
    setNewRoleLoading(true); setNewRoleError('')
    try {
      await teamApi.createRole({
        name: newRoleName,
        level: parseInt(newRoleLevel, 10) || 50,
        permissions: newRolePerms ? newRolePerms.split(',').map((p) => p.trim()).filter(Boolean) : [],
      })
      setShowNewRole(false); setNewRoleName(''); setNewRoleLevel('50'); setNewRolePerms('')
      loadRoles()
    } catch (e: unknown) {
      setNewRoleError((e as Error).message)
    } finally {
      setNewRoleLoading(false)
    }
  }

  const tabDefs: { key: Tab; label: string }[] = [
    { key: 'members', label: t.team.tabMembers },
    { key: 'invites', label: t.team.tabInvites },
    { key: 'roles', label: t.team.tabRoles },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">{t.team.title}</h2>
          <p className="text-sm text-gray-400">{t.team.subtitle}</p>
        </div>
        {tab !== 'roles' && (
          <button
            onClick={() => { setShowInvite(true); setInviteSuccess(''); setInviteError('') }}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <IconPlus />
            {t.team.inviteMember}
          </button>
        )}
        {tab === 'roles' && (
          <button
            onClick={() => { setShowNewRole(true); setNewRoleError('') }}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <IconPlus />
            {t.team.newRole}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {tabDefs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}
      {loading && <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />}

      {/* Members Tab */}
      {!loading && tab === 'members' && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {members.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-sm">{t.team.noMembers}</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-6 py-3 text-left">{t.team.name}</th>
                  <th className="px-6 py-3 text-left hidden md:table-cell">{t.team.email}</th>
                  <th className="px-6 py-3 text-left">{t.team.role}</th>
                  <th className="px-6 py-3 text-left hidden md:table-cell">{t.team.joinedAt}</th>
                  <th className="px-6 py-3 text-right">{t.team.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={m.user?.name ?? '?'} avatarUrl={m.user?.avatarUrl} />
                        <span className="font-medium text-gray-800">{m.user?.name ?? '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 hidden md:table-cell text-gray-500">{m.user?.email ?? '-'}</td>
                    <td className="px-6 py-3">
                      <select
                        value={m.role?.id ?? ''}
                        onChange={(e) => handleAssignRole(m.id, e.target.value)}
                        className="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:border-amber-400"
                      >
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-3 hidden md:table-cell text-gray-400 text-xs">
                      {m.joinedAt ? new Date(m.joinedAt).toLocaleDateString('ms-MY') : '-'}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => handleRemoveMember(m.id, m.user?.name ?? '')}
                        className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"
                      >
                        <IconTrash />
                        {t.team.removeMember}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Invites Tab */}
      {!loading && tab === 'invites' && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {invites.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-sm">{t.team.noInvites}</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-6 py-3 text-left">{t.team.email}</th>
                  <th className="px-6 py-3 text-left">{t.team.role}</th>
                  <th className="px-6 py-3 text-left hidden md:table-cell">{t.team.sentBy}</th>
                  <th className="px-6 py-3 text-left hidden md:table-cell">{t.team.expires}</th>
                  <th className="px-6 py-3 text-left">{t.team.inviteStatus}</th>
                  <th className="px-6 py-3 text-right">{t.team.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invites.map((inv) => {
                  const expired = new Date(inv.expiresAt) < new Date()
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-3 font-medium text-gray-800">{inv.email}</td>
                      <td className="px-6 py-3 text-gray-600">{inv.role?.name}</td>
                      <td className="px-6 py-3 hidden md:table-cell text-gray-400 text-xs">{inv.invitedByUser?.name}</td>
                      <td className="px-6 py-3 hidden md:table-cell text-gray-400 text-xs">
                        {new Date(inv.expiresAt).toLocaleDateString('ms-MY')}
                      </td>
                      <td className="px-6 py-3">
                        <Badge label={expired ? t.team.inviteExpired : t.team.invitePending} color={expired ? 'red' : 'amber'} />
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button
                          onClick={() => handleCancelInvite(inv.id)}
                          className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"
                        >
                          <IconTrash />
                          {t.team.cancelInvite}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Roles Tab */}
      {!loading && tab === 'roles' && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {roles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-sm">{t.team.noRoles}</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-6 py-3 text-left">{t.team.roleName}</th>
                  <th className="px-6 py-3 text-left">{t.team.level}</th>
                  <th className="px-6 py-3 text-left">{t.team.memberCount}</th>
                  <th className="px-6 py-3 text-left">{t.team.rolesPermissions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {roles.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-3 font-medium text-gray-800">{r.name}</td>
                    <td className="px-6 py-3 text-gray-500">{r.level}</td>
                    <td className="px-6 py-3 text-gray-500">{r._count?.memberships ?? 0}</td>
                    <td className="px-6 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(r.permissions ?? []).slice(0, 5).map((p) => (
                          <Badge key={p} label={p} color="gray" />
                        ))}
                        {(r.permissions ?? []).length > 5 && (
                          <Badge label={`+${r.permissions.length - 5}`} color="gray" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Invite Modal ── */}
      <Modal open={showInvite} onClose={() => setShowInvite(false)} title={t.team.inviteMember}>
        <form onSubmit={handleSendInvite} className="space-y-4">
          {inviteSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">{inviteSuccess}</div>
          )}
          {inviteError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{inviteError}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.team.inviteEmail}</label>
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="staff@example.com"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.team.inviteRole}</label>
            <select
              required
              value={inviteRoleId}
              onChange={(e) => setInviteRoleId(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 bg-white"
            >
              <option value="">— {t.team.inviteRole} —</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setShowInvite(false)}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={inviteLoading}
              className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              {inviteLoading ? t.team.sending : t.team.sendInvite}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── New Role Modal ── */}
      <Modal open={showNewRole} onClose={() => setShowNewRole(false)} title={t.team.newRole}>
        <form onSubmit={handleCreateRole} className="space-y-4">
          {newRoleError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{newRoleError}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.team.roleName}</label>
            <input
              type="text"
              required
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder="e.g. Manager"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.team.roleLevel}</label>
            <input
              type="number"
              min={1}
              max={999}
              value={newRoleLevel}
              onChange={(e) => setNewRoleLevel(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.team.rolesPermissions}</label>
            <input
              type="text"
              value={newRolePerms}
              onChange={(e) => setNewRolePerms(e.target.value)}
              placeholder={t.team.rolePermissionsHint}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
            />
            <p className="text-xs text-gray-400 mt-1">{t.team.rolePermissionsHint}</p>
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setShowNewRole(false)}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={newRoleLoading}
              className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              {newRoleLoading ? t.team.creating : t.team.createRole}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
