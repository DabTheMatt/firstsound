/** Presentation mirrors for Attention Focus. Not parameter state and not a second editor. */

export type AttentionFadeDrag = 'in' | 'out' | null
export type AttentionDragSection = 'trim' | 'times' | 'playhead' | null

export type AttentionSignals = {
  fadeDrag: AttentionFadeDrag
  dragSection: AttentionDragSection
  sensoryAxisId: string | null
  simpleExport: boolean
  markerEditing: boolean
}

const EMPTY: AttentionSignals = {
  fadeDrag: null,
  dragSection: null,
  sensoryAxisId: null,
  simpleExport: false,
  markerEditing: false,
}

let current: AttentionSignals = { ...EMPTY }
const listeners = new Set<() => void>()

export function getAttentionSignals(): AttentionSignals {
  return current
}

export function patchAttentionSignals(patch: Partial<AttentionSignals>): void {
  const next: AttentionSignals = { ...current, ...patch }
  if (
    next.fadeDrag === current.fadeDrag &&
    next.dragSection === current.dragSection &&
    next.sensoryAxisId === current.sensoryAxisId &&
    next.simpleExport === current.simpleExport &&
    next.markerEditing === current.markerEditing
  ) {
    return
  }
  current = next
  for (const listener of listeners) listener()
}

export function subscribeAttentionSignals(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Test helper. Production code does not reset the audio project through this. */
export function resetAttentionSignals(): void {
  current = { ...EMPTY }
  for (const listener of listeners) listener()
}
