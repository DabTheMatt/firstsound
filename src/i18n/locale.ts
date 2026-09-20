export const UI_LOCALE_STORAGE_KEY = 'field.uiLocale'

export const LOCALES = ['en', 'pl'] as const

export type Locale = (typeof LOCALES)[number]
export type LocalizedText = Record<Locale, string>

export function parseLocale(raw: string | null | undefined): Locale | null {
  if (raw === 'en' || raw === 'pl') return 'en'
  return null
}

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
  document.documentElement.lang = locale
}

export function initialLocale(): Locale {
  return 'en'
}
