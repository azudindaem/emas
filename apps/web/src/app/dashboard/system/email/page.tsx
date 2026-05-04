'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'
import { systemEmail, type SystemEmailConfig } from '@/lib/api'
import {
  Mail,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Send,
  Eye,
  EyeOff,
  Info,
} from 'lucide-react'

const GMAIL_PRESET = {
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  user: '',
  pass: '',
  from: '',
  isEnabled: true,
}

const EMPTY: SystemEmailConfig = {
  host: '',
  port: 587,
  secure: false,
  user: '',
  pass: '',
  from: '',
  isEnabled: false,
}

export default function SystemEmailPage() {
  const { isOwner, loading: authLoading } = useAuth()
  const router = useRouter()

  const [form, setForm] = useState<SystemEmailConfig>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [hasConfig, setHasConfig] = useState(false)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const load = useCallback(async () => {
    try {
      const data = await systemEmail.get()
      if (data) {
        setForm({ ...data, pass: '' }) // don't show masked pass
        setHasConfig(true)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!authLoading && !isOwner) router.replace('/dashboard')
  }, [authLoading, isOwner, router])

  const handleSave = async () => {
    setSaving(true)
    try {
      await systemEmail.upsert(form)
      setHasConfig(true)
      showToast('Email settings saved successfully')
    } catch (err) {
      showToast((err as Error).message ?? 'Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    if (!testEmail) return
    setTesting(true)
    try {
      await systemEmail.test(testEmail)
      showToast(`Test email sent to ${testEmail}`)
    } catch (err) {
      showToast((err as Error).message ?? 'Test failed', 'error')
    } finally {
      setTesting(false)
    }
  }

  const applyGmail = () => {
    setForm((prev) => ({ ...prev, ...GMAIL_PRESET }))
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
      {/* Toast */}
      {toast && (
        <div className={`fixed right-6 top-6 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg transition-all ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Email (SMTP)</h1>
        <p className="mt-1 text-sm text-gray-500">Configure the SMTP server used to send system notifications and emails to users.</p>
      </div>

      {/* Gmail quick-fill */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
        <div className="flex-1 text-sm text-blue-700">
          <p className="font-medium">Using Gmail?</p>
          <p className="mt-0.5 text-blue-600">Use an <strong>App Password</strong> (not your Google account password). Go to Google Account → Security → 2-Step Verification → App passwords.</p>
        </div>
        <button
          type="button"
          onClick={applyGmail}
          className="flex-shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
        >
          Use Gmail
        </button>
      </div>

      {/* SMTP Form */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4">
          <div className={`rounded-lg p-2 ${hasConfig && form.isEnabled ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
            <Mail size={18} />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-800">SMTP Configuration</h2>
            <p className="text-xs text-gray-400">
              {hasConfig && form.isEnabled ? 'Email is configured and enabled' : 'Not configured'}
            </p>
          </div>
          {/* Enable Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Enable</span>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, isEnabled: !f.isEnabled }))}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                form.isEnabled ? 'bg-emerald-500' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                form.isEnabled ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>

        <div className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 md:col-span-1">
              <label className="mb-1 block text-sm font-medium text-gray-700">SMTP Host</label>
              <input
                type="text"
                value={form.host}
                onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))}
                placeholder="smtp.gmail.com"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Port</label>
              <select
                value={form.port}
                onChange={(e) => setForm((f) => ({ ...f, port: parseInt(e.target.value), secure: parseInt(e.target.value) === 465 }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value={587}>587 (TLS/STARTTLS)</option>
                <option value={465}>465 (SSL)</option>
                <option value={25}>25 (SMTP)</option>
                <option value={2525}>2525 (Alt)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <input
              type="checkbox"
              id="secure"
              checked={form.secure}
              onChange={(e) => setForm((f) => ({ ...f, secure: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
            />
            <label htmlFor="secure" className="text-sm font-medium text-gray-700">
              Use SSL/TLS (auto-set for port 465)
            </label>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Username / Email</label>
            <input
              type="text"
              value={form.user}
              onChange={(e) => setForm((f) => ({ ...f, user: e.target.value }))}
              placeholder="your@gmail.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Password / App Password
              <span className="ml-1 font-normal text-gray-400">(leave blank to keep existing)</span>
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={form.pass}
                onChange={(e) => setForm((f) => ({ ...f, pass: e.target.value }))}
                placeholder={hasConfig ? '••••••••' : 'Enter password or app password'}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">From Name & Email</label>
            <input
              type="text"
              value={form.from}
              onChange={(e) => setForm((f) => ({ ...f, from: e.target.value }))}
              placeholder='EMAS <noreply@yourdomain.com>'
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <p className="mt-1 text-xs text-gray-400">Format: Name {'<email@domain.com>'}</p>
          </div>
        </div>

        <div className="border-t border-gray-100 px-6 py-4 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 disabled:opacity-60 transition-colors"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Test Email */}
      {hasConfig && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="font-semibold text-gray-800">Send Test Email</h2>
            <p className="mt-0.5 text-sm text-gray-500">Verify your SMTP configuration by sending a test email.</p>
          </div>
          <div className="flex gap-3 p-6">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="recipient@example.com"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || !testEmail}
              className="flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {testing ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              {testing ? 'Sending...' : 'Send Test'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
