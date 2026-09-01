import { colorWithAlpha } from './cssColor'
import {
  parseThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ThemeId,
  type ThemePreference,
} from './tokens'

export type ThemeColors = {
  waveform: string
  waveformSecondary: string
  waveformSelected: string
  spectrum: string
  spectrumLine: string
  selection: string
  selectionBorder: string
  playhead: string
  eqCurve: string
  eqNode: string
  eqNodeSelected: string
  accent: string
  accentSoft: string
  borderSubtle: string
  textMuted: string
  textPrimary: string
  bgApp: string
}

const THEME_CHANGE = 'field-theme-change'
const QUERY = '(prefers-color-scheme: dark)'

let cached: ThemeColors | null = null
let media: MediaQueryList | null = null
let currentPreference: ThemePreference = 'studio-dark'

function prefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true
  return window.matchMedia(QUERY).matches
}

function readVar(styles: CSSStyleDeclaration, name: string): string {
  return styles.getPropertyValue(name).trim()
}

export function computeThemeColors(root: HTMLElement = document.documentElement): ThemeColors {
  const styles = getComputedStyle(root)
  const accentHover = readVar(styles, '--accent-primary-hover')
  return {
    waveform: readVar(styles, '--waveform-primary'),
    waveformSecondary: readVar(styles, '--waveform-secondary'),
    waveformSelected: readVar(styles, '--waveform-selected'),
    spectrum: readVar(styles, '--spectrum-fill'),
    spectrumLine: readVar(styles, '--spectrum-line'),
    selection: readVar(styles, '--selection-fill'),
    selectionBorder: readVar(styles, '--selection-border'),
    playhead: readVar(styles, '--playhead'),
    eqCurve: readVar(styles, '--eq-curve'),
    eqNode: readVar(styles, '--eq-node'),
    eqNodeSelected: accentHover || readVar(styles, '--eq-node'),
    accent: readVar(styles, '--accent-primary'),
    accentSoft: readVar(styles, '--accent-soft'),
    borderSubtle: readVar(styles, '--border-subtle'),
    textMuted: readVar(styles, '--text-muted'),
    textPrimary: readVar(styles, '--text-primary'),
    bgApp: readVar(styles, '--bg-app'),
  }
}

export function readThemeColors(): ThemeColors {
  if (cached) return cached
  cached = computeThemeColors()
  return cached
}

export function invalidateThemeColors(): void {
  cached = null
}

function syncMeta(theme: ThemeId, colors: ThemeColors): void {
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', colors.bgApp || (theme === 'light-studio' ? '#E7E7E3' : '#151616'))
}

export function applyResolvedTheme(theme: ThemeId): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme === 'light-studio' ? 'light' : 'dark'
  invalidateThemeColors()
  const colors = readThemeColors()
  syncMeta(theme, colors)
  document.dispatchEvent(new CustomEvent(THEME_CHANGE, { detail: { theme, preference: currentPreference } }))
}

export function applyThemePreference(preference: ThemePreference): ThemeId {
  currentPreference = preference
  const theme = resolveTheme(preference, prefersDark())
  applyResolvedTheme(theme)
  return theme
}

export function persistThemePreference(preference: ThemePreference): ThemeId {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    /* private mode */
  }
  return applyThemePreference(preference)
}

export function readStoredPreference(): ThemePreference {
  try {
    return parseThemePreference(localStorage.getItem(THEME_STORAGE_KEY))
  } catch {
    return 'studio-dark'
  }
}

export function getThemePreference(): ThemePreference {
  return currentPreference
}

export function subscribeThemeChange(onChange: () => void): () => void {
  const handler = () => onChange()
  document.addEventListener(THEME_CHANGE, handler)
  return () => document.removeEventListener(THEME_CHANGE, handler)
}

function onSchemeChange(): void {
  if (currentPreference !== 'system') return
  applyThemePreference('system')
}

export function bootstrapTheme(): ThemePreference {
  const preference = readStoredPreference()
  applyThemePreference(preference)
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    media?.removeEventListener('change', onSchemeChange)
    media = window.matchMedia(QUERY)
    media.addEventListener('change', onSchemeChange)
  }
  return preference
}

export { colorWithAlpha }
export type { ThemeId, ThemePreference }
