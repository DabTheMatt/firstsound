/**
 * EQ assistance uses the same biquad magnitude as the engine response curve.
 * The highlighted span is where that response actually leaves unity, not a fixed rectangle.
 */

import type { EqBand } from '../audio/engine/eqBands'
import { bandIsActive } from '../audio/engine/eqBands'
import { eqMagnitudeDb } from '../audio/engine/eqResponse'
import { pitchRatio } from '../audio/parameters/mapping'
import { formatHoverFreq, hzToNoteName } from '../audio/engine/pitchScale'
import { HEARING_BANDS, bandForHz, type HearingBandId } from './bands'
import type { BufferAnalysis, SoundMapColumn } from './analyze'
import { dbfsToPower, powerToDbfs } from './levels'

export type EqReadout = {
  index: number
  frequencyHz: number
  frequencyLabel: string
  note: string
  region: string
  regionId: HearingBandId | null
  gainDb: number
  q: number
  type: string
}

export type AffectedRegion = {
  lo: number
  hi: number
  peakDb: number
}

export function eqReadout(band: EqBand, index: number): EqReadout | null {
  if (!bandIsActive(band)) return null
  const region = bandForHz(band.frequency)
  return {
    index,
    frequencyHz: band.frequency,
    frequencyLabel: formatHoverFreq(band.frequency),
    note: hzToNoteName(band.frequency),
    region: region?.label ?? '—',
    regionId: region?.id ?? null,
    gainDb: band.gain,
    q: band.q,
    type: band.type,
  }
}

/** Frequencies where |H(f)| exceeds half the peak excursion, at least 0.5 dB. */
export function affectedRegion(band: EqBand, sampleRate: number): AffectedRegion | null {
  if (!bandIsActive(band) || !(sampleRate > 0)) return null
  const freqs: number[] = []
  for (let i = 0; i < 128; i++) {
    const t = i / 127
    freqs.push(20 * (20000 / 20) ** t)
  }
  let peak = 0
  const curve = freqs.map((hz) => {
    const db = eqMagnitudeDb([band], hz, sampleRate)
    const mag = Number.isFinite(db) ? db : 0
    peak = Math.max(peak, Math.abs(mag))
    return mag
  })
  if (peak < 0.4) return null
  const gate = Math.max(0.5, peak * 0.5)
  let lo = band.frequency
  let hi = band.frequency
  let seen = false
  for (let i = 0; i < freqs.length; i++) {
    if (Math.abs(curve[i] ?? 0) < gate) continue
    const hz = freqs[i] ?? band.frequency
    if (!seen) {
      lo = hz
      hi = hz
      seen = true
    } else {
      lo = Math.min(lo, hz)
      hi = Math.max(hi, hz)
    }
  }
  if (!seen || hi <= lo) return null
  return { lo, hi, peakDb: peak }
}

export type BandDelta = {
  id: HearingBandId
  label: string
  beforeDb: number | null
  afterDb: number | null
  deltaDb: number | null
}

/** 0 at −96 dB, 1 at 0 dB. Keeps a quiet high band visible when it actually has energy. */
export function levelBar(db: number | null): number {
  if (db === null || !Number.isFinite(db)) return 0
  return Math.max(0, Math.min(1, (db + 96) / 96))
}

export type HeardBand = {
  id: HearingBandId
  label: string
  beforeDb: number | null
  afterDb: number | null
  deltaDb: number | null
}

/**
 * Band level is mean power per FFT bin, so a wide high band is not hidden by a loud narrow bass bin.
 * After applies pitch (energy moves to the heard frequency) and the real EQ curve.
 */
