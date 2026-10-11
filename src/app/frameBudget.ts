/** Shared paint cadence so Sensory and Technical do not run unbounded 60 Hz work. */

export function ridgeSampleStep(width: number): number {
  if (width > 1600) return 3
  if (width > 900) return 2
  return 1
}

export type PaintActivity = 'standard' | 'low'

/** Drawing cadence only. Audio block size and analysis hop stay where the engine set them. */
export function paintIntervalMs(playing: boolean, activity: PaintActivity = 'standard'): number {
  if (activity === 'low') return playing ? 66 : 140
  return playing ? 33 : 80
}

export function isDocumentHidden(): boolean {
  return typeof document !== 'undefined' && document.hidden
}

/** Walk paint columns, always including the last pixel so paths close. */
export function forPaintX(width: number, step: number, visit: (x: number) => void): void {
  const last = Math.max(0, width - 1)
  const stride = Math.max(1, step)
  for (let x = 0; x <= last; x += stride) visit(x)
  if (last % stride !== 0) visit(last)
}
