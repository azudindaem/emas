import type { Metadata } from 'next'
import '../globals.css'

export const metadata: Metadata = {
  title: 'Emas — Platform Pengurusan Pesanan & Cetakan',
  description:
    'Platform SaaS all-in-one untuk urus pesanan, cetak AWB, dan integrasikan kurier kegemaran anda. NinjaVan, J&T, POS Malaysia & lebih lagi.',
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return children
}
