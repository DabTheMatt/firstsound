/** Map a client point onto the cutoff/reso pad. X = cutoff, Y = resonance (up = more). */
export function xyFromClient(
  rect: { left: number; top: number; width: number; height: number },
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const width = Math.max(1, rect.width)
  const height = Math.max(1, rect.height)
  const x = Math.min(1, Math.max(0, (clientX - rect.left) / width))
  const y = Math.min(1, Math.max(0, 1 - (clientY - rect.top) / height))
  return { x, y }
}

/**
 * Hover and released-capture moves must not change filter params.
 * Touch keeps tracking until pointerup: some WebKit builds report buttons=0 while contacting.
 */
export function shouldApplyPadMove(event: { buttons: number; pointerType: string }): boolean {
  if (event.pointerType === 'touch') return true
  return (event.buttons & 1) === 1
}

export function isPrimaryPadPress(event: { button: number; buttons: number; pointerType: string }): boolean {
  if (event.button !== 0) return false
  if (event.pointerType === 'touch') return true
  return (event.buttons & 1) === 1
}
