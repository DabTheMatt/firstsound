import type { Locale } from '../i18n/locale'

export const HELP_LEVEL_KEY = 'field.helpLevel'

export type HelpLevel = 'basic' | 'technical'

export function parseHelpLevel(raw: string | null | undefined): HelpLevel | null {
  if (raw === 'basic' || raw === 'technical') return raw
  return null
}

export function readHelpLevel(): HelpLevel {
  try {
    return parseHelpLevel(localStorage.getItem(HELP_LEVEL_KEY)) ?? 'basic'
  } catch {
    return 'basic'
  }
}

export function writeHelpLevel(level: HelpLevel): void {
  try {
    localStorage.setItem(HELP_LEVEL_KEY, level)
  } catch {
    /* private mode */
  }
}

export function localeFromDocument(lang: string | null | undefined): Locale {
  return lang === 'pl' ? 'pl' : 'en'
}
