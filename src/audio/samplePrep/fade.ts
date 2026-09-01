import type { FadeCurveId } from './types'

/** Gain 0..1 for fade-in at normalized time t (0 at start, 1 at full). */
export function fadeGain(t: number, curve: FadeCurveId, bend = 0.5): number {
  const x = Math.min(1, Math.max(0, t))
  const shaped = shape(x, curve)
  if (Math.abs(bend - 0.5) < 0.001) return shaped
  return mixBend(x, shaped, bend)
}

function shape(x: number, curve: FadeCurveId): number {
  switch (curve) {
    case 'linear':
      return x
    case 'equalPower':
      return Math.sin(x * (Math.PI / 2))
    case 'exponential':
      return x * x
    case 'sCurve':
      return x * x * (3 - 2 * x)
    default:
      return x
  }
}

/**
 * One control point: bend < 0.5 pulls the curve toward a slower start,
 * bend > 0.5 toward a faster start. Keeps the interaction to a single handle.
 */
function mixBend(x: number, shaped: number, bend: number): number {
  const power = bend < 0.5 ? 1 + (0.5 - bend) * 3 : 1 / (1 + (bend - 0.5) * 3)
  const bent = x ** power
  return shaped * 0.35 + bent * 0.65
}

export function applyFadeIn(
  channels: Float32Array[],
  sampleRate: number,
  durationSec: number,
  curve: FadeCurveId,
  bend: number,
): void {
  const n = Math.min(
    channels[0]?.length ?? 0,
    Math.max(0, Math.floor(durationSec * sampleRate)),
  )
  if (n <= 1) return
  for (const ch of channels) {
    for (let i = 0; i < n; i++) {
      ch[i] = (ch[i] ?? 0) * fadeGain(i / (n - 1), curve, bend)
    }
  }
}

export function applyFadeOut(
  channels: Float32Array[],
  sampleRate: number,
  durationSec: number,
  curve: FadeCurveId,
  bend: number,
): void {
  const len = channels[0]?.length ?? 0
  const n = Math.min(len, Math.max(0, Math.floor(durationSec * sampleRate)))
  if (n <= 1) return
  const start = len - n
  for (const ch of channels) {
    for (let i = 0; i < n; i++) {
      const g = fadeGain(1 - i / (n - 1), curve, bend)
      const idx = start + i
      ch[idx] = (ch[idx] ?? 0) * g
    }
  }
}

/** Sample a mini SVG-like polyline (x,y in 0..1) for toolbar previews. */
export function curvePreview(curve: FadeCurveId, points = 12): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = []
  for (let i = 0; i < points; i++) {
    const x = i / (points - 1)
    out.push({ x, y: fadeGain(x, curve) })
  }
  return out
}
