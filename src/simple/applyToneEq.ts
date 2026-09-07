import { bandIsActive, bandUsesGain, filterStageCount, stageQ, type EqBand } from '../audio/engine/eqBands'
import { biquadCoeffs } from '../audio/engine/eqResponse'
import { dbToGain } from '../audio/parameters/mapping'
import type { DspSnapshot } from '../sensory/mapping/mappingEngine'

type Biquad = { b0: number; b1: number; b2: number; a1: number; a2: number }

function collectCoeffs(bands: readonly EqBand[], sampleRate: number): Biquad[] {
  const out: Biquad[] = []
  for (const band of bands) {
    if (!bandIsActive(band)) continue
    const stages = Math.max(1, filterStageCount(band))
    const stageGain = bandUsesGain(band.type) ? band.gain / stages : band.gain
    for (let s = 0; s < stages; s++) {
      const coef = biquadCoeffs(band.type, band.frequency, stageQ(band, s), stageGain, sampleRate)
      if (coef) out.push(coef)
    }
  }
  return out
}

function processChannel(data: Float32Array, coeffs: readonly Biquad[]): Float32Array {
  const out = new Float32Array(data)
  for (const coef of coeffs) {
    let x1 = 0
    let x2 = 0
    let y1 = 0
    let y2 = 0
    for (let i = 0; i < out.length; i++) {
      const x0 = out[i] ?? 0
      const y0 = coef.b0 * x0 + coef.b1 * x1 + coef.b2 * x2 - coef.a1 * y1 - coef.a2 * y2
      out[i] = y0
      x2 = x1
      x1 = x0
      y2 = y1
      y1 = y0
    }
  }
  return out
}

/** Apply Simple-mode EQ (and optional makeup) to planar PCM. */
export function applyToneToChannels(
  channels: Float32Array[],
  sampleRate: number,
  bands: readonly EqBand[],
  gainDb = 0,
): Float32Array[] {
  const coeffs = collectCoeffs(bands, sampleRate)
  const gain = dbToGain(gainDb)
  return channels.map((ch) => {
    const filtered = processChannel(ch, coeffs)
    if (gain === 1) return filtered
    for (let i = 0; i < filtered.length; i++) filtered[i] = (filtered[i] ?? 0) * gain
    return filtered
  })
}

export function applyToneToDsp(dsp: DspSnapshot, bands: EqBand[]): DspSnapshot {
  return {
    ...dsp,
    eqBands: bands.map((band) => ({ ...band })),
    bypass: { ...dsp.bypass, eq: false },
  }
}

export function bypassEqOnDsp(dsp: DspSnapshot): DspSnapshot {
  return {
    ...dsp,
    bypass: { ...dsp.bypass, eq: true },
  }
}
