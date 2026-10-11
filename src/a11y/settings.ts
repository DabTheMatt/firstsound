/** Versioned store. Legacy `field.a11y` is read once and kept in sync. */
export const A11Y_STORAGE_KEY_V1 = 'field.accessibility.v1'

export const A11Y_STORAGE_KEY = 'field.a11y'

/** Reliable step for both sliders. Presets sit on this grid. */
export const SCALE_STEP = 0.05

export const INTERFACE_SCALE_MIN = 1
export const INTERFACE_SCALE_MAX = 1.5
export const TEXT_SCALE_MIN = 1
export const TEXT_SCALE_MAX = 2

export const INTERFACE_SCALE_PRESETS = [1, 1.1, 1.25, 1.5] as const
export const TEXT_SCALE_PRESETS = [1, 1.25, 1.5, 1.75, 2] as const

export type A11ySettings = {
  lowVision: boolean
  reduceMotion: boolean
  largerInterface: boolean
  enhancedFocus: boolean
  showDescriptions: boolean
  screenReaderOptimizations: boolean
  shortcutsEnabled: boolean
  /** Shows non-dragging editors. Does not turn off existing keyboard access. */
  dragFreeEditing: boolean
  /** Extra navigation tools and editors. Keyboard access stays on when this is off. */
  keyboardFirst: boolean
  /** Visual size of controls and surrounding chrome. 1 = 100%. */
  interfaceScale: number
  /** Type size. Independent of interfaceScale. 1 = 100%. */
  textScale: number
  /** Shows landmark and time tools. Keyboard and screen reader access stay on when this is off. */
  accessibleWaveform: boolean
}

export const DEFAULT_A11Y_SETTINGS: A11ySettings = {
  lowVision: false,
  reduceMotion: false,
  largerInterface: false,
  enhancedFocus: false,
  showDescriptions: true,
  screenReaderOptimizations: false,
  shortcutsEnabled: true,
  dragFreeEditing: false,
  keyboardFirst: false,
  interfaceScale: 1,
  textScale: 1,
  accessibleWaveform: false,
}

const BOOLEAN_KEYS = [
  'lowVision',
  'reduceMotion',
  'largerInterface',
  'enhancedFocus',
  'showDescriptions',
  'screenReaderOptimizations',
  'shortcutsEnabled',
  'dragFreeEditing',
  'keyboardFirst',
  'accessibleWaveform',
] as const satisfies readonly (keyof A11ySettings)[]

/** Snap to the 5% grid and keep the value inside the supported range. */
export function clampScale(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  const snapped = Math.round(value / SCALE_STEP) * SCALE_STEP
  const clamped = Math.min(max, Math.max(min, snapped))
  return Math.round(clamped * 100) / 100
}

function readScale(raw: unknown, min: number, max: number): number {
  const value = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() ? Number(raw) : Number.NaN
  return clampScale(value, min, max)
}

export function parseA11ySettings(raw: unknown): A11ySettings {
  const next = { ...DEFAULT_A11Y_SETTINGS }
  if (!raw || typeof raw !== 'object') return next
  const rec = raw as Record<string, unknown>
  for (const key of BOOLEAN_KEYS) {
    if (typeof rec[key] === 'boolean') next[key] = rec[key]
  }
  if ('interfaceScale' in rec) next.interfaceScale = readScale(rec.interfaceScale, INTERFACE_SCALE_MIN, INTERFACE_SCALE_MAX)
  if ('textScale' in rec) next.textScale = readScale(rec.textScale, TEXT_SCALE_MIN, TEXT_SCALE_MAX)
  return next
}

export function formatScale(value: number): string {
  return String(Math.round(value * 100) / 100)
}

export function scalePercent(value: number): number {
  return Math.round(value * 100)
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

let appliedSettings: A11ySettings = { ...DEFAULT_A11Y_SETTINGS }

/** Last settings written onto the document. Animation loops read this instead of localStorage. */
export function appliedA11ySettings(): A11ySettings {
  return appliedSettings
}

/** FIELD preference or the operating-system preference, whichever asks for less motion. */
export function effectiveMotionReduced(): boolean {
  return appliedSettings.reduceMotion || systemPrefersReducedMotion()
}

export function applyA11yDom(settings: A11ySettings): void {
  appliedSettings = settings
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
  root.dataset.dragFree = settings.dragFreeEditing ? 'on' : 'off'
  root.dataset.keyboardFirst = settings.keyboardFirst ? 'on' : 'off'
  root.dataset.waveNav = settings.accessibleWaveform ? 'on' : 'off'
  const interfaceScale = clampScale(settings.interfaceScale, INTERFACE_SCALE_MIN, INTERFACE_SCALE_MAX)
  const textScale = clampScale(settings.textScale, TEXT_SCALE_MIN, TEXT_SCALE_MAX)
  root.style.setProperty('--field-interface-scale', formatScale(interfaceScale))
  root.style.setProperty('--field-text-scale', formatScale(textScale))
  root.dataset.interfaceScale = String(scalePercent(interfaceScale))
  root.dataset.textScale = String(scalePercent(textScale))
  root.dataset.textRoom = textScale >= 1.75 ? 'max' : textScale > 1 ? 'room' : 'base'
  root.dataset.interfaceRoom = interfaceScale >= 1.25 ? 'room' : 'base'
  root.dataset.layoutRoom = textScale > 1 || interfaceScale >= 1.25 ? 'open' : 'closed'
}

/** Drag-free editors and chain move buttons. Either preference is enough. */
export function assistedEditorsEnabled(settings: Pick<A11ySettings, 'dragFreeEditing' | 'keyboardFirst'>): boolean {
  return settings.dragFreeEditing || settings.keyboardFirst
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
