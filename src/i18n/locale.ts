export const UI_LOCALE_STORAGE_KEY = 'field.uiLocale'

export const LOCALES = ['en', 'pl'] as const

export type Locale = (typeof LOCALES)[number]
export type LocalizedText = Record<Locale, string>

export function parseLocale(raw: string | null | undefined): Locale | null {
  if (!raw) return null
  const value = raw.trim().toLowerCase()
  if (value === 'en' || value.startsWith('en-')) return 'en'
  if (value === 'pl' || value.startsWith('pl-')) return 'pl'
  return null
}

/** No stored preference stays English. The browser language does not force Polish. */
export function detectBrowserLocale(_language: string | null | undefined): Locale {
  return 'en'
}

export function readStoredLocale(): Locale | null {
  try {
    return parseLocale(localStorage.getItem(UI_LOCALE_STORAGE_KEY))
  } catch {
    return null
  }
}

export function persistLocale(locale: Locale): void {
  try {
    localStorage.setItem(UI_LOCALE_STORAGE_KEY, locale)
  } catch {
    /* private mode */
  }
}

export function applyDocumentLocale(locale: Locale): void {
  if (typeof document === 'undefined') return
  document.documentElement.lang = locale === 'pl' ? 'pl' : 'en'
}

export function initialLocale(): Locale {
  return readStoredLocale() ?? 'en'
}
