'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'
import { systemSettings } from '@/lib/api'
import { Loader2, CreditCard, CheckCircle2, Calendar, Users, Package, ShoppingCart } from 'lucide-react'

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
  const { isOwner, loading: authLoading } = useAuth()
  const router = useRouter()
  const [sub, setSub] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !isOwner) router.replace('/dashboard')
  }, [authLoading, isOwner, router])

  useEffect(() => {
    if (!isOwner) return
    systemSettings.getSubscription().then((data) => {
      const typed = data as Subscription
      if (typed?.plan) setSub(typed)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [isOwner])

  if (loading || authLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <CreditCard className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscription Plan</h1>
          <p className="text-sm text-gray-500">Your current plan and subscription details</p>
        </div>
      </div>

      {!sub ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <CreditCard className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="font-medium text-gray-500">No active subscription</p>
          <p className="mt-1 text-sm text-gray-400">Contact support to activate your plan</p>
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
                <div className="text-sm text-gray-400">per {sub.billingCycle === 'YEARLY' ? 'year' : 'month'}</div>
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
              <span className="text-sm text-gray-500 capitalize">{sub.billingCycle.toLowerCase()} billing</span>
            </div>
          </div>

          {/* Plan limits */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Max Users', value: sub.plan.maxUsers, icon: Users },
              { label: 'Max Orders', value: sub.plan.maxOrders, icon: ShoppingCart },
              { label: 'Max Products', value: sub.plan.maxProducts, icon: Package },
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
    </div>
  )
}
