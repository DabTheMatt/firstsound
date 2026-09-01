import type { FadeCurve } from '../audio/engine/fades'
import type { ModuleType } from '../audio/chain/chain'

export type WaveTool = 'select'
export type VizMode = 'waveform' | 'spectrum' | 'split'
export type MeterRange = 'normal' | 'field' | 'full'
export type MeterMode = 'peak'
export type InspectorFocus =
  | { kind: 'module'; instanceId: string; type: ModuleType }
  | { kind: 'tool'; tool: WaveTool }

export type EditState = {
  fadeIn: number
  fadeOut: number
  fadeCurve: FadeCurve
  autoSnap: boolean
  fadeAuto: boolean
  normalizeOnUse: boolean
}

export const DEFAULT_EDIT: EditState = {
  fadeIn: 0.01,
  fadeOut: 0.01,
  fadeCurve: 'equalPower',
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
  const ticks: number[] = []
  for (let db = 0; db >= minDb - 1e-6; db -= db <= -24 ? 6 : 3) {
    ticks.push(Math.round(db))
  }
  if (ticks[ticks.length - 1] !== minDb) ticks.push(minDb)
  return ticks
}

export function meterSweetBand(minDb: number): { bottom: number; height: number } {
  const bottom = dbToMeterPct(METER_SWEET_LO, minDb)
  const top = dbToMeterPct(METER_SWEET_HI, minDb)
  return { bottom, height: Math.max(0, top - bottom) }
}