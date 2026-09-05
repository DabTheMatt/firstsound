import type { FadeCurve } from '../audio/engine/fades'
import type { ModuleType } from '../audio/chain/chain'

export type WaveTool = 'select'
export type VizMode = 'waveform' | 'spectrum' | 'split' | 'eq-split'
export type MeterRange = 'normal' | 'field' | 'full'
export type MeterMode = 'peak'
export type InspectorFocus =
  | { kind: 'module'; instanceId: string; type: ModuleType; pane?: 'main' | 'advanced' }
  | { kind: 'tool'; tool: WaveTool }

export type FadeFocus = 'in' | 'out'

export type EditState = {
  fadeIn: number
  fadeOut: number
  fadeCurve: FadeCurve
  fadeInBend: number
  fadeOutBend: number
  fadeFocus: FadeFocus
  autoSnap: boolean
  fadeAuto: boolean
  normalizeOnUse: boolean
}

export const DEFAULT_EDIT: EditState = {
  fadeIn: 0.01,
  fadeOut: 0.01,
  fadeCurve: 'equalPower',
  fadeInBend: 0.5,
  fadeOutBend: 0.5,
  fadeFocus: 'in',
  autoSnap: true,
  fadeAuto: true,
  normalizeOnUse: false,
}

export function meterDbMin(range: MeterRange): number {
  if (range === 'full') return -120
  if (range === 'field') return -100
  return -60
}

/** Peak-meter mapping: 0 dBFS at the top of the lane. */
export function dbToMeterPct(db: number, minDb: number): number {
  if (!Number.isFinite(db)) return 0
  const span = 0 - minDb
  if (!(span > 0)) return 0
  return Math.min(100, Math.max(0, ((db - minDb) / span) * 100))
}

export const METER_SWEET_LO = -12
export const METER_SWEET_HI = -6

export function meterScaleTicks(minDb: number): number[] {
  return meterScaleMarks(minDb).filter((m) => m.label).map((m) => m.db)
}

export type MeterScaleMark = {
  db: number
  label: boolean
}

/** 1 dB marks; numbers every 3 dB down to −24, then every 6 dB. */
export function meterScaleMarks(minDb: number): MeterScaleMark[] {
  const out: MeterScaleMark[] = []
  for (let db = 0; db >= minDb - 1e-6; db -= 1) {
    const v = Math.round(db)
    const labeled =
      v === 0 ||
      v === minDb ||
      (v >= -24 && v % 3 === 0) ||
      (v < -24 && v % 6 === 0)
    out.push({ db: v, label: labeled })
  }
  return out
}

/** Scale ticks and labels in the −12…−6 dB window. */
export function isMeterSweetMark(db: number): boolean {
  return db <= METER_SWEET_HI && db >= METER_SWEET_LO
}

/** Vertical span of the −12…−6 dB window on the meter scale. */
export function meterSweetBand(minDb: number): { bottom: number; height: number } {
  const bottom = dbToMeterPct(METER_SWEET_LO, minDb)
  const top = dbToMeterPct(METER_SWEET_HI, minDb)
  return { bottom, height: Math.max(0, top - bottom) }
}

/** Peak-hold that jumps up with the peak and falls slower than the bar. */
export function fallHoldDb(prev: number, peak: number, dtSec: number, fallDbPerSec = 9): number {
  const p = Number.isFinite(peak) ? peak : Number.NEGATIVE_INFINITY
  if (!Number.isFinite(prev)) return p
  if (p >= prev) return p
  return Math.max(p, prev - fallDbPerSec * Math.max(0, dtSec))
}