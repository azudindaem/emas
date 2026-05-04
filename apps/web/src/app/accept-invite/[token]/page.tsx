'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { team as teamApi } from '@/lib/api'
import { useLocale } from '@/lib/locale'
import { Eye, EyeOff } from 'lucide-react'

type InviteInfo = {
  email: string
  role: string
  tenantName: string
  expiresAt: string
}

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const { t } = useLocale()
  const at = t.team.acceptInvite

  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) return
    teamApi.getInvite(token)
      .then(setInvite)
      .catch((e: Error) => setLoadError(e.message))
      .finally(() => setLoading(false))
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setFormError(at.passwordMismatch); return }
    if (password.length < 8) { setFormError('Kata laluan sekurang-kurangnya 8 aksara'); return }
    setFormError('')
    setSubmitting(true)
    try {
      await teamApi.acceptInvite(token, { name, password })
      setSuccess(true)
      setTimeout(() => router.push('/login'), 3000)
    } catch (e: unknown) {
      setFormError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center text-black font-bold text-lg">
              E
            </div>
            <div>
              <p className="font-bold text-gray-900 text-lg leading-tight">emas.my</p>
              <p className="text-xs text-gray-400">E-commerce Management System</p>
            </div>
          </div>

          {loading && (
            <div className="space-y-3">
              <div className="h-6 bg-gray-100 rounded animate-pulse" />
              <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
            </div>
          )}

          {!loading && loadError && (
            <div className="text-center space-y-3">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-800">{at.title}</h2>
              <p className="text-sm text-red-600">{loadError}</p>
            </div>
          )}

          {!loading && invite && !success && (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-1">{at.title}</h2>
                <p className="text-sm text-gray-500">
                  {at.subtitle} <span className="font-semibold text-gray-700">{invite.tenantName}</span>{' '}
                  {at.asRole} <span className="font-semibold text-amber-600">{invite.role}</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">{invite.email}</p>
              </div>

              {formError && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{at.yourName}</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ahmad bin Abdullah"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{at.password}</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{at.confirmPassword}</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      required
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-lg text-sm font-semibold transition-colors mt-2"
                >
                  {submitting ? at.joining : at.accept}
                </button>
              </form>
            </>
          )}

          {success && (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">{at.success}</h2>
                <p className="text-sm text-gray-400 mt-1">Mengalihkan ke halaman log masuk...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
