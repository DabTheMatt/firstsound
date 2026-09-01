import { bandUsesMakeupGain, filterStageCount, stageQ, type EqBand, type EqFilterType } from './eqBands'

type Biquad = { b0: number; b1: number; b2: number; a1: number; a2: number }

/**
 * Magnitude response of the EQ chain in dB (RBJ cookbook / Web Audio shapes).
 * `off` bands are skipped. Sample rate only sets Nyquist for coefficient calc.
 */
export function eqMagnitudeDb(bands: EqBand[], freqHz: number, sampleRate: number): number {
  const nyquist = sampleRate / 2
  if (!(freqHz > 0) || !(nyquist > 0)) return 0
  const f = Math.min(freqHz, nyquist * 0.999)
  let db = 0
  for (const band of bands) {
    if (band.type === 'off') continue
    const stages = Math.max(1, filterStageCount(band))
    for (let s = 0; s < stages; s++) {
      const coef = biquadCoeffs(band.type, band.frequency, stageQ(band, s), band.gain, sampleRate)
      if (!coef) continue
      db += biquadMagDb(coef, f, sampleRate)
    }
    if (bandUsesMakeupGain(band.type)) db += band.gain
  }
  return db
}

export function eqCurveDb(bands: EqBand[], freqs: number[], sampleRate: number): number[] {
  return freqs.map((hz) => eqMagnitudeDb(bands, hz, sampleRate))
}

export function logFreqAxis(count: number, minHz = 20, maxHz = 20000): number[] {
  const n = Math.max(2, count)
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    out.push(minHz * (maxHz / minHz) ** t)
  }
  return out
}

function biquadCoeffs(
  type: EqFilterType,
  freq: number,
  q: number,
  gainDb: number,
  sampleRate: number,
): Biquad | null {
  if (type === 'off') return null
  const Fs = sampleRate
  const F = Math.min(Math.max(freq, 1), Fs * 0.49)
  const Q = Math.min(20, Math.max(0.025, q))
  const A = 10 ** (gainDb / 40)
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

  switch (type) {
    case 'lowpass':
      b0 = (1 - cosw) / 2
      b1 = 1 - cosw
      b2 = (1 - cosw) / 2
      a0 = 1 + alpha
      a1 = -2 * cosw
      a2 = 1 - alpha
      break
    case 'highpass':
      b0 = (1 + cosw) / 2
      b1 = -(1 + cosw)
      b2 = (1 + cosw) / 2
      a0 = 1 + alpha
      a1 = -2 * cosw
      a2 = 1 - alpha
      break
    case 'bandpass':
      b0 = alpha
      b1 = 0
      b2 = -alpha
      a0 = 1 + alpha
      a1 = -2 * cosw
      a2 = 1 - alpha
      break
    case 'notch':
      b0 = 1
      b1 = -2 * cosw
      b2 = 1
      a0 = 1 + alpha
      a1 = -2 * cosw
      a2 = 1 - alpha
      break
    case 'lowshelf': {
      const twoSqrtAAlpha = 2 * Math.sqrt(A) * alpha
      b0 = A * (A + 1 - (A - 1) * cosw + twoSqrtAAlpha)
      b1 = 2 * A * (A - 1 - (A + 1) * cosw)
      b2 = A * (A + 1 - (A - 1) * cosw - twoSqrtAAlpha)
      a0 = A + 1 + (A - 1) * cosw + twoSqrtAAlpha
      a1 = -2 * (A - 1 + (A + 1) * cosw)
      a2 = A + 1 + (A - 1) * cosw - twoSqrtAAlpha
      break
    }
    case 'highshelf': {
      const twoSqrtAAlpha = 2 * Math.sqrt(A) * alpha
      b0 = A * (A + 1 + (A - 1) * cosw + twoSqrtAAlpha)
      b1 = -2 * A * (A - 1 + (A + 1) * cosw)
      b2 = A * (A + 1 + (A - 1) * cosw - twoSqrtAAlpha)
      a0 = A + 1 - (A - 1) * cosw + twoSqrtAAlpha
      a1 = 2 * (A - 1 - (A + 1) * cosw)
      a2 = A + 1 - (A - 1) * cosw - twoSqrtAAlpha
      break
    }
    case 'peaking':
      b0 = 1 + alpha * A
      b1 = -2 * cosw
      b2 = 1 - alpha * A
      a0 = 1 + alpha / A
      a1 = -2 * cosw
      a2 = 1 - alpha / A
      break
    default:
      return null
  }

  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 }
}

function biquadMagDb(c: Biquad, freqHz: number, sampleRate: number): number {
  const w = (2 * Math.PI * freqHz) / sampleRate
  const cos1 = Math.cos(w)
  const cos2 = Math.cos(2 * w)
  const sin1 = Math.sin(w)
  const sin2 = Math.sin(2 * w)
  const br = c.b0 + c.b1 * cos1 + c.b2 * cos2
  const bi = -(c.b1 * sin1 + c.b2 * sin2)
  const ar = 1 + c.a1 * cos1 + c.a2 * cos2
  const ai = -(c.a1 * sin1 + c.a2 * sin2)
  const mag2 = (br * br + bi * bi) / Math.max(1e-20, ar * ar + ai * ai)
  return 10 * Math.log10(Math.max(1e-20, mag2))
}
