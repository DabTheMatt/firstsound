import { colorWithAlpha, isDarkColor, mixCssColor, toCssHex } from './cssColor'
import {
  CUSTOM_THEME_STORAGE_KEY,
  DEFAULT_CUSTOM_COLORS,
  isUserThemePreference,
  MAX_SAVED_THEMES,
  nextSavedThemeName,
  parseCustomThemeColors,
  parseSavedThemes,
  parseThemePreference,
  resolveTheme,
  SAVED_THEMES_STORAGE_KEY,
  THEME_STORAGE_KEY,
  userThemeId,
  userThemePreference,
  type CustomColorId,
  type CustomThemeColors,
  type SavedTheme,
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
let currentCustom: CustomThemeColors = { ...DEFAULT_CUSTOM_COLORS }
let savedThemes: SavedTheme[] = []

const CUSTOM_STYLE_PROPS = [
  '--bg-app',
  '--bg-panel',
  '--bg-panel-elevated',
  '--bg-control',
  '--bg-control-hover',
  '--bg-control-active',
  '--border-subtle',
  '--border-default',
  '--border-strong',
  '--text-primary',
  '--text-secondary',
  '--text-muted',
  '--text-disabled',
  '--text-on-accent',
  '--accent-primary',
  '--accent-primary-hover',
  '--accent-secondary',
  '--accent-soft',
  '--waveform-primary',
  '--waveform-secondary',
  '--waveform-selected',
  '--selection-fill',
  '--selection-border',
  '--playhead',
  '--spectrum-fill',
  '--spectrum-line',
  '--eq-curve',
  '--eq-node',
  '--envelope',
  '--scrim',
] as const

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

function clearCustomCss(root: HTMLElement): void {
  for (const name of CUSTOM_STYLE_PROPS) root.style.removeProperty(name)
}

function applyCustomCss(root: HTMLElement, custom: CustomThemeColors): void {
  const dark = isDarkColor(custom.bgApp)
  const ink = dark ? '#e8e6df' : '#202321'
  const paper = dark ? '#050606' : '#f8f8f5'
  const text = custom.textPrimary
  root.style.setProperty('--bg-app', custom.bgApp)
  root.style.setProperty('--bg-panel', custom.bgPanel)
  root.style.setProperty('--bg-panel-elevated', custom.bgElevated)
  root.style.setProperty('--bg-control', mixCssColor(custom.bgElevated, text, dark ? 0.12 : 0.1))
  root.style.setProperty('--bg-control-hover', mixCssColor(custom.bgElevated, text, dark ? 0.2 : 0.16))
  root.style.setProperty('--bg-control-active', mixCssColor(custom.bgElevated, custom.accent, 0.22))
  root.style.setProperty('--border-subtle', mixCssColor(custom.bgPanel, text, 0.12))
  root.style.setProperty('--border-default', mixCssColor(custom.bgPanel, text, 0.22))
  root.style.setProperty('--border-strong', mixCssColor(custom.bgPanel, text, 0.38))
  root.style.setProperty('--text-primary', text)
  root.style.setProperty('--text-secondary', mixCssColor(text, custom.bgApp, 0.28))
  root.style.setProperty('--text-muted', mixCssColor(text, custom.bgApp, 0.48))
  root.style.setProperty('--text-disabled', mixCssColor(text, custom.bgApp, 0.64))
  root.style.setProperty('--text-on-accent', isDarkColor(custom.accent) ? ink : paper)
  root.style.setProperty('--accent-primary', custom.accent)
  root.style.setProperty('--accent-primary-hover', mixCssColor(custom.accent, paper, 0.22))
  root.style.setProperty('--accent-secondary', mixCssColor(custom.accent, custom.bgApp, 0.28))
  root.style.setProperty('--accent-soft', colorWithAlpha(custom.accent, 0.15))
  root.style.setProperty('--waveform-primary', custom.waveform)
  root.style.setProperty('--waveform-secondary', mixCssColor(custom.waveform, custom.bgApp, 0.35))
  root.style.setProperty('--waveform-selected', mixCssColor(custom.waveform, custom.accent, 0.35))
  root.style.setProperty('--selection-fill', colorWithAlpha(custom.selection, 0.2))
  root.style.setProperty('--selection-border', custom.selection)
  root.style.setProperty('--playhead', custom.playhead)
  root.style.setProperty('--spectrum-fill', custom.spectrum)
  root.style.setProperty('--spectrum-line', mixCssColor(custom.spectrum, paper, 0.35))
  root.style.setProperty('--eq-curve', custom.accent)
  root.style.setProperty('--eq-node', mixCssColor(custom.accent, paper, 0.2))
  root.style.setProperty('--envelope', mixCssColor('#5ec8c0', custom.accent, 0.28))
  root.style.setProperty('--scrim', colorWithAlpha(custom.bgApp, 0.55))
}

export function applyResolvedTheme(theme: ThemeId): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.dataset.theme = theme
  const dark = theme === 'light-studio' ? false : theme === 'custom' ? isDarkColor(currentCustom.bgApp) : true
  root.style.colorScheme = dark ? 'dark' : 'light'
  if (theme === 'custom') applyCustomCss(root, currentCustom)
  else clearCustomCss(root)
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
  if (preference === 'custom' && currentPreference !== 'custom') {
    snapshotThemeToCustom()
  }
  const userId = userThemeId(preference)
  if (userId) {
    const saved = savedThemes.find((t) => t.id === userId)
    if (!saved) return applyThemePreference(currentPreference)
    currentCustom = { ...saved.colors }
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    /* private mode */
  }
  return applyThemePreference(preference)
}

export function readStoredCustomColors(): CustomThemeColors {
  try {
    const raw = localStorage.getItem(CUSTOM_THEME_STORAGE_KEY)
    return parseCustomThemeColors(raw ? JSON.parse(raw) : null)
  } catch {
    return { ...DEFAULT_CUSTOM_COLORS }
  }
}

export function persistCustomThemeColors(colors: CustomThemeColors): CustomThemeColors {
  currentCustom = parseCustomThemeColors(colors)
  try {
    localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, JSON.stringify(currentCustom))
  } catch {
    /* private mode */
  }
  if (currentPreference === 'custom' || isUserThemePreference(currentPreference)) applyResolvedTheme('custom')
  else {
    document.dispatchEvent(
      new CustomEvent(THEME_CHANGE, {
        detail: { theme: resolveTheme(currentPreference, prefersDark()), preference: currentPreference },
      }),
    )
  }
  return currentCustom
}

export function getCustomThemeColors(): CustomThemeColors {
  return { ...currentCustom }
}

export function customColorsFromComputed(colors: {
  bgApp: string
  textPrimary: string
  accent: string
  waveform: string
  spectrum: string
  playhead: string
  selectionBorder: string
}): CustomThemeColors {
  return parseCustomThemeColors({
    bgApp: toCssHex(colors.bgApp) ?? DEFAULT_CUSTOM_COLORS.bgApp,
    bgPanel: mixCssColor(colors.bgApp, colors.textPrimary, 0.06),
    bgElevated: mixCssColor(colors.bgApp, colors.textPrimary, 0.12),
    textPrimary: toCssHex(colors.textPrimary) ?? DEFAULT_CUSTOM_COLORS.textPrimary,
    accent: toCssHex(colors.accent) ?? DEFAULT_CUSTOM_COLORS.accent,
    waveform: toCssHex(colors.waveform) ?? DEFAULT_CUSTOM_COLORS.waveform,
    spectrum: toCssHex(colors.spectrum) ?? DEFAULT_CUSTOM_COLORS.spectrum,
    playhead: toCssHex(colors.playhead) ?? DEFAULT_CUSTOM_COLORS.playhead,
    selection: toCssHex(colors.selectionBorder) ?? DEFAULT_CUSTOM_COLORS.selection,
  })
}

export function snapshotThemeToCustom(): CustomThemeColors {
  return persistCustomThemeColors(customColorsFromComputed(computeThemeColors()))
}

export function setCustomThemeColor(id: CustomColorId, value: string): CustomThemeColors {
  const next = persistCustomThemeColors({ ...currentCustom, [id]: value })
  const editingId = userThemeId(currentPreference)
  if (editingId) {
    savedThemes = savedThemes.map((t) => (t.id === editingId ? { ...t, colors: next } : t))
    persistSavedThemes()
  }
  return next
}

function persistSavedThemes(): void {
  try {
    localStorage.setItem(SAVED_THEMES_STORAGE_KEY, JSON.stringify(savedThemes))
  } catch {
    /* private mode */
  }
}

export function readStoredSavedThemes(): SavedTheme[] {
  try {
    const raw = localStorage.getItem(SAVED_THEMES_STORAGE_KEY)
    return parseSavedThemes(raw ? JSON.parse(raw) : null)
  } catch {
    return []
  }
}

export function getSavedThemes(): SavedTheme[] {
  return savedThemes.map((t) => ({ ...t, colors: { ...t.colors } }))
}

export function saveCurrentAsTheme(name?: string): SavedTheme | null {
  const trimmed = (name ?? nextSavedThemeName(savedThemes)).trim().slice(0, 40)
  if (!trimmed) return null
  const theme: SavedTheme = {
    id: `s${Date.now().toString(36)}`,
    name: nextSavedThemeName(savedThemes, trimmed),
    colors: { ...currentCustom },
  }
  savedThemes = [theme, ...savedThemes].slice(0, MAX_SAVED_THEMES)
  persistSavedThemes()
  persistThemePreference(userThemePreference(theme.id))
  return theme
}

export function deleteSavedTheme(id: string): void {
  savedThemes = savedThemes.filter((t) => t.id !== id)
  persistSavedThemes()
  if (userThemeId(currentPreference) === id) persistThemePreference('custom')
  else {
    document.dispatchEvent(
      new CustomEvent(THEME_CHANGE, {
        detail: { theme: resolveTheme(currentPreference, prefersDark()), preference: currentPreference },
      }),
    )
  }
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
  savedThemes = readStoredSavedThemes()
  currentCustom = readStoredCustomColors()
  const preference = readStoredPreference()
  const userId = userThemeId(preference)
  if (userId) {
    const saved = savedThemes.find((t) => t.id === userId)
    if (saved) currentCustom = { ...saved.colors }
    else {
      applyThemePreference('custom')
      return getThemePreference()
    }
  }
  applyThemePreference(preference)
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    media?.removeEventListener('change', onSchemeChange)
    media = window.matchMedia(QUERY)
    media.addEventListener('change', onSchemeChange)
  }
  return preference
}

export { colorWithAlpha }
export type { CustomColorId, CustomThemeColors, SavedTheme, ThemeId, ThemePreference }
