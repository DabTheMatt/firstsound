export const UI_MODE_STORAGE_KEY = 'firstsound.uiMode'

export const UI_MODES = ['simple', 'sensory', 'technical'] as const

export type UiMode = (typeof UI_MODES)[number]

export function parseUiMode(raw: string | null | undefined): UiMode | null {
  if (raw === 'simple' || raw === 'sensory' || raw === 'technical') return raw
  return null
}

export function readStoredUiMode(): UiMode | null {
  try {
    return parseUiMode(localStorage.getItem(UI_MODE_STORAGE_KEY))
  } catch {
    return null
  }
}

export function persistUiMode(mode: UiMode): void {
  try {
    localStorage.setItem(UI_MODE_STORAGE_KEY, mode)
  } catch {
    /* private mode */
  }
}
