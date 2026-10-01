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
