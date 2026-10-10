/**
 * Hold is on. The button loops a short sample fragment, and the FFT and EQ
 * graphs keep drawing that loop. This flag only remembers the button.
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