export function heardBandLevels(
  analysis: BufferAnalysis,
  sampleRate: number,
  pitchSemitones: number,
  bands: readonly EqBand[],
  eqEngaged: boolean,
): HeardBand[] {
  const fft = analysis.fftSize
  const rate = sampleRate > 0 ? sampleRate : analysis.sampleRate
  const empty = HEARING_BANDS.map((band) => ({
    id: band.id,
    label: band.label,
    beforeDb: null,
    afterDb: null,
    deltaDb: null,
  }))
  if (fft < 256 || analysis.spectrumDb.length < 2 || analysis.silent || !(rate > 0)) return empty
  const ratio = pitchRatio(pitchSemitones)
  const before = HEARING_BANDS.map(() => ({ power: 0, count: 0 }))
  const after = HEARING_BANDS.map(() => ({ power: 0, count: 0 }))
  for (let i = 1; i < analysis.spectrumDb.length; i++) {
    const hz = (i * rate) / fft
    const power = dbfsToPower(analysis.spectrumDb[i] ?? -120)
    const source = bandForHz(hz)
    if (source) {
      const index = HEARING_BANDS.findIndex((band) => band.id === source.id)
      const bin = before[index]
      if (bin) {
        bin.power += power
        bin.count += 1
      }
    }
    const heardHz = hz * ratio
    const dest = bandForHz(heardHz)
    if (!dest) continue
    const index = HEARING_BANDS.findIndex((band) => band.id === dest.id)
    const bin = after[index]
    if (!bin) continue
    const mag = eqEngaged ? eqMagnitudeDb(bands as EqBand[], heardHz, rate) : 0
    const gain = Number.isFinite(mag) ? 10 ** (mag / 10) : 1
    bin.power += power * gain
    bin.count += 1
  }
  return HEARING_BANDS.map((band, index) => {
    const src = before[index]
    const dst = after[index]
    const beforeDb = src && src.count > 0 ? powerToDbfs(src.power / src.count) : null
    const afterDb = dst && dst.count > 0 ? powerToDbfs(dst.power / dst.count) : null
    const deltaDb =
      beforeDb !== null && afterDb !== null && Number.isFinite(beforeDb) && Number.isFinite(afterDb)
        ? afterDb - beforeDb
        : null
    return { id: band.id, label: band.label, beforeDb, afterDb, deltaDb }
  })
}

/** Move each sound-map column's band energy to the band that contains its center after pitch. */
export function shiftSoundMap(columns: SoundMapColumn[] | null, pitchSemitones: number): SoundMapColumn[] | null {
  if (!columns) return null
  const ratio = pitchRatio(pitchSemitones)
  if (Math.abs(ratio - 1) < 0.001) return columns
  return columns.map((column) => {
    const power = HEARING_BANDS.map(() => 0)
    HEARING_BANDS.forEach((band, index) => {
      const center = Math.sqrt(band.lo * band.hi)
      const dest = bandForHz(center * ratio)
      if (!dest) return
      const destIndex = HEARING_BANDS.findIndex((item) => item.id === dest.id)
      if (destIndex >= 0) power[destIndex] = (power[destIndex] ?? 0) + (column.power[index] ?? 0)
    })
    return { time: column.time, power }
  })
}

/** Apply the real EQ magnitude to a measured spectrum and compare band power. */
export function eqBandDeltas(analysis: BufferAnalysis, bands: readonly EqBand[], sampleRate: number): BandDelta[] {
  const fft = analysis.fftSize
  if (fft < 256 || analysis.spectrumDb.length < 2 || analysis.silent) {
    return HEARING_BANDS.map((band) => ({ id: band.id, label: band.label, beforeDb: null, afterDb: null, deltaDb: null }))
  }
  const before = HEARING_BANDS.map(() => 0)
  const after = HEARING_BANDS.map(() => 0)
  for (let i = 1; i < analysis.spectrumDb.length; i++) {
    const hz = (i * sampleRate) / fft
    const region = bandForHz(hz)
    if (!region) continue
    const index = HEARING_BANDS.findIndex((band) => band.id === region.id)
    if (index < 0) continue
    const power = dbfsToPower(analysis.spectrumDb[i] ?? -120)
    const mag = eqMagnitudeDb(bands as EqBand[], hz, sampleRate)
    const gain = Number.isFinite(mag) ? 10 ** (mag / 10) : 1
    before[index] = (before[index] ?? 0) + power
    after[index] = (after[index] ?? 0) + power * gain
  }
  return HEARING_BANDS.map((band, index) => {
    const b = before[index] ?? 0
    const a = after[index] ?? 0
    return {
      id: band.id,
      label: band.label,
      beforeDb: powerToDbfs(b),
      afterDb: powerToDbfs(a),
      deltaDb: b > 0 && a > 0 ? 10 * Math.log10(a / b) : null,
    }
  })
}
