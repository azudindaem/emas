'use client'

import { useEffect, useState } from 'react'
import { roles, permissions as permissionsApi, type PermissionGroup } from '@/lib/api'
import { useLocale } from '@/lib/locale'
import { ShieldCheck, Plus, Trash2, Zap, Loader2, ChevronDown, ChevronUp, CheckSquare, Square, Pencil, X } from 'lucide-react'

interface Role {
  id: string
  name: string
  level: number
  permissions: string[]
  isDefault: boolean
  _count?: { memberships: number }
}

interface Automation {
  id: string
  name: string
  trigger: string
  condition: Record<string, unknown>
  isActive: boolean
  role: Role
  createdAt: string
}

const TRIGGERS = [
  { value: 'user.register', labelKey: 'triggerRegister' as const },
  { value: 'order.complete', labelKey: 'triggerOrderComplete' as const },
  { value: 'membership.upgrade', labelKey: 'triggerMembershipUpgrade' as const },
]

export default function RolesPage() {
  const { t, locale } = useLocale()
  const [roleList, setRoleList] = useState<Role[]>([])
  const [automationList, setAutomationList] = useState<Automation[]>([])
  const [permGroups, setPermGroups] = useState<PermissionGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'roles' | 'automations'>('roles')

  const [showRoleForm, setShowRoleForm] = useState(false)
  const [roleName, setRoleName] = useState('')
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set())
  const [savingRole, setSavingRole] = useState(false)

  const [showAutoForm, setShowAutoForm] = useState(false)
  const [autoName, setAutoName] = useState('')
  const [autoTrigger, setAutoTrigger] = useState('user.register')
  const [autoRoleId, setAutoRoleId] = useState('')
  const [autoCondition, setAutoCondition] = useState('')
  const [savingAuto, setSavingAuto] = useState(false)

  const [error, setError] = useState('')
  const [expandedRole, setExpandedRole] = useState<string | null>(null)

  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [editName, setEditName] = useState('')
  const [editPerms, setEditPerms] = useState<Set<string>>(new Set())
  const [savingEdit, setSavingEdit] = useState(false)

  const load = async () => {
    try {
      const [r, a, pg] = await Promise.all([roles.list(), roles.automations(), permissionsApi.listGroups(locale)])
      setRoleList(r as Role[])
      setAutomationList(a as Automation[])
      setPermGroups(pg)
    } catch {
      setError(t.roles.failedLoad)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [locale])

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingRole(true)
    setError('')
    try {
      await roles.create({ name: roleName, permissions: [...selectedPerms] })
      setRoleName('')
      setSelectedPerms(new Set())
      setShowRoleForm(false)
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t.roles.failedCreate)
    } finally {
      setSavingRole(false)
    }
  }

  const togglePerm = (key: string) => {
    setSelectedPerms(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleGroup = (group: PermissionGroup) => {
    const allSelected = group.permissions.every(p => selectedPerms.has(p.key))
    setSelectedPerms(prev => {
      const next = new Set(prev)
      for (const p of group.permissions) {
        if (allSelected) next.delete(p.key)
        else next.add(p.key)
      }
      return next
    })
  }

  const startEdit = (role: Role) => {
    setEditingRole(role)
    setEditName(role.name)
    setEditPerms(new Set(role.permissions as string[]))
    setExpandedRole(role.id)
  }

  const cancelEdit = () => {
    setEditingRole(null)
    setEditName('')
    setEditPerms(new Set())
  }

  const toggleEditPerm = (key: string) => {
    setEditPerms(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleEditGroup = (group: PermissionGroup) => {
    const allSelected = group.permissions.every(p => editPerms.has(p.key))
    setEditPerms(prev => {
      const next = new Set(prev)
      for (const p of group.permissions) {
        if (allSelected) next.delete(p.key)
        else next.add(p.key)
      }
      return next
    })
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRole) return
    setSavingEdit(true)
    setError('')
    try {
      await roles.update(editingRole.id, { name: editName, permissions: [...editPerms] })
      cancelEdit()
      await load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.roles.failedUpdate)
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDeleteRole = async (id: string) => {
    if (!confirm(t.roles.deleteConfirmRole)) return
    try {
      await roles.delete(id)
      await load()
    } catch { /* ignore */ }
  }

  const handleCreateAuto = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!autoRoleId) { setError(t.roles.selectRoleFirst); return }
    setSavingAuto(true)
    setError('')
    try {
      let condition = {}
      if (autoCondition.trim()) {
        try { condition = JSON.parse(autoCondition) } catch { setError(t.roles.conditionInvalid); setSavingAuto(false); return }
      }
      await roles.createAutomation({ name: autoName, trigger: autoTrigger, roleId: autoRoleId, condition })
      setAutoName(''); setAutoTrigger('user.register'); setAutoRoleId(''); setAutoCondition('')
      setShowAutoForm(false)
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t.roles.failedCreateAuto)
    } finally {
      setSavingAuto(false)
    }
  }

  const handleDeleteAuto = async (id: string) => {
    if (!confirm(t.roles.deleteConfirmAuto)) return
    try {
      await roles.deleteAutomation(id)
      await load()
    } catch { /* ignore */ }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t.roles.title}</h1>
        <p className="text-sm text-gray-500 mt-1">{t.roles.subtitle}</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
      )}

      <div className="flex gap-1 border-b border-gray-200">
        {[
          { id: 'roles', label: t.roles.tabRoles, icon: ShieldCheck },
          { id: 'automations', label: t.roles.tabAutomations, icon: Zap },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'roles' | 'automations')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary-dark'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon size={15} />
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === tab.id ? 'bg-primary/20 text-primary-dark' : 'bg-gray-100 text-gray-500'
            }`}>
              {tab.id === 'roles' ? roleList.length : automationList.length}
            </span>
          </button>
        ))}
      </div>

      {activeTab === 'roles' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowRoleForm(!showRoleForm)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-semibold rounded-lg hover:bg-primary-dark transition-colors text-sm"
            >
              <Plus size={14} />
              {t.roles.newRole}
            </button>
          </div>

          {showRoleForm && (
            <form onSubmit={handleCreateRole} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <h2 className="font-semibold text-gray-800">{t.roles.newRole}</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.roles.roleName}</label>
                <input
                  required
                  value={roleName}
                  onChange={e => setRoleName(e.target.value)}
                  placeholder="Admin, Editor, Viewer..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">{t.roles.permissions}</label>
                  {selectedPerms.size > 0 && (
                    <span className="text-xs text-primary-dark font-medium">{selectedPerms.size} {t.roles.permissionsSelected}</span>
                  )}
                </div>
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-72 overflow-y-auto">
                  {permGroups.map(group => {
                    const allSelected = group.permissions.every(p => selectedPerms.has(p.key))
                    const someSelected = group.permissions.some(p => selectedPerms.has(p.key))
                    return (
                      <div key={group.group}>
                        <button
                          type="button"
                          onClick={() => toggleGroup(group)}
                          className="flex items-center gap-2 w-full px-3 py-2 bg-gray-50 hover:bg-gray-100 text-left transition-colors"
                        >
                          {allSelected
                            ? <CheckSquare size={14} className="text-primary shrink-0" />
                            : someSelected
                            ? <CheckSquare size={14} className="text-gray-400 shrink-0" />
                            : <Square size={14} className="text-gray-300 shrink-0" />}
                          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{group.group}</span>
                        </button>
                        <div className="px-3 py-1.5 grid grid-cols-2 gap-x-4 gap-y-1">
                          {group.permissions.map(perm => (
                            <label key={perm.key} className="flex items-center gap-2 cursor-pointer py-1 group">
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={selectedPerms.has(perm.key)}
                                onChange={() => togglePerm(perm.key)}
                              />
                              {selectedPerms.has(perm.key)
                                ? <CheckSquare size={13} className="text-primary shrink-0" />
                                : <Square size={13} className="text-gray-300 shrink-0 group-hover:text-gray-400" />}
                              <span className="text-xs text-gray-700">{perm.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={savingRole}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-semibold rounded-lg text-sm disabled:opacity-50 hover:bg-primary-dark"
                >
                  {savingRole && <Loader2 size={13} className="animate-spin" />}
                  {t.common.save}
                </button>
                <button type="button" onClick={() => setShowRoleForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                  {t.common.cancel}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {roleList.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl text-center py-12 text-gray-500">
                <ShieldCheck size={36} className="mx-auto mb-3 text-gray-300" />
                <p className="font-medium">{t.roles.noRoles}</p>
              </div>
            ) : roleList.map(role => (
              <div key={role.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex items-center px-5 py-4">
                  <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center mr-4">
                    <ShieldCheck size={16} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{role.name}</p>
                      {role.isDefault && (
                        <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">Default</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{role._count?.memberships ?? 0} {t.roles.members}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => editingRole?.id === role.id ? cancelEdit() : startEdit(role)}
                      className="p-1.5 text-gray-400 hover:text-primary-dark rounded transition-colors"
                      title={t.common.edit}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setExpandedRole(expandedRole === role.id ? null : role.id)}
                      className="p-1.5 text-gray-400 hover:text-gray-700 rounded"
                    >
                      {expandedRole === role.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                    <button
                      onClick={() => handleDeleteRole(role.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {expandedRole === role.id && (
                  editingRole?.id === role.id ? (
                    <form onSubmit={handleSaveEdit} className="border-t border-gray-100 px-5 py-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-700">{t.roles.editRole}</p>
                        <button type="button" onClick={cancelEdit} className="p-1 text-gray-400 hover:text-gray-600">
                          <X size={14} />
                        </button>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{t.roles.roleName}</label>
                        <input
                          required
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-medium text-gray-600">{t.roles.permissions}</label>
                          {editPerms.size > 0 && (
                            <span className="text-xs text-primary-dark font-medium">{editPerms.size} {t.roles.permissionsSelected}</span>
                          )}
                        </div>
                        <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-64 overflow-y-auto">
                          {permGroups.map(group => {
                            const allSel = group.permissions.every(p => editPerms.has(p.key))
                            const someSel = group.permissions.some(p => editPerms.has(p.key))
                            return (
                              <div key={group.group}>
                                <button
                                  type="button"
                                  onClick={() => toggleEditGroup(group)}
                                  className="flex items-center gap-2 w-full px-3 py-2 bg-gray-50 hover:bg-gray-100 text-left"
                                >
                                  {allSel
                                    ? <CheckSquare size={13} className="text-primary shrink-0" />
                                    : someSel
                                    ? <CheckSquare size={13} className="text-gray-400 shrink-0" />
                                    : <Square size={13} className="text-gray-300 shrink-0" />}
                                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{group.group}</span>
                                </button>
                                <div className="px-3 py-1.5 grid grid-cols-2 gap-x-4 gap-y-1">
                                  {group.permissions.map(perm => (
                                    <label key={perm.key} className="flex items-center gap-2 cursor-pointer py-0.5 group">
                                      <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={editPerms.has(perm.key)}
                                        onChange={() => toggleEditPerm(perm.key)}
                                      />
                                      {editPerms.has(perm.key)
                                        ? <CheckSquare size={12} className="text-primary shrink-0" />
                                        : <Square size={12} className="text-gray-300 shrink-0 group-hover:text-gray-400" />}
                                      <span className="text-xs text-gray-700">{perm.label}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={savingEdit}
                          className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-semibold rounded-lg text-sm disabled:opacity-50 hover:bg-primary-dark"
                        >
                          {savingEdit && <Loader2 size={13} className="animate-spin" />}
                          {t.common.save}
                        </button>
                        <button type="button" onClick={cancelEdit} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                          {t.common.cancel}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="border-t border-gray-100 px-5 py-4">
                      <p className="text-xs font-medium text-gray-500 mb-2">{t.roles.expandPermissions}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(Array.isArray(role.permissions) ? role.permissions : []).length > 0
                          ? (role.permissions as string[]).map(perm => (
                              <span key={perm} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono">{perm}</span>
                            ))
                          : <span className="text-xs text-gray-400">{t.roles.noPermissions}</span>}
                      </div>
                    </div>
                  )
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'automations' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowAutoForm(!showAutoForm)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-semibold rounded-lg hover:bg-primary-dark transition-colors text-sm"
            >
              <Plus size={14} />
              {t.roles.newAutomation}
            </button>
          </div>

          {showAutoForm && (
            <form onSubmit={handleCreateAuto} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <h2 className="font-semibold text-gray-800">{t.roles.newAutomation}</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.roles.automationName}</label>
                  <input
                    required
                    value={autoName}
                    onChange={e => setAutoName(e.target.value)}
                    placeholder="Auto-assign admin..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.roles.trigger}</label>
                  <select
                    value={autoTrigger}
                    onChange={e => setAutoTrigger(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    {TRIGGERS.map(trig => (
                      <option key={trig.value} value={trig.value}>{t.roles[trig.labelKey]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.roles.assignedRole}</label>
                  <select
                    value={autoRoleId}
                    onChange={e => setAutoRoleId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">{t.roles.selectRole}</option>
                    {roleList.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.roles.condition} <span className="text-gray-400 font-normal">{t.roles.conditionHint}</span>
                  </label>
                  <input
                    value={autoCondition}
                    onChange={e => setAutoCondition(e.target.value)}
                    placeholder='{"plan": "pro"}'
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={savingAuto}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-semibold rounded-lg text-sm disabled:opacity-50 hover:bg-primary-dark"
                >
                  {savingAuto && <Loader2 size={13} className="animate-spin" />}
                  {t.common.save}
                </button>
                <button type="button" onClick={() => setShowAutoForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                  {t.common.cancel}
                </button>
              </div>
            </form>
          )}

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {automationList.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Zap size={36} className="mx-auto mb-3 text-gray-300" />
                <p className="font-medium">{t.roles.noAutomations}</p>
                <p className="text-sm mt-1">{t.roles.noAutomationsHint}</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">{t.roles.name}</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">{t.roles.triggerCol}</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">{t.roles.role}</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">{t.roles.conditionCol}</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">{t.common.status}</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {automationList.map(auto => (
                    <tr key={auto.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-900">{auto.name}</td>
                      <td className="px-5 py-3">
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-mono">
                          {auto.trigger}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-700">{auto.role.name}</td>
                      <td className="px-5 py-3 font-mono text-xs text-gray-500">
                        {Object.keys(auto.condition).length > 0 ? JSON.stringify(auto.condition) : '\u2014'}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded ${auto.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {auto.isActive ? t.roles.active : t.roles.inactive}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => handleDeleteAuto(auto.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
