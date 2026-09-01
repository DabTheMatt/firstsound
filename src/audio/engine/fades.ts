export type FadeCurve = 'linear' | 'equalPower' | 'exponential' | 'sCurve'

export const FADE_CURVES: { value: FadeCurve; label: string }[] = [
  { value: 'linear', label: 'Linear' },
  { value: 'equalPower', label: 'Equal Power' },
  { value: 'exponential', label: 'Exponential' },
  { value: 'sCurve', label: 'S-Curve' },
]

/** Gain at progress `t` in [0,1] for a fade-in. Fade-out is `gainAt(1 - t)`. */
export function fadeGain(t: number, curve: FadeCurve): number {
  const x = Math.min(1, Math.max(0, t))
  switch (curve) {
    case 'equalPower':
      return Math.sin((x * Math.PI) / 2)
    case 'exponential':
      return x * x
    case 'sCurve':
      return x * x * (3 - 2 * x)
    default:
      return x
  }
}

/** Gain at `rel` seconds into a region of length `span`. */
export function regionFadeGain(
  rel: number,
  span: number,
  fadeInSec: number,
  fadeOutSec: number,
  curve: FadeCurve,
): number {
  const s = Math.max(span, 1e-9)
  const t = Math.min(s, Math.max(0, rel))
  const inSec = Math.min(Math.max(0, fadeInSec), s)
  const outSec = Math.min(Math.max(0, fadeOutSec), s)
  let g = 1
  if (inSec > 0 && t < inSec) g *= fadeGain(t / inSec, curve)
  if (outSec > 0 && t > s - outSec) g *= fadeGain((s - t) / outSec, curve)
  return g
}

/** Playback envelope from `fromRel` to `span`, for Web Audio setValueCurveAtTime. */
export function regionFadeCurveFrom(
  fromRel: number,
  span: number,
  fadeInSec: number,
  fadeOutSec: number,
  curve: FadeCurve,
  samples = 64,
): Float32Array {
  const n = Math.max(2, samples)
  const start = Math.min(span, Math.max(0, fromRel))
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const rel = start + ((span - start) * i) / (n - 1)
    out[i] = Math.max(0.0001, regionFadeGain(rel, span, fadeInSec, fadeOutSec, curve))
  }
  return out
}

export function applyFades(
  samples: Float32Array,
  sampleRate: number,
  fadeInSec: number,
  fadeOutSec: number,
  curve: FadeCurve,
): void {
  const n = samples.length
  if (n === 0) return
  const inN = Math.min(n, Math.max(0, Math.round(fadeInSec * sampleRate)))
  const outN = Math.min(n, Math.max(0, Math.round(fadeOutSec * sampleRate)))
  for (let i = 0; i < inN; i++) {
    samples[i] = (samples[i] ?? 0) * fadeGain(inN <= 1 ? 1 : i / (inN - 1), curve)
  }
  for (let i = 0; i < outN; i++) {
    const idx = n - 1 - i
    const t = outN <= 1 ? 0 : i / (outN - 1)
    samples[idx] = (samples[idx] ?? 0) * fadeGain(t, curve)
  }
}

export const DEFAULT_FADE_SEC = 0.01
