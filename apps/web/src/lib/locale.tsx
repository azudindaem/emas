'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import ms from './translations/ms'
import en from './translations/en'
import type { Translations } from './translations/ms'

export type Locale = 'ms' | 'en'

const LOCALES: Record<Locale, Translations> = { ms, en }
const STORAGE_KEY = 'emas_locale'
const DEFAULT_LOCALE: Locale = 'en'

interface LocaleContextType {
  locale: Locale
  setLocale: (l: Locale) => void
  t: Translations
}

const LocaleContext = createContext<LocaleContextType | null>(null)

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null
    if (stored && stored in LOCALES) setLocaleState(stored)
  }, [])

  const setLocale = (l: Locale) => {
    localStorage.setItem(STORAGE_KEY, l)
    setLocaleState(l)
    // Update html lang attribute
    document.documentElement.lang = l
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t: LOCALES[locale] }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be inside LocaleProvider')
  return ctx
}
