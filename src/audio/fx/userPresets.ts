import type { PresetV1 } from '../parameters/types'

export type UserPreset = {
  id: string
  name: string
  savedAt: number
  preset: PresetV1
}

export const USER_PRESETS_KEY = 'field.userPresets'

export function parseUserPresets(raw: unknown): UserPreset[] {
  if (!Array.isArray(raw)) return []
  const out: UserPreset[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const rec = item as Partial<UserPreset>
    if (typeof rec.id !== 'string' || typeof rec.name !== 'string') continue
    if (typeof rec.savedAt !== 'number' || !rec.preset || typeof rec.preset !== 'object') continue
    out.push({
      id: rec.id,
      name: rec.name,
      savedAt: rec.savedAt,
      preset: rec.preset,
    })
  }
  return out
}

export function loadUserPresets(): UserPreset[] {
  try {
    return parseUserPresets(JSON.parse(localStorage.getItem(USER_PRESETS_KEY) ?? '[]'))
  } catch {
    return []
  }
}

export function saveUserPreset(name: string, preset: PresetV1, existing: UserPreset[] = loadUserPresets()): UserPreset[] {
  const next: UserPreset[] = [
    {
      id: `user-${Date.now().toString(36)}`,
      name: name.trim() || 'Untitled',
      savedAt: Date.now(),
      preset,
    },
    ...existing,
  ]
  persistUserPresets(next)
  return next
}

export function deleteUserPreset(id: string, existing: UserPreset[] = loadUserPresets()): UserPreset[] {
  const next = existing.filter((p) => p.id !== id)
  persistUserPresets(next)
  return next
}

export function persistUserPresets(list: UserPreset[]): void {
  try {
    localStorage.setItem(USER_PRESETS_KEY, JSON.stringify(list.slice(0, 40)))
  } catch {
    /* quota / private mode */
  }
}

export type PresetLibraryPack = {
  format: 'field-preset-library'
  version: 1
  presets: UserPreset[]
}

export function exportUserPresetPack(list: UserPreset[] = loadUserPresets()): string {
  const pack: PresetLibraryPack = { format: 'field-preset-library', version: 1, presets: list }
  return JSON.stringify(pack, null, 2)
}

export function parseUserPresetPack(raw: unknown): UserPreset[] {
  if (Array.isArray(raw)) return parseUserPresets(raw)
  if (!raw || typeof raw !== 'object') return []
  const rec = raw as { format?: unknown; presets?: unknown; instrument?: unknown; name?: unknown }
  if (rec.format === 'field-preset-library') return parseUserPresets(rec.presets)
  if (rec.instrument === 'field' || rec.instrument === 'firstsound') {
    return parseUserPresets([
      {
        id: `import-${Date.now().toString(36)}`,
        name: typeof rec.name === 'string' ? rec.name : 'Imported',
        savedAt: Date.now(),
        preset: rec as UserPreset['preset'],
      },
    ])
  }
  return []
}

export function mergeUserPresets(incoming: UserPreset[], existing: UserPreset[] = loadUserPresets()): UserPreset[] {
  const next = [...incoming, ...existing]
  persistUserPresets(next)
  return loadUserPresets()
}
