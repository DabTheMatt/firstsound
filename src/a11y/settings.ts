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
  root.dataset.lowVision = settings.lowVision ? 'on' : 'off'
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
