'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { auth, setToken, clearToken } from '@/lib/api'
import { LocaleProvider } from '@/lib/locale'

interface User {
  id: string
  name: string
  email: string
  firstName?: string | null
  lastName?: string | null
  phone?: string | null
  avatarUrl?: string | null
  role: {
    name: string
    level: number
    permissions: string[]
    isOwner: boolean
    isSuperAdmin: boolean
    isSystemOwner: boolean
  }
}

interface AuthContextType {
  user: User | null
  loading: boolean
  isOwner: boolean
  isSuperAdmin: boolean
  isSystemOwner: boolean
  login: (email: string, password: string) => Promise<void>
  devLogin: () => Promise<void>
  logout: () => void
  refreshMe: () => Promise<void>
  hasPermission: (perm: string) => boolean
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

  async function refreshMe() {
    const meData = await auth.me()
    const u: User = {
      id: meData.id,
      name: meData.name,
      email: meData.email,
      firstName: meData.firstName,
      lastName: meData.lastName,
      phone: meData.phone,
      avatarUrl: meData.avatarUrl,
      role: meData.role,
    }
    localStorage.setItem('emas_user', JSON.stringify(u))
    setUser(u)
  }

  async function login(email: string, password: string) {
    const res = await auth.login({ email, password })
    setToken(res.accessToken)
    await refreshMe()
  }

  async function devLogin() {
    const res = await auth.devLogin()
    setToken(res.accessToken)
    await refreshMe()
  }

  function logout() {
    clearToken()
    setUser(null)
    window.location.href = '/login'
  }

  function hasPermission(perm: string): boolean {
    if (!user) return false
    if (user.role.isOwner || user.role.isSuperAdmin) return true
    return user.role.permissions?.includes(perm) ?? false
  }

  const isOwner = user?.role?.isOwner ?? false
  const isSuperAdmin = user?.role?.isSuperAdmin ?? false
  const isSystemOwner = isSuperAdmin  // strictly platform admin, NOT subscriber owners

  return (
    <LocaleProvider>
      <AuthContext.Provider value={{ user, loading, isOwner, isSuperAdmin, isSystemOwner, login, devLogin, logout, refreshMe, hasPermission }}>
        {children}
      </AuthContext.Provider>
    </LocaleProvider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
