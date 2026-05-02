'use client'

import { useEffect, useState } from 'react'
import { roles } from '@/lib/api'
import { ShieldCheck, Plus, Trash2, Zap, Loader2, ChevronDown, ChevronUp } from 'lucide-react'

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
  { value: 'user.register', label: 'Pengguna daftar' },
  { value: 'order.complete', label: 'Pesanan selesai' },
  { value: 'membership.upgrade', label: 'Keahlian naik taraf' },
]

export default function RolesPage() {
  const [roleList, setRoleList] = useState<Role[]>([])
  const [automationList, setAutomationList] = useState<Automation[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'roles' | 'automations'>('roles')

  // Role form
  const [showRoleForm, setShowRoleForm] = useState(false)
  const [roleName, setRoleName] = useState('')
  const [rolePermissions, setRolePermissions] = useState('')
  const [savingRole, setSavingRole] = useState(false)

  // Automation form
  const [showAutoForm, setShowAutoForm] = useState(false)
  const [autoName, setAutoName] = useState('')
  const [autoTrigger, setAutoTrigger] = useState('user.register')
  const [autoRoleId, setAutoRoleId] = useState('')
  const [autoCondition, setAutoCondition] = useState('')
  const [savingAuto, setSavingAuto] = useState(false)

  const [error, setError] = useState('')
  const [expandedRole, setExpandedRole] = useState<string | null>(null)

  const load = async () => {
    try {
      const [r, a] = await Promise.all([roles.list(), roles.automations()])
      setRoleList(r as Role[])
      setAutomationList(a as Automation[])
    } catch {
      setError('Gagal memuatkan data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingRole(true)
    setError('')
    try {
      const perms = rolePermissions.split(',').map(p => p.trim()).filter(Boolean)
      await roles.create({ name: roleName, permissions: perms })
      setRoleName('')
      setRolePermissions('')
      setShowRoleForm(false)
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Gagal mencipta peranan')
    } finally {
      setSavingRole(false)
    }
  }

  const handleDeleteRole = async (id: string) => {
    if (!confirm('Padam peranan ini?')) return
    try {
      await roles.delete(id)
      await load()
    } catch { /* ignore */ }
  }

  const handleCreateAuto = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!autoRoleId) { setError('Pilih peranan'); return }
    setSavingAuto(true)
    setError('')
    try {
      let condition = {}
      if (autoCondition.trim()) {
        try { condition = JSON.parse(autoCondition) } catch { setError('Condition JSON tidak sah'); setSavingAuto(false); return }
      }
      await roles.createAutomation({ name: autoName, trigger: autoTrigger, roleId: autoRoleId, condition })
      setAutoName(''); setAutoTrigger('user.register'); setAutoRoleId(''); setAutoCondition('')
      setShowAutoForm(false)
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Gagal mencipta automasi')
    } finally {
      setSavingAuto(false)
    }
  }

  const handleDeleteAuto = async (id: string) => {
    if (!confirm('Padam automasi ini?')) return
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
        <h1 className="text-2xl font-bold text-gray-900">Peranan & Automasi</h1>
        <p className="text-sm text-gray-500 mt-1">Urus peranan pengguna dan peraturan automasi</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { id: 'roles', label: 'Peranan', icon: ShieldCheck },
          { id: 'automations', label: 'Automasi', icon: Zap },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'roles' | 'automations')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-[#d4a017] text-[#b8891a]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon size={15} />
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === tab.id ? 'bg-[#d4a017]/20 text-[#b8891a]' : 'bg-gray-100 text-gray-500'
            }`}>
              {tab.id === 'roles' ? roleList.length : automationList.length}
            </span>
          </button>
        ))}
      </div>

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowRoleForm(!showRoleForm)}
              className="flex items-center gap-2 px-4 py-2 bg-[#d4a017] text-black font-semibold rounded-lg hover:bg-[#b8891a] transition-colors text-sm"
            >
              <Plus size={14} />
              Peranan Baru
            </button>
          </div>

          {showRoleForm && (
            <form onSubmit={handleCreateRole} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <h2 className="font-semibold text-gray-800">Peranan Baru</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Peranan</label>
                  <input
                    required
                    value={roleName}
                    onChange={e => setRoleName(e.target.value)}
                    placeholder="Admin, Editor, Viewer..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kebenaran <span className="text-gray-400 font-normal">(pisah koma)</span>
                  </label>
                  <input
                    value={rolePermissions}
                    onChange={e => setRolePermissions(e.target.value)}
                    placeholder="order.read, product.write..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={savingRole}
                  className="flex items-center gap-2 px-4 py-2 bg-[#d4a017] text-black font-semibold rounded-lg text-sm disabled:opacity-50 hover:bg-[#b8891a]"
                >
                  {savingRole && <Loader2 size={13} className="animate-spin" />}
                  Simpan
                </button>
                <button type="button" onClick={() => setShowRoleForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                  Batal
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {roleList.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl text-center py-12 text-gray-500">
                <ShieldCheck size={36} className="mx-auto mb-3 text-gray-300" />
                <p className="font-medium">Tiada peranan</p>
              </div>
            ) : roleList.map(role => (
              <div key={role.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex items-center px-5 py-4">
                  <div className="w-9 h-9 rounded-lg bg-[#d4a017]/15 flex items-center justify-center mr-4">
                    <ShieldCheck size={16} className="text-[#d4a017]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{role.name}</p>
                      {role.isDefault && (
                        <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">Default</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{role._count?.memberships ?? 0} ahli</p>
                  </div>
                  <div className="flex items-center gap-2">
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
                  <div className="border-t border-gray-100 px-5 py-4">
                    <p className="text-xs font-medium text-gray-500 mb-2">Kebenaran:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(Array.isArray(role.permissions) ? role.permissions : []).length > 0
                        ? (role.permissions as string[]).map(perm => (
                            <span key={perm} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono">
                              {perm}
                            </span>
                          ))
                        : <span className="text-xs text-gray-400">Tiada kebenaran ditetapkan</span>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Automations Tab */}
      {activeTab === 'automations' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowAutoForm(!showAutoForm)}
              className="flex items-center gap-2 px-4 py-2 bg-[#d4a017] text-black font-semibold rounded-lg hover:bg-[#b8891a] transition-colors text-sm"
            >
              <Plus size={14} />
              Automasi Baru
            </button>
          </div>

          {showAutoForm && (
            <form onSubmit={handleCreateAuto} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <h2 className="font-semibold text-gray-800">Automasi Baru</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Automasi</label>
                  <input
                    required
                    value={autoName}
                    onChange={e => setAutoName(e.target.value)}
                    placeholder="Auto-assign admin..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pencetus (Trigger)</label>
                  <select
                    value={autoTrigger}
                    onChange={e => setAutoTrigger(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    {TRIGGERS.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Peranan Diassign</label>
                  <select
                    value={autoRoleId}
                    onChange={e => setAutoRoleId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">-- Pilih Peranan --</option>
                    {roleList.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Syarat <span className="text-gray-400 font-normal">(JSON, pilihan)</span>
                  </label>
                  <input
                    value={autoCondition}
                    onChange={e => setAutoCondition(e.target.value)}
                    placeholder={'{"plan": "pro"}'}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={savingAuto}
                  className="flex items-center gap-2 px-4 py-2 bg-[#d4a017] text-black font-semibold rounded-lg text-sm disabled:opacity-50 hover:bg-[#b8891a]"
                >
                  {savingAuto && <Loader2 size={13} className="animate-spin" />}
                  Simpan
                </button>
                <button type="button" onClick={() => setShowAutoForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                  Batal
                </button>
              </div>
            </form>
          )}

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {automationList.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Zap size={36} className="mx-auto mb-3 text-gray-300" />
                <p className="font-medium">Tiada automasi</p>
                <p className="text-sm mt-1">Cipta peraturan automasi assign peranan</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Nama</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Pencetus</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Peranan</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Syarat</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Status</th>
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
                        {Object.keys(auto.condition).length > 0 ? JSON.stringify(auto.condition) : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded ${auto.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {auto.isActive ? 'Aktif' : 'Tidak Aktif'}
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
