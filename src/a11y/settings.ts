/** Versioned store. Legacy `field.a11y` is read once and kept in sync. */
export const A11Y_STORAGE_KEY_V1 = 'field.accessibility.v1'

export const A11Y_STORAGE_KEY = 'field.a11y'

export type A11ySettings = {
  lowVision: boolean
  reduceMotion: boolean
  largerInterface: boolean
  enhancedFocus: boolean
  showDescriptions: boolean
  screenReaderOptimizations: boolean
  shortcutsEnabled: boolean
}

export const DEFAULT_A11Y_SETTINGS: A11ySettings = {
  lowVision: false,
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

function readStorageKey(key: string): A11ySettings | undefined {
  if (typeof localStorage === 'undefined') return undefined
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) return undefined
    return parseA11ySettings(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_A11Y_SETTINGS }
  }
}

export function readStoredA11ySettings(): A11ySettings {
  const current = readStorageKey(A11Y_STORAGE_KEY_V1)
  if (current) return current
  const legacy = readStorageKey(A11Y_STORAGE_KEY)
  if (legacy) return legacy
  return { ...DEFAULT_A11Y_SETTINGS }
}

export function persistA11ySettings(settings: A11ySettings): void {
  if (typeof localStorage === 'undefined') return
  const body = JSON.stringify(settings)
  try {
    localStorage.setItem(A11Y_STORAGE_KEY_V1, JSON.stringify({ ...settings, version: 1 }))
  } catch {
    /* private mode */
  }
  try {
    localStorage.setItem(A11Y_STORAGE_KEY, body)
  } catch {
    /* private mode */
  }
}

export function migrateLegacyLowVisionTheme(): boolean {
  try {
    if (localStorage.getItem('field.theme') !== 'low-vision') return false
    localStorage.setItem('field.theme', 'studio-dark')
    return true
  } catch {
    return false
  }
}

const LOW_VISION_INLINE: Record<string, string> = {
  '--bg-app': '#000000',
  '--bg-panel': '#121212',
  '--bg-panel-elevated': '#1a1a1a',
  '--bg-control': '#242424',
  '--bg-control-hover': '#333333',
  '--bg-control-active': '#3a3300',
  '--border-subtle': '#3a3a3a',
  '--border-default': '#7a7a7a',
  '--border-strong': '#e8e8e8',
  '--text-primary': '#ffffff',
  '--text-secondary': '#e8e8e8',
  '--text-muted': '#d0d0d0',
  '--text-disabled': '#a0a0a0',
  '--text-on-accent': '#000000',
  '--accent-primary': '#ffe600',
  '--accent-primary-hover': '#fff36b',
  '--accent-secondary': '#00e5ff',
  '--accent-soft': 'rgba(255, 230, 0, 0.18)',
  '--waveform-primary': '#ffffff',
  '--waveform-secondary': '#c8c8c8',
  '--waveform-selected': '#ffe600',
  '--selection-fill': 'rgba(255, 230, 0, 0.28)',
  '--selection-border': '#ffe600',
  '--playhead': '#00e5ff',
  '--spectrum-fill': '#7dff7a',
  '--spectrum-line': '#c8ffc6',
}

function applyLowVisionInline(root: HTMLElement, on: boolean): void {
  for (const [name, value] of Object.entries(LOW_VISION_INLINE)) {
    if (on) root.style.setProperty(name, value)
    else root.style.removeProperty(name)
  }
}

export function applyA11yDom(settings: A11ySettings): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  applyLowVisionInline(root, settings.lowVision)
  const reduced = motionReduced(settings)
  root.dataset.lowVision = settings.lowVision ? 'on' : 'off'
  root.dataset.reduceMotion = reduced ? 'on' : 'off'
  root.dataset.reducedMotion = reduced ? 'true' : 'false'
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

/** User preference or the operating-system request. The toggle cannot override the system. */
export function motionReduced(settings: A11ySettings, system = systemPrefersReducedMotion()): boolean {
  return settings.reduceMotion || system
}

/** DOM attribute written by `applyA11yDom`, so canvas loops share one answer. */
export function effectiveReducedMotion(): boolean {
  if (typeof document !== 'undefined') {
    const flag = document.documentElement.dataset.reduceMotion
    if (flag === 'on') return true
    if (flag === 'off') return false
  }
  return motionReduced(readStoredA11ySettings())
}

export function largerControlsEnabled(): boolean {
  if (typeof document === 'undefined') return false
  return document.documentElement.dataset.uiScale === 'large'
}
