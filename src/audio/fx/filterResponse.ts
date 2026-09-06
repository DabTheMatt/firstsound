import { eqMagnitudeDb } from '../engine/eqResponse'
import { defaultEqBandAt, type EqBand, type EqFilterType } from '../engine/eqBands'
import {
  combDelaySeconds,
  combFeedbackFromReso,
  filterDryWet,
  filterSlopeAt,
  filterStageQs,
  filterTypeAt,
  morphMixGains,
  peakGainFromReso,
  type CreativeFilterType,
} from './filter'
import type { ParamId } from '../parameters/types'

function band(type: EqFilterType, hz: number, q: number, gain: number): EqBand {
  const base = defaultEqBandAt(0)
  return { ...base, type, frequency: hz, q, gain, slope: 12 }
}

function seriesDb(type: EqFilterType, hz: number, qs: number[], gain: number, freq: number, sr: number): number {
  let db = 0
  for (const q of qs) db += eqMagnitudeDb([band(type, hz, q, gain)], freq, sr)
  return db
}

function combMagDb(cutoff: number, q: number, freq: number): number {
  const delay = combDelaySeconds(cutoff)
  const g = combFeedbackFromReso(q)
  const phase = 2 * Math.PI * freq * delay
  const mag = 1 / Math.max(1e-4, Math.sqrt(1 + g * g - 2 * g * Math.cos(phase)))
  return 20 * Math.log10(Math.max(1e-6, mag * (1 - g)))
}

function eqTypeFor(kind: CreativeFilterType): EqFilterType {
  if (kind === 'highpass') return 'highpass'
  if (kind === 'bandpass') return 'bandpass'
  if (kind === 'notch') return 'notch'
  if (kind === 'peak') return 'peaking'
  return 'lowpass'
}

export function filterMagnitudeDb(params: Record<ParamId, number>, freqHz: number, sampleRate: number): number {
  const kind = filterTypeAt(params.filterKind)
  const cutoff = params.filterCutoff
  const q = params.filterReso
  const qs = filterStageQs(filterSlopeAt(params.filterSlope))
  if (kind === 'comb') return combMagDb(cutoff, q, freqHz)
  if (kind === 'morph') {
    const mix = morphMixGains(params.filterMorph / 100)
    const lp = seriesDb('lowpass', cutoff, qs, 0, freqHz, sampleRate)
    const hp = seriesDb('highpass', cutoff, qs, 0, freqHz, sampleRate)
    const bp = eqMagnitudeDb([band('bandpass', cutoff, Math.max(0.3, q * 0.85), 0)], freqHz, sampleRate)
    const lin =
      mix.lp * 10 ** (lp / 20) + mix.bp * 10 ** (bp / 20) + mix.hp * 10 ** (hp / 20)
    return 20 * Math.log10(Math.max(1e-8, lin))
  }
  if (kind === 'peak') {
    return eqMagnitudeDb([band('peaking', cutoff, q, peakGainFromReso(q, 'clean'))], freqHz, sampleRate)
  }
  if (kind === 'bandpass' || kind === 'notch') {
    return eqMagnitudeDb([band(eqTypeFor(kind), cutoff, q, 0)], freqHz, sampleRate)
  }
  return seriesDb(eqTypeFor(kind), cutoff, qs, 0, freqHz, sampleRate)
}

/** Combine dry/wet mix with the filter's magnitude at one frequency. */
export function filterMixMagnitudeDb(filterDb: number, mixPct: number): number {
  const { dry, wet } = filterDryWet(mixPct)
  const lin = dry + wet * 10 ** (filterDb / 20)
  return 20 * Math.log10(Math.max(1e-12, lin))
}

export function filterModuleIsAudible(bypassed: boolean, mixPct: number): boolean {
  return !bypassed && mixPct > 0.5
}

export function filterResponseCurve(
  params: Record<ParamId, number>,
  freqs: number[],
  sampleRate: number,
): number[] {
  return freqs.map((hz) => filterMagnitudeDb(params, hz, sampleRate))
}
