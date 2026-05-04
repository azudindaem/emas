'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth, setToken } from '@/lib/api'
import { Eye, EyeOff, Mail, KeyRound, User, Loader2, CheckCircle2, ArrowRight } from 'lucide-react'

type Step = 'email' | 'tac' | 'details'

export default function RegisterPage() {
  const router = useRouter()

  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [tac, setTac] = useState('')
  const [form, setForm] = useState({ name: '', password: '', passwordConfirm: '' })
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)

  function startCountdown() {
    setCountdown(60)
    const t = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(t); return 0 }
        return c - 1
      })
    }, 1000)
  }

  async function handleSendTac(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await auth.sendTac(email)
      setStep('tac')
      startCountdown()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal hantar kod TAC')
    } finally {
      setLoading(false)
    }
  }

  async function handleResendTac() {
    if (countdown > 0) return
    setError('')
    setLoading(true)
    try {
      await auth.sendTac(email)
      startCountdown()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal hantar semula')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyTac(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await auth.verifyTac(email, tac)
      setStep('details')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kod TAC tidak sah')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (form.password !== form.passwordConfirm) {
      setError('Kata laluan tidak sepadan')
      return
    }
    setLoading(true)
    try {
      const res = await auth.register({ ...form, email, tac })
      setToken(res.accessToken)
      const u = res.user ?? (() => {
        const payload = JSON.parse(atob(res.accessToken.split('.')[1])) as { sub: string }
        return { id: payload.sub, name: form.name, email }
      })()
      localStorage.setItem('emas_user', JSON.stringify(u))
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pendaftaran gagal')
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    { key: 'email', label: 'E-mel', icon: Mail },
    { key: 'tac', label: 'Pengesahan', icon: KeyRound },
    { key: 'details', label: 'Maklumat', icon: User },
  ]
  const currentIdx = steps.findIndex((s) => s.key === step)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-10">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-black font-bold">E</div>
            <div>
              <p className="font-bold text-gray-900 text-lg leading-tight">emas.my</p>
              <p className="text-xs text-gray-400">Daftar akaun baru</p>
            </div>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-1 mb-8">
            {steps.map((s, i) => {
              const done = i < currentIdx
              const active = i === currentIdx
              const Icon = s.icon
              return (
                <div key={s.key} className="flex items-center flex-1">
                  <div className={`flex items-center gap-1.5 flex-1 ${i < steps.length - 1 ? 'after:flex-1 after:h-px after:mx-1' : ''}`}
                    style={{ '--tw-content': '""' } as React.CSSProperties}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                      done ? 'bg-emerald-500 text-white' : active ? 'bg-amber-400 text-black' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {done ? <CheckCircle2 size={14} /> : <Icon size={14} />}
                    </div>
                    <span className={`text-xs font-medium hidden sm:block ${active ? 'text-gray-800' : done ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {s.label}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`flex-1 h-px mx-2 ${i < currentIdx ? 'bg-emerald-300' : 'bg-gray-200'}`} />
                  )}
                </div>
              )
            })}
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>
          )}

          {/* STEP 1: Email */}
          {step === 'email' && (
            <>
              <h2 className="text-xl font-semibold text-gray-800 mb-1">Masukkan E-mel</h2>
              <p className="text-sm text-gray-500 mb-6">Kami akan hantar kod TAC untuk pengesahan</p>
              <form onSubmit={handleSendTac} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Alamat E-mel</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@syarikat.com"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary hover:bg-primary-dark text-black font-semibold rounded-lg text-sm transition-colors disabled:opacity-60"
                >
                  {loading ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
                  {loading ? 'Menghantar...' : 'Hantar Kod TAC'}
                </button>
              </form>
            </>
          )}

          {/* STEP 2: TAC */}
          {step === 'tac' && (
            <>
              <h2 className="text-xl font-semibold text-gray-800 mb-1">Masukkan Kod TAC</h2>
              <p className="text-sm text-gray-500 mb-1">Kod 6 digit telah dihantar ke</p>
              <p className="text-sm font-semibold text-gray-800 mb-6">{email}</p>
              <form onSubmit={handleVerifyTac} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kod TAC</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={tac}
                    onChange={(e) => setTac(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg text-center text-2xl font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  <p className="mt-1.5 text-xs text-gray-400">Kod sah selama 10 minit</p>
                </div>
                <button
                  type="submit"
                  disabled={loading || tac.length < 6}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary hover:bg-primary-dark text-black font-semibold rounded-lg text-sm transition-colors disabled:opacity-60"
                >
                  {loading ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  {loading ? 'Mengesahkan...' : 'Sahkan Kod'}
                </button>
              </form>
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={handleResendTac}
                  disabled={countdown > 0 || loading}
                  className="text-sm text-gray-500 hover:text-primary disabled:opacity-50"
                >
                  {countdown > 0 ? `Hantar semula dalam ${countdown}s` : 'Hantar semula kod TAC'}
                </button>
              </div>
              <div className="mt-2 text-center">
                <button
                  type="button"
                  onClick={() => { setStep('email'); setTac(''); setError('') }}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Tukar e-mel
                </button>
              </div>
            </>
          )}

          {/* STEP 3: Details */}
          {step === 'details' && (
            <>
              <h2 className="text-xl font-semibold text-gray-800 mb-1">Lengkapkan Maklumat</h2>
              <p className="text-sm text-gray-500 mb-6">Sedikit lagi untuk selesaikan pendaftaran</p>
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Penuh</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Ahmad bin Ali"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kata Laluan</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      placeholder="Min. 8 aksara"
                      className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sahkan Kata Laluan</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={form.passwordConfirm}
                      onChange={(e) => setForm((f) => ({ ...f, passwordConfirm: e.target.value }))}
                      placeholder="Masukkan semula kata laluan"
                      className={`w-full px-3 py-2.5 pr-10 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
                        form.passwordConfirm && form.password !== form.passwordConfirm
                          ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                      {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {form.passwordConfirm && form.password !== form.passwordConfirm && (
                    <p className="mt-1 text-xs text-red-500">Kata laluan tidak sepadan</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={loading || (form.password !== form.passwordConfirm && !!form.passwordConfirm)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary hover:bg-primary-dark text-black font-semibold rounded-lg text-sm transition-colors disabled:opacity-60"
                >
                  {loading ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  {loading ? 'Mendaftar...' : 'Daftar Sekarang'}
                </button>
              </form>
            </>
          )}

          <p className="mt-6 text-center text-xs text-gray-400">
            Sudah ada akaun?{' '}
            <a href="/login" className="text-primary hover:underline">Log masuk</a>
          </p>
        </div>
      </div>
    </div>
  )
}
