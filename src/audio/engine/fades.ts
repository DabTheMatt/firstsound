export type FadeCurve = 'linear' | 'equalPower' | 'exponential' | 'sCurve'

export const FADE_CURVES: { value: FadeCurve; label: string }[] = [
  { value: 'linear', label: 'Linear' },
  { value: 'equalPower', label: 'Equal Power' },
  { value: 'exponential', label: 'Exponential' },
  { value: 'sCurve', label: 'S-Curve' },
]

function shape(x: number, curve: FadeCurve): number {
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

/**
 * bend < 0.5 slows the start, bend > 0.5 speeds it up. 0.5 keeps the named curve.
 * Extreme bends lean almost fully on the power curve so the diamond can reshape
 * the envelope across most of the amplitude range.
 */
function mixBend(x: number, shaped: number, bend: number): number {
  const power = bend < 0.5 ? 1 + (0.5 - bend) * 8 : 1 / (1 + (bend - 0.5) * 8)
  const bent = x ** power
  return shaped * 0.08 + bent * 0.92
}

/** Gain at progress `t` in [0,1] for a fade-in. Fade-out is `gainAt(1 - t)`. */
export function fadeGain(t: number, curve: FadeCurve, bend = 0.5): number {
  const x = Math.min(1, Math.max(0, t))
  const shaped = shape(x, curve)
  if (Math.abs(bend - 0.5) < 0.001) return shaped
  return mixBend(x, shaped, bend)
}

/** Invert the midpoint handle so dragging Y follows the envelope diamond. */
export function fadeBendFromMidGain(targetGain: number, curve: FadeCurve): number {
  const g = Math.min(0.98, Math.max(0.02, targetGain))
  let lo = 0
  let hi = 1
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    if (fadeGain(0.5, curve, mid) < g) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

export function clampFadeBend(value: number): number {
  return Math.min(1, Math.max(0, value))
}

/** Gain at `rel` seconds into a region of length `span`. */
export function regionFadeGain(
  rel: number,
  span: number,
  fadeInSec: number,
  fadeOutSec: number,
  curve: FadeCurve,
  fadeInBend = 0.5,
  fadeOutBend = 0.5,
): number {
  const s = Math.max(span, 1e-9)
  const t = Math.min(s, Math.max(0, rel))
  const inSec = Math.min(Math.max(0, fadeInSec), s)
  const outSec = Math.min(Math.max(0, fadeOutSec), s)
  let g = 1
  if (inSec > 0 && t < inSec) g *= fadeGain(t / inSec, curve, fadeInBend)
  if (outSec > 0 && t > s - outSec) g *= fadeGain((s - t) / outSec, curve, fadeOutBend)
  return g
}

/** Position inside the original region while traversing a ping-pong cycle. */
export function pingPongRegionRel(t: number, regionSpan: number): number {
  const span = Math.max(regionSpan, 1e-9)
  const cycle = span * 2
  let phase = t % cycle
  if (phase < 0) phase += cycle
  return phase <= span ? phase : cycle - phase
}

/** Playback envelope from `fromRel` to `span`, for Web Audio setValueCurveAtTime. */
export function regionFadeCurveFrom(
  fromRel: number,
  span: number,
  fadeInSec: number,
  fadeOutSec: number,
  curve: FadeCurve,
  samples = 64,
  fadeInBend = 0.5,
  fadeOutBend = 0.5,
): Float32Array {
  const n = Math.max(2, samples)
  const start = Math.min(span, Math.max(0, fromRel))
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const rel = start + ((span - start) * i) / (n - 1)
    out[i] = Math.max(
      0.0001,
      regionFadeGain(rel, span, fadeInSec, fadeOutSec, curve, fadeInBend, fadeOutBend),
    )
  }
  return out
}

/**
 * Envelope for one ping-pong cycle (forward then reverse). Fade-in/out follow
 * the playhead in the original region, so the turnaround hears fade-out.
 */
export function pingPongFadeCurve(
  regionSpan: number,
  fadeInSec: number,
  fadeOutSec: number,
  curve: FadeCurve,
  samples = 128,
  fadeInBend = 0.5,
  fadeOutBend = 0.5,
): Float32Array {
  const n = Math.max(2, samples)
  const total = Math.max(regionSpan, 1e-9) * 2
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const t = (total * i) / (n - 1)
    const rel = pingPongRegionRel(t, regionSpan)
    out[i] = Math.max(
      0.0001,
      regionFadeGain(rel, regionSpan, fadeInSec, fadeOutSec, curve, fadeInBend, fadeOutBend),
    )
  }
  return out
}

/** Remaining ping-pong envelope from an elapsed buffer time, for live fade edits. */
export function pingPongFadeCurveFrom(
  fromElapsed: number,
  regionSpan: number,
  fadeInSec: number,
  fadeOutSec: number,
  curve: FadeCurve,
  durationSec: number,
  samples = 96,
  fadeInBend = 0.5,
  fadeOutBend = 0.5,
): Float32Array {
  const n = Math.max(2, samples)
  const out = new Float32Array(n)
  const startT = Math.max(0, fromElapsed)
  const span = Math.max(0, durationSec)
  for (let i = 0; i < n; i++) {
    const t = startT + (span * i) / (n - 1)
    const rel = pingPongRegionRel(t, regionSpan)
    out[i] = Math.max(
      0.0001,
      regionFadeGain(rel, regionSpan, fadeInSec, fadeOutSec, curve, fadeInBend, fadeOutBend),
    )
  }
  return out
}

export function applyFades(
  samples: Float32Array,
  sampleRate: number,
  fadeInSec: number,
  fadeOutSec: number,
  curve: FadeCurve,
  fadeInBend = 0.5,
  fadeOutBend = 0.5,
): void {
  const n = samples.length
  if (n === 0) return
  const inN = Math.min(n, Math.max(0, Math.round(fadeInSec * sampleRate)))
  const outN = Math.min(n, Math.max(0, Math.round(fadeOutSec * sampleRate)))
  for (let i = 0; i < inN; i++) {
    samples[i] =
      (samples[i] ?? 0) * fadeGain(inN <= 1 ? 1 : i / (inN - 1), curve, fadeInBend)
  }
  for (let i = 0; i < outN; i++) {
    const idx = n - 1 - i
    const t = outN <= 1 ? 0 : i / (outN - 1)
    samples[idx] = (samples[idx] ?? 0) * fadeGain(t, curve, fadeOutBend)
  }
}

export const DEFAULT_FADE_SEC = 0.01
