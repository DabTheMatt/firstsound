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
