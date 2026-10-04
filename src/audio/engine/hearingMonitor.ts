/**
 * Monitor-only emphasis. This module never receives the export graph.
 * Live playback may insert these filters after the safety gain and before
 * the hardware output. Export renders through offlineRender / renderProcessedPcm,
 * which do not read these coefficients.
 */

export const MONITOR_DB_LIMIT = 12

export type MonitorEmphasis = {
  low: number
  mid: number
  high: number
}

export type MonitorBiquad = {
  type: 'lowshelf' | 'peaking' | 'highshelf'
  frequency: number
  q: number
  gain: number
}

export const MONITOR_BANDS: readonly MonitorBiquad[] = [
  { type: 'lowshelf', frequency: 140, q: 0.7, gain: 0 },
  { type: 'peaking', frequency: 1200, q: 0.8, gain: 0 },
  { type: 'highshelf', frequency: 6500, q: 0.7, gain: 0 },
]

export function clampMonitorDb(db: number): number {
  if (!Number.isFinite(db)) return 0
  return Math.max(-MONITOR_DB_LIMIT, Math.min(MONITOR_DB_LIMIT, db))
}

export function monitorCurves(emphasis: MonitorEmphasis | null): MonitorBiquad[] | null {
  if (!emphasis) return null
  const low = clampMonitorDb(emphasis.low)
  const mid = clampMonitorDb(emphasis.mid)
  const high = clampMonitorDb(emphasis.high)
  if (Math.abs(low) < 0.05 && Math.abs(mid) < 0.05 && Math.abs(high) < 0.05) return null
  return [
    { ...MONITOR_BANDS[0]!, gain: low },
    { ...MONITOR_BANDS[1]!, gain: mid },
    { ...MONITOR_BANDS[2]!, gain: high },
  ]
}

/**
 * Apply the monitor shelves to a copied buffer.
 * Used to prove the processor changes audition audio. Export must not call it.
 */
export function applyMonitorToChannel(samples: Float32Array, emphasis: MonitorEmphasis, sampleRate: number): Float32Array {
  const curves = monitorCurves(emphasis)
  const out = new Float32Array(samples)
  if (!curves) return out
  for (const curve of curves) {
    const coef = shelfOrPeak(curve, sampleRate)
    if (!coef) continue
    let x1 = 0
    let x2 = 0
    let y1 = 0
    let y2 = 0
    for (let i = 0; i < out.length; i++) {
      const x = out[i] ?? 0
      const y = coef.b0 * x + coef.b1 * x1 + coef.b2 * x2 - coef.a1 * y1 - coef.a2 * y2
      x2 = x1
      x1 = x
      y2 = y1
      y1 = y
      out[i] = y
    }
  }
  return out
}

type Coef = { b0: number; b1: number; b2: number; a1: number; a2: number }

function shelfOrPeak(curve: MonitorBiquad, sampleRate: number): Coef | null {
  const Fs = sampleRate
  if (!(Fs > 0)) return null
  const F = Math.min(Math.max(curve.frequency, 1), Fs * 0.49)
  const Q = Math.min(8, Math.max(0.2, curve.q))
  const A = 10 ** (clampMonitorDb(curve.gain) / 40)
  const w0 = (2 * Math.PI * F) / Fs
  const cosw = Math.cos(w0)
  const sinw = Math.sin(w0)
  const alpha = sinw / (2 * Q)
  let b0 = 1
  let b1 = 0
  let b2 = 0
  let a0 = 1
  let a1 = 0
  let a2 = 0
  if (curve.type === 'peaking') {
    b0 = 1 + alpha * A
    b1 = -2 * cosw
    b2 = 1 - alpha * A
    a0 = 1 + alpha / A
    a1 = -2 * cosw
    a2 = 1 - alpha / A
  } else if (curve.type === 'lowshelf') {
    const twoSqrtAAlpha = 2 * Math.sqrt(A) * alpha
    b0 = A * (A + 1 - (A - 1) * cosw + twoSqrtAAlpha)
    b1 = 2 * A * (A - 1 - (A + 1) * cosw)
    b2 = A * (A + 1 - (A - 1) * cosw - twoSqrtAAlpha)
    a0 = A + 1 + (A - 1) * cosw + twoSqrtAAlpha
    a1 = -2 * (A - 1 + (A + 1) * cosw)
    a2 = A + 1 + (A - 1) * cosw - twoSqrtAAlpha
  } else {
    const twoSqrtAAlpha = 2 * Math.sqrt(A) * alpha
    b0 = A * (A + 1 + (A - 1) * cosw + twoSqrtAAlpha)
    b1 = -2 * A * (A - 1 + (A + 1) * cosw)
    b2 = A * (A + 1 + (A - 1) * cosw - twoSqrtAAlpha)
    a0 = A + 1 - (A - 1) * cosw + twoSqrtAAlpha
    a1 = 2 * (A - 1 - (A + 1) * cosw)
    a2 = A + 1 - (A - 1) * cosw - twoSqrtAAlpha
  }
  if (!(a0 !== 0)) return null
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 }
}
