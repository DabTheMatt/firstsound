/**
 * How far the heard image sits in front of the listener.
 * 0 is close, against the head. 1 is further in front.
 * A bypassed reverb stays close. Wet, distance, size, and pre-delay move it back.
 */

export type ReverbDepthInput = {
  engaged: boolean
  wet: number
  distance: number
  size: number
  predelayMs: number
}

function unit(value: number, span: number): number {
  if (!(span > 0) || !Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value / span))
}

export function reverbImageDepth(input: ReverbDepthInput): number {
  if (!input.engaged) return 0
  const wet = unit(input.wet, 100)
  if (wet <= 0) return 0
  const distance = unit(input.distance, 100)
  const size = unit(input.size, 100)
  const pre = unit(Math.log10(Math.max(1, input.predelayMs)), 3)
  const room = Math.min(1, distance * 0.62 + size * 0.23 + pre * 0.15)
  return Math.min(1, wet * (0.22 + 0.78 * room))
}

export function depthWord(depth: number): 'near' | 'mid' | 'far' {
  if (depth < 0.28) return 'near'
  if (depth < 0.62) return 'mid'
  return 'far'
}
