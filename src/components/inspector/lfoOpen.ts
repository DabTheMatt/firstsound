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

export type LfoUiState = {
  /** An LFO slot bank exists for this section. */
  hasLfoInstance: boolean
  /** At least one slot has a modulation target. */
  isLfoConnected: boolean
  /** Whether the section body is shown. Independent of connection. */
  isLfoExpanded: boolean
}

/**
 * Expansion for one section.
 * A band id means the band's own flag is the only stored choice — a previous
 * strip's kind entry in localStorage must not leak in.
 */
export function storedExpansionForSection(input: {
  bandId?: string
  bandExpanded?: boolean
  kindStored?: boolean
}): boolean | undefined {
  if (input.bandId) return input.bandExpanded
  return input.kindStored
}

export function lfoUiState(
  slots: readonly { target?: unknown }[] | undefined,
  storedExpanded: boolean | undefined,
): LfoUiState {
  const list = slots ?? []
  const hasLfoInstance = list.length > 0
  const isLfoConnected = list.some((slot) => slot.target != null)
  return {
    hasLfoInstance,
    isLfoConnected,
    isLfoExpanded: resolveLfoSectionOpen(storedExpanded, isLfoConnected),
  }
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
