'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth, setToken } from '@/lib/api'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function set(field: string, val: string) {
    setForm((prev) => ({ ...prev, [field]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await auth.register(form)
      setToken(res.accessToken)
      const u = res.user ?? (() => {
        const payload = JSON.parse(atob(res.accessToken.split('.')[1])) as { sub: string }
        return { id: payload.sub, name: form.name, email: form.email }
      })()
      localStorage.setItem('emas_user', JSON.stringify(u))
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pendaftaran gagal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-black font-bold">E</div>
            <div>
              <p className="font-bold text-gray-900 text-lg leading-tight">emas.my</p>
              <p className="text-xs text-gray-400">Daftar akaun baru</p>
            </div>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-1">Buat Akaun</h2>
          <p className="text-sm text-gray-500 mb-6">Lengkapkan maklumat di bawah</p>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { field: 'name', label: 'Nama Penuh', type: 'text', placeholder: 'Ahmad bin Ali' },
              { field: 'email', label: 'E-mel', type: 'email', placeholder: 'nama@syarikat.com' },
              { field: 'password', label: 'Kata Laluan', type: 'password', placeholder: '••••••••' },
            ].map(({ field, label, type, placeholder }) => (
              <div key={field}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input
                  type={type}
                  required
                  value={form[field as keyof typeof form]}
                  onChange={(e) => set(field, e.target.value)}
                  placeholder={placeholder}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            ))}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-primary hover:bg-primary-dark text-black font-semibold rounded-lg text-sm transition-colors disabled:opacity-60"
            >
              {loading ? 'Mendaftar...' : 'Daftar Sekarang'}
            </button>
          </form>
          <p className="mt-6 text-center text-xs text-gray-400">
            Sudah ada akaun?{' '}
            <a href="/login" className="text-primary hover:underline">Log masuk</a>
          </p>
        </div>
      </div>
    </div>
  )
}
