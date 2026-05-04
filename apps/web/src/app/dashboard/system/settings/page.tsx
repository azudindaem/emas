'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from '@/lib/locale'
import { useAuth } from '@/components/auth-provider'
import { systemSettings, type SystemMode } from '@/lib/api'
import { Wrench, Globe, AlertTriangle, CheckCircle2, Loader2, Save } from 'lucide-react'

export default function SystemSettingsPage() {
  const { t } = useLocale()
  const s = t.systemSettings
  const { isSystemOwner, loading: authLoading } = useAuth()
  const router = useRouter()

  const [mode, setMode] = useState<SystemMode>('ACTIVE')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await systemSettings.getMode()
      setMode(data.mode)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!authLoading && !isSystemOwner) {
      router.replace('/dashboard')
    }
  }, [authLoading, isSystemOwner, router])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const data = await systemSettings.setMode(mode)
      setMode(data.mode)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
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
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{s.title}</h1>
        <p className="mt-1 text-sm text-gray-500">{s.subtitle}</p>
      </div>

      {mode === 'MAINTENANCE' && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
          <div>
            <p className="text-sm font-semibold text-amber-800">{s.warningTitle}</p>
            <p className="mt-0.5 text-sm text-amber-700">{s.warningDesc}</p>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="font-semibold text-gray-800">{s.modeLabel}</h2>
          <p className="mt-0.5 text-sm text-gray-500">{s.modeHint}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 p-6">
          <button
            type="button"
            onClick={() => setMode('ACTIVE')}
            className={`flex flex-col items-center gap-3 rounded-xl border-2 p-6 text-center transition-all ${
              mode === 'ACTIVE'
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-full ${mode === 'ACTIVE' ? 'bg-green-100' : 'bg-gray-100'}`}>
              <Globe className={`h-6 w-6 ${mode === 'ACTIVE' ? 'text-green-600' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className={`font-semibold ${mode === 'ACTIVE' ? 'text-green-700' : 'text-gray-700'}`}>{s.modeLive}</p>
              <p className="mt-1 text-xs text-gray-500">{s.modeDescLive}</p>
            </div>
            {mode === 'ACTIVE' && (
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                <CheckCircle2 className="h-3 w-3" /> {s.modeLive}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setMode('MAINTENANCE')}
            className={`flex flex-col items-center gap-3 rounded-xl border-2 p-6 text-center transition-all ${
              mode === 'MAINTENANCE'
                ? 'border-amber-500 bg-amber-50'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-full ${mode === 'MAINTENANCE' ? 'bg-amber-100' : 'bg-gray-100'}`}>
              <Wrench className={`h-6 w-6 ${mode === 'MAINTENANCE' ? 'text-amber-600' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className={`font-semibold ${mode === 'MAINTENANCE' ? 'text-amber-700' : 'text-gray-700'}`}>{s.modeMaintenance}</p>
              <p className="mt-1 text-xs text-gray-500">{s.modeDescMaintenance}</p>
            </div>
            {mode === 'MAINTENANCE' && (
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                <Wrench className="h-3 w-3" /> {s.modeMaintenance}
              </span>
            )}
          </button>
        </div>

        <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between">
          {saved ? (
            <span className="flex items-center gap-1.5 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" /> {s.saved}
            </span>
          ) : <span />}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {saving ? (
              <><Loader2 className="h-4 w-4 animate-spin" />{s.saving}</>
            ) : (
              <><Save className="h-4 w-4" />{s.save}</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
