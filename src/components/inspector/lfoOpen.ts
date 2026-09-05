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

/** LFO panels start collapsed. Only `true` in storage means open. */
export function readLfoOpen(kind: string): boolean {
  return readMap()[kind] === true
}

export function writeLfoOpen(kind: string, open: boolean): void {
  try {
    const next = readMap()
    if (open) next[kind] = true
    else delete next[kind]
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* private mode */
  }
}
