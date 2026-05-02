'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { auth, setToken, clearToken } from '@/lib/api'
import { LocaleProvider } from '@/lib/locale'

interface User {
  id: string
  name: string
  email: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('emas_user')
    const token = localStorage.getItem('emas_token')
    if (stored && token) {
      try {
        setUser(JSON.parse(stored) as User)
      } catch {
        clearToken()
      }
    }
    setLoading(false)
  }, [])

  async function login(email: string, password: string) {
    const res = await auth.login({ email, password })
    setToken(res.accessToken)
    // Decode JWT payload to get user id if user object not returned
    let u: User
    if (res.user && (res.user as Record<string, unknown>).id) {
      u = res.user as unknown as User
    } else {
      const payload = JSON.parse(atob(res.accessToken.split('.')[1])) as { sub: string }
      u = { id: payload.sub, name: email.split('@')[0], email }
    }
    localStorage.setItem('emas_user', JSON.stringify(u))
    setUser(u)
  }

  function logout() {
    clearToken()
    setUser(null)
    window.location.href = '/login'
  }

  return <LocaleProvider><AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider></LocaleProvider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
