export const SENSORY_STRINGS_STORAGE_KEY = 'firstsound.sensoryStrings'

export function parseSensoryStrings(raw: string | null | undefined): boolean {
  if (raw === '0' || raw === 'false' || raw === 'off') return false
  return true
}

export function readStoredSensoryStrings(): boolean {
  try {
    return parseSensoryStrings(localStorage.getItem(SENSORY_STRINGS_STORAGE_KEY))
  } catch {
    return true
  }
}

export function persistSensoryStrings(on: boolean): void {
  try {
    localStorage.setItem(SENSORY_STRINGS_STORAGE_KEY, on ? '1' : '0')
  } catch {
    /* ignore quota / private mode */
  }
}
