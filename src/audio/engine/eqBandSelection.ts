export type EqBandSelection = { instanceId: string; index: number }

let current: EqBandSelection | null = null
const listeners = new Set<(selection: EqBandSelection | null) => void>()

export function getEqBandSelection(): EqBandSelection | null {
  return current
}

export function selectEqBand(next: EqBandSelection | null): void {
  current = next
  for (const listener of listeners) listener(next)
}

export function subscribeEqBandSelection(
  onChange: (selection: EqBandSelection | null) => void,
): () => void {
  listeners.add(onChange)
  return () => listeners.delete(onChange)
}
