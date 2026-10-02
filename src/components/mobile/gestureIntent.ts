export type GestureIntent = 'pending' | 'scroll' | 'edit'

/** Decide whether a pointer movement is a scroll or a deliberate value edit. */
export function classifyGesture(dx: number, dy: number, threshold = 10): GestureIntent {
  const adx = Math.abs(dx)
  const ady = Math.abs(dy)
  if (adx < threshold && ady < threshold) return 'pending'
  if (ady >= adx) return 'scroll'
  return 'edit'
}

export function isTap(dx: number, dy: number, threshold = 10): boolean {
  return Math.hypot(dx, dy) < threshold
}

/**
 * A modulation affordance opens only on a tap.
 * Once a gesture locks to scroll or a sideways drag, it stays there.
 */
export type ModulationPress = 'pending' | 'scroll' | 'ignore'

export function lockModulationGesture(current: ModulationPress, dx: number, dy: number): ModulationPress {
  if (current !== 'pending') return current
  const next = classifyGesture(dx, dy)
  if (next === 'pending') return 'pending'
  if (next === 'scroll') return 'scroll'
  return 'ignore'
}
