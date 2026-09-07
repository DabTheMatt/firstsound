export const A11Y_STORAGE_KEY = 'field.a11y'

export type A11ySettings = {
  reduceMotion: boolean
  largerInterface: boolean
  enhancedFocus: boolean
  showDescriptions: boolean
  screenReaderOptimizations: boolean
  shortcutsEnabled: boolean
}

export const DEFAULT_A11Y_SETTINGS: A11ySettings = {
  reduceMotion: false,
  largerInterface: false,
  enhancedFocus: false,
  showDescriptions: true,
  screenReaderOptimizations: false,
  shortcutsEnabled: true,
}

export function parseA11ySettings(raw: unknown): A11ySettings {
  const next = { ...DEFAULT_A11Y_SETTINGS }
  if (!raw || typeof raw !== 'object') return next
  const rec = raw as Record<string, unknown>
  for (const key of Object.keys(next) as (keyof A11ySettings)[]) {
    if (typeof rec[key] === 'boolean') next[key] = rec[key]
  }
  return next
}

export function readStoredA11ySettings(): A11ySettings {
  try {
    const raw = localStorage.getItem(A11Y_STORAGE_KEY)
    return parseA11ySettings(raw ? JSON.parse(raw) : null)
  } catch {
    return { ...DEFAULT_A11Y_SETTINGS }
  }
}

export function persistA11ySettings(settings: A11ySettings): void {
  try {
    localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify(settings))
  } catch {
    /* private mode */
  }
}

export function applyA11yDom(settings: A11ySettings): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.dataset.reduceMotion = settings.reduceMotion ? 'on' : 'off'
  root.dataset.uiScale = settings.largerInterface ? 'large' : 'normal'
  root.dataset.focus = settings.enhancedFocus ? 'enhanced' : 'default'
  root.dataset.a11yTips = settings.showDescriptions ? 'on' : 'off'
  root.dataset.srOpt = settings.screenReaderOptimizations ? 'on' : 'off'
  root.dataset.shortcuts = settings.shortcutsEnabled ? 'on' : 'off'
}

export function systemPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function motionReduced(settings: A11ySettings): boolean {
  return settings.reduceMotion || systemPrefersReducedMotion()
}
