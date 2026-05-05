'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    const saved = localStorage.getItem('emas_sidebar_collapsed')
    if (saved === '1') setSidebarCollapsed(true)
  }, [])

  const handleToggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('emas_sidebar_collapsed', next ? '1' : '0')
      return next
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <img src="/logo.svg" alt="Emas" className="w-10 h-10 mx-auto mb-3 animate-pulse" />
          <p className="text-sm text-gray-500">Memuatkan...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar collapsed={sidebarCollapsed} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header sidebarCollapsed={sidebarCollapsed} onToggleSidebar={handleToggleSidebar} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
