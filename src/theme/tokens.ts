export const THEME_STORAGE_KEY = 'field.theme'

export const THEME_IDS = [
  'studio-dark',
  'midnight-blue',
  'oxide',
  'forest',
  'light-studio',
  'oled',
] as const

export type ThemeId = (typeof THEME_IDS)[number]
export type ThemePreference = ThemeId | 'system'

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
]

const THEME_SET = new Set<string>(THEME_IDS)

export function isThemeId(value: string): value is ThemeId {
  return THEME_SET.has(value)
}

export function parseThemePreference(raw: string | null | undefined): ThemePreference {
  if (raw === 'system' || (raw && isThemeId(raw))) return raw
  return 'studio-dark'
}

export function resolveTheme(preference: ThemePreference, prefersDark: boolean): ThemeId {
  if (preference !== 'system') return preference
  return prefersDark ? 'studio-dark' : 'light-studio'
}
