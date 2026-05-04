'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'
import { useLocale } from '@/lib/locale'
import { systemSettings, type SystemPlan } from '@/lib/api'
import { Loader2, CreditCard, CheckCircle2, Calendar, Users, Package, ShoppingCart, Plus, Pencil } from 'lucide-react'

type Subscription = {
  status: string
  billingCycle: string
  currentPeriodStart: string
  currentPeriodEnd: string
  plan: {
    name: string
    code: string
    priceMonthly: number
    priceYearly: number
    maxUsers: number
    maxOrders: number
    maxProducts: number
  }
}

const statusColor: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  PAST_DUE: 'bg-amber-100 text-amber-700',
}

export default function SystemPlanPage() {
  const { isSystemOwner, loading: authLoading } = useAuth()
  const router = useRouter()
  const [sub, setSub] = useState<Subscription | null>(null)
  const [plans, setPlans] = useState<SystemPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [savingPlan, setSavingPlan] = useState(false)
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const { t } = useLocale()
  const p = t.systemPlan

  const [form, setForm] = useState({
    code: '',
    name: '',
    priceMonthly: 0,
    priceYearly: 0,
    maxUsers: 5,
    maxOrders: 500,
    maxProducts: 100,
    isActive: true,
  })

  useEffect(() => {
    if (!authLoading && !isSystemOwner) router.replace('/dashboard')
  }, [authLoading, isSystemOwner, router])

  useEffect(() => {
    if (!isSystemOwner) return
    Promise.all([systemSettings.getSubscription(), systemSettings.listPlans()])
      .then(([subData, planData]) => {
        const typed = subData as Subscription
        if (typed?.plan) setSub(typed)
        setPlans(Array.isArray(planData) ? planData : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [isSystemOwner])

  const resetForm = () => {
    setForm({
      code: '',
      name: '',
      priceMonthly: 0,
      priceYearly: 0,
      maxUsers: 5,
      maxOrders: 500,
      maxProducts: 100,
      isActive: true,
    })
    setEditingPlanId(null)
  }

  const openCreateModal = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const openEditModal = (plan: SystemPlan) => {
    setEditingPlanId(plan.id)
    setForm({
      code: plan.code,
      name: plan.name,
      priceMonthly: Number(plan.priceMonthly),
      priceYearly: Number(plan.priceYearly),
      maxUsers: Number(plan.maxUsers),
      maxOrders: Number(plan.maxOrders),
      maxProducts: Number(plan.maxProducts),
      isActive: Boolean(plan.isActive),
    })
    setIsModalOpen(true)
  }

  const reloadPlans = async () => {
    const data = await systemSettings.listPlans()
    setPlans(Array.isArray(data) ? data : [])
  }

  const savePlan = async () => {
    setSavingPlan(true)
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        priceMonthly: Number(form.priceMonthly),
        priceYearly: Number(form.priceYearly),
        maxUsers: Number(form.maxUsers),
        maxOrders: Number(form.maxOrders),
        maxProducts: Number(form.maxProducts),
        isActive: form.isActive,
      }

      if (editingPlanId) {
        await systemSettings.updatePlan(editingPlanId, payload)
      } else {
        await systemSettings.createPlan(payload)
      }

      await reloadPlans()
      setIsModalOpen(false)
      resetForm()
    } finally {
      setSavingPlan(false)
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
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{p.title}</h1>
            <p className="text-sm text-gray-500">{p.subtitle}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          {p.addPlan}
        </button>
      </div>

      {!sub ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <CreditCard className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="font-medium text-gray-500">{p.noSubscription}</p>
          <p className="mt-1 text-sm text-gray-400">{p.noSubscriptionHint}</p>
        </div>
      ) : (
        <>
          {/* Plan card */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="bg-primary/5 border-b border-gray-100 px-6 py-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Current Plan</p>
                <h2 className="mt-1 text-2xl font-bold text-gray-900">{sub.plan.name}</h2>
                <p className="text-sm text-gray-500 mt-0.5">Code: <span className="font-mono font-medium">{sub.plan.code}</span></p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900">
                  RM {sub.billingCycle === 'YEARLY' ? sub.plan.priceYearly : sub.plan.priceMonthly}
                </div>
                <div className="text-sm text-gray-400">{sub.billingCycle === 'YEARLY' ? p.perYear : p.perMonth}</div>
              </div>
            </div>

            <div className="px-6 py-4 flex items-center gap-4 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${statusColor[sub.status] ?? 'bg-gray-100 text-gray-600'}`}>
                <CheckCircle2 className="h-3 w-3" /> {sub.status}
              </span>
              <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
                <Calendar className="h-4 w-4 text-gray-400" />
                {new Date(sub.currentPeriodStart).toLocaleDateString('ms-MY')} — {new Date(sub.currentPeriodEnd).toLocaleDateString('ms-MY')}
              </span>
              <span className="text-sm text-gray-500 capitalize">{sub.billingCycle.toLowerCase()} {p.billingCycle}</span>
            </div>
          </div>

          {/* Plan limits */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: p.maxUsers, value: sub.plan.maxUsers, icon: Users },
              { label: p.maxOrders, value: sub.plan.maxOrders, icon: ShoppingCart },
              { label: p.maxProducts, value: sub.plan.maxProducts, icon: Package },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-xl border border-gray-200 bg-white p-5 text-center shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mx-auto mb-3">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
                <p className="mt-0.5 text-sm text-gray-500">{label}</p>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">{p.availablePlans}</h3>
          <span className="text-xs text-gray-500">{p.managePlans}</span>
        </div>

        {plans.length === 0 ? (
          <p className="text-sm text-gray-500">{p.noPlans}</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {plans.map((plan) => (
              <div key={plan.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{plan.name}</p>
                    <p className="font-mono text-xs text-gray-500">{plan.code}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${plan.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                    {plan.isActive ? p.active : p.inactive}
                  </span>
                </div>
                <p className="text-sm text-gray-600">RM {Number(plan.priceMonthly)} / {p.perMonth}</p>
                <p className="text-xs text-gray-500">RM {Number(plan.priceYearly)} / {p.perYear}</p>
                <p className="mt-2 text-xs text-gray-500">{p.maxUsers}: {plan.maxUsers}</p>
                <p className="text-xs text-gray-500">{p.maxOrders}: {plan.maxOrders}</p>
                <p className="text-xs text-gray-500">{p.maxProducts}: {plan.maxProducts}</p>
                <button
                  type="button"
                  onClick={() => openEditModal(plan)}
                  className="mt-3 inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-100"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {p.editPlan}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-xl">
            <div className="border-b border-gray-100 px-5 py-4">
              <h3 className="text-base font-semibold text-gray-900">
                {editingPlanId ? p.editPlan : p.addPlan}
              </h3>
            </div>

            <div className="space-y-3 px-5 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">{p.planCode}</label>
                  <input
                    value={form.code}
                    onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">{t.common.name}</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">{p.monthlyPrice}</label>
                  <input
                    type="number"
                    value={form.priceMonthly}
                    onChange={(e) => setForm((prev) => ({ ...prev, priceMonthly: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">{p.yearlyPrice}</label>
                  <input
                    type="number"
                    value={form.priceYearly}
                    onChange={(e) => setForm((prev) => ({ ...prev, priceYearly: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">{p.maxUsers}</label>
                  <input
                    type="number"
                    value={form.maxUsers}
                    onChange={(e) => setForm((prev) => ({ ...prev, maxUsers: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">{p.maxOrders}</label>
                  <input
                    type="number"
                    value={form.maxOrders}
                    onChange={(e) => setForm((prev) => ({ ...prev, maxOrders: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">{p.maxProducts}</label>
                  <input
                    type="number"
                    value={form.maxProducts}
                    onChange={(e) => setForm((prev) => ({ ...prev, maxProducts: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300"
                />
                {p.active}
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                {p.cancel}
              </button>
              <button
                type="button"
                onClick={savePlan}
                disabled={savingPlan}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
              >
                {savingPlan ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {savingPlan ? p.saving : p.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
