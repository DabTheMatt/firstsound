/**
 * Holds the FFT and EQ drawings where they are.
 * Pause and hold also loops a short sample fragment; this flag only freezes the picture.
 * It is not stored. Pressing the button again, or Stop, clears it.
 */

let frozen = false
const listeners = new Set<(frozen: boolean) => void>()

export function graphSnapshotFrozen(): boolean {
  return frozen
}

export function setGraphSnapshot(next: boolean): void {
  if (frozen === next) return
  frozen = next
  for (const listener of listeners) listener(frozen)
}

export function subscribeGraphSnapshot(onChange: (frozen: boolean) => void): () => void {
  listeners.add(onChange)
  return () => listeners.delete(onChange)
}
