'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { auth, setToken, clearToken } from '@/lib/api'
import { LocaleProvider } from '@/lib/locale'

interface User {
  id: string
  name: string
  email: string
  role: {
    name: string
    level: number
    isOwner: boolean
  }
}

interface AuthContextType {
  user: User | null
  loading: boolean
  isOwner: boolean
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
    const meData = await auth.me()
    const u: User = {
      id: meData.id,
      name: meData.name,
      email: meData.email,
      role: meData.role,
    }
    localStorage.setItem('emas_user', JSON.stringify(u))
    setUser(u)
  }

  function logout() {
    clearToken()
    setUser(null)
    window.location.href = '/login'
  }

  return <LocaleProvider><AuthContext.Provider value={{ user, loading, isOwner: user?.role?.isOwner ?? false, login, logout }}>{children}</AuthContext.Provider></LocaleProvider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
