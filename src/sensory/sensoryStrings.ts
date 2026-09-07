export const SENSORY_STRINGS_STORAGE_KEY = 'firstsound.sensoryStrings'

/** Overlay of parameter strings. Default is off. */
export function parseSensoryStrings(raw: string | null | undefined): boolean {
  return raw === '1'
}

export function readStoredSensoryStrings(): boolean {
  try {
    return parseSensoryStrings(localStorage.getItem(SENSORY_STRINGS_STORAGE_KEY))
  } catch {
    return false
  }
}

export function persistSensoryStrings(on: boolean): void {
  try {
    localStorage.setItem(SENSORY_STRINGS_STORAGE_KEY, on ? '1' : '0')
  } catch {
    /* ignore quota / private mode */
  }
}
