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