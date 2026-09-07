export const THEME_STORAGE_KEY = 'field.theme'

export const THEME_IDS = [
  'studio-dark',
  'midnight-blue',
  'oxide',
  'forest',
  'light-studio',
  'oled',
  'dusk',
  'custom',
] as const

export type ThemeId = (typeof THEME_IDS)[number]
export type UserThemePreference = `user:${string}`
export type ThemePreference = ThemeId | 'system' | UserThemePreference

export const CUSTOM_THEME_STORAGE_KEY = 'field.theme.custom'
export const SAVED_THEMES_STORAGE_KEY = 'field.theme.saved'
export const USER_THEME_PREFIX = 'user:'
export const MAX_SAVED_THEMES = 12

export const CUSTOM_COLOR_FIELDS = [
  { id: 'bgApp', label: 'Background', css: '--bg-app' },
  { id: 'bgPanel', label: 'Panel', css: '--bg-panel' },
  { id: 'bgElevated', label: 'Surface', css: '--bg-panel-elevated' },
  { id: 'textPrimary', label: 'Text', css: '--text-primary' },
  { id: 'accent', label: 'Accent', css: '--accent-primary' },
  { id: 'waveform', label: 'Waveform', css: '--waveform-primary' },
  { id: 'spectrum', label: 'Spectrum', css: '--spectrum-fill' },
  { id: 'playhead', label: 'Playhead', css: '--playhead' },
  { id: 'selection', label: 'Selection', css: '--selection-border' },
] as const

export type CustomColorId = (typeof CUSTOM_COLOR_FIELDS)[number]['id']
export type CustomThemeColors = Record<CustomColorId, string>

export const DEFAULT_CUSTOM_COLORS: CustomThemeColors = {
  bgApp: '#151616',
  bgPanel: '#191b1b',
  bgElevated: '#202222',
  textPrimary: '#e8e6df',
  accent: '#e6ad48',
  waveform: '#b5b9b6',
  spectrum: '#aeb5b6',
  playhead: '#f0b74e',
  selection: '#e6ad48',
}

export const THEME_OPTIONS: {
  id: ThemePreference
  label: string
  preview: { bg: string; surface: string; accent: string }
}[] = [
  { id: 'system', label: 'System', preview: { bg: '#151616', surface: '#F0F0EC', accent: '#E6AD48' } },
  { id: 'studio-dark', label: 'Studio Dark', preview: { bg: '#151616', surface: '#202222', accent: '#E6AD48' } },
  { id: 'midnight-blue', label: 'Midnight Blue', preview: { bg: '#0D1117', surface: '#18212C', accent: '#63B3D1' } },
  { id: 'oxide', label: 'Oxide', preview: { bg: '#181411', surface: '#29211B', accent: '#D97845' } },
  { id: 'forest', label: 'Forest', preview: { bg: '#101512', surface: '#1C2520', accent: '#72B98A' } },
  { id: 'light-studio', label: 'Light Studio', preview: { bg: '#E7E7E3', surface: '#F8F8F5', accent: '#A96E13' } },
  { id: 'oled', label: 'OLED', preview: { bg: '#050606', surface: '#0E1111', accent: '#DFAF55' } },
  { id: 'dusk', label: 'Dusk', preview: { bg: '#1b1815', surface: '#2a2621', accent: '#E07A42' } },
  { id: 'custom', label: 'Custom', preview: { bg: '#151616', surface: '#202222', accent: '#E6AD48' } },
]

const THEME_SET = new Set<string>(THEME_IDS)

export function isThemeId(value: string): value is ThemeId {
  return THEME_SET.has(value)
}

export function isUserThemePreference(value: string): value is UserThemePreference {
  return value.startsWith(USER_THEME_PREFIX) && value.length > USER_THEME_PREFIX.length
}

export function userThemeId(preference: string): string | null {
  if (!isUserThemePreference(preference)) return null
  return preference.slice(USER_THEME_PREFIX.length)
}

export function userThemePreference(id: string): UserThemePreference {
  return `${USER_THEME_PREFIX}${id}`
}

export function parseThemePreference(raw: string | null | undefined): ThemePreference {
  if (raw === 'system' || (raw && isThemeId(raw))) return raw
  if (raw && isUserThemePreference(raw)) return raw
  return 'studio-dark'
}

export function resolveTheme(preference: ThemePreference, prefersDark: boolean): ThemeId {
  if (preference === 'system') return prefersDark ? 'studio-dark' : 'light-studio'
  if (isUserThemePreference(preference)) return 'custom'
  return preference
}

export function parseCustomThemeColors(raw: unknown): CustomThemeColors {
  const next = { ...DEFAULT_CUSTOM_COLORS }
  if (!raw || typeof raw !== 'object') return next
  const rec = raw as Record<string, unknown>
  for (const field of CUSTOM_COLOR_FIELDS) {
    const value = rec[field.id]
    if (typeof value === 'string' && /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.test(value)) {
      next[field.id] = value
    }
  }
  return next
}

export type SavedTheme = {
  id: string
  name: string
  colors: CustomThemeColors
}

export function parseSavedThemes(raw: unknown): SavedTheme[] {
  if (!Array.isArray(raw)) return []
  const out: SavedTheme[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const rec = item as Partial<SavedTheme>
    if (typeof rec.id !== 'string' || !rec.id || seen.has(rec.id)) continue
    if (typeof rec.name !== 'string') continue
    const name = rec.name.trim().slice(0, 40)
    if (!name) continue
    seen.add(rec.id)
    out.push({ id: rec.id, name, colors: parseCustomThemeColors(rec.colors) })
    if (out.length >= MAX_SAVED_THEMES) break
  }
  return out
}

export function nextSavedThemeName(existing: readonly { name: string }[], base = 'My theme'): string {
  const names = new Set(existing.map((t) => t.name.toLowerCase()))
  if (!names.has(base.toLowerCase())) return base
  for (let n = 2; n < 100; n++) {
    const name = `${base} ${n}`
    if (!names.has(name.toLowerCase())) return name
  }
  return `${base} ${Date.now()}`
}
