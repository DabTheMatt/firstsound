export const UI_MODE_STORAGE_KEY = 'firstsound.uiMode'

export const UI_MODES = ['simple', 'technical', 'sensory'] as const

export type UiMode = (typeof UI_MODES)[number]

export function parseUiMode(raw: string | null | undefined): UiMode | null {
  if (raw === 'simple' || raw === 'sensory' || raw === 'technical') return raw
  return null
}

/** First launch, and any visit with no saved choice, opens Technical. */
export const DEFAULT_UI_MODE: UiMode = 'technical'

export function initialUiMode(): UiMode {
  return readStoredUiMode() ?? DEFAULT_UI_MODE
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
