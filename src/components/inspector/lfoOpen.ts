const KEY = 'field.lfoOpen'

function readMap(): Record<string, boolean> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as unknown
    if (!raw || typeof raw !== 'object') return {}
    return raw as Record<string, boolean>
  } catch {
    return {}
  }
}

/** True only when the user explicitly left this panel open. */
export function readLfoOpen(kind: string): boolean {
  return readStoredLfoOpen(kind) === true
}

/**
 * `undefined` means the user has not chosen.
 * `false` is an explicit collapse and must survive a connected LFO.
 */
export function readStoredLfoOpen(kind: string): boolean | undefined {
  const map = readMap()
  if (!Object.prototype.hasOwnProperty.call(map, kind)) return undefined
  return map[kind] === true
}

/**
 * Collapsed/expanded is presentation only.
 * A connected LFO may start open when nothing is stored.
 * An explicit choice always wins. This does not change modulation routing.
 */
export function resolveLfoSectionOpen(stored: boolean | undefined, connected: boolean): boolean {
  if (stored !== undefined) return stored
  return connected
}

export function writeLfoOpen(kind: string, open: boolean): void {
  try {
    const next = readMap()
    next[kind] = open
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* private mode */
  }
}
