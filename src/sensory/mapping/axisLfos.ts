import type { ParamId } from '../../audio/parameters/types'
import type { FxLfoKind, LfoShape } from '../../audio/fx/lfo'
import type { SensoryAxisId } from '../sensoryParameters'
import { MORPH_GATE } from './morph'

/** One LFO patch per sensory axis. Shared FX banks use distinct slots. */
export type AxisLfoBind = {
  axis: SensoryAxisId
  kind: FxLfoKind
  slot: number
  target: ParamId
  shape: LfoShape
  depth0: number
  depthSpan: number
  rate0: number
  rateSpan: number
}

export const AXIS_LFOS: readonly AxisLfoBind[] = [
  {
    axis: 'space',
    kind: 'reverb',
    slot: 0,
    target: 'reverbWet',
    shape: 'sine',
    depth0: 8,
    depthSpan: 16,
    rate0: 0.12,
    rateSpan: 0.22,
  },
  {
    axis: 'echo',
    kind: 'delay',
    slot: 0,
    target: 'delayFeedback',
    shape: 'sine',
    depth0: 6,
    depthSpan: 12,
    rate0: 0.16,
    rateSpan: 0.28,
  },
  {
    axis: 'grain',
    kind: 'grain',
    slot: 0,
    target: 'scatter',
    shape: 'snh',
    depth0: 10,
    depthSpan: 22,
    rate0: 0.22,
    rateSpan: 0.55,
  },
  {
    axis: 'dirt',
    kind: 'distortion',
    slot: 0,
    target: 'saturation',
    shape: 'triangle',
    depth0: 8,
    depthSpan: 14,
    rate0: 0.14,
    rateSpan: 0.26,
  },
  {
    axis: 'tight',
    kind: 'compressor',
    slot: 0,
    target: 'compressorThreshold',
    shape: 'sine',
    depth0: 8,
    depthSpan: 14,
    rate0: 0.18,
    rateSpan: 0.32,
  },
  {
    axis: 'mod',
    kind: 'grain',
    slot: 1,
    target: 'motionDepth',
    shape: 'sine',
    depth0: 12,
    depthSpan: 28,
    rate0: 0.28,
    rateSpan: 0.7,
  },
  {
    axis: 'drift',
    kind: 'delay',
    slot: 1,
    target: 'delayPan',
    shape: 'sine',
    depth0: 18,
    depthSpan: 32,
    rate0: 0.14,
    rateSpan: 0.4,
  },
  {
    axis: 'pan',
    kind: 'input',
    slot: 0,
    target: 'pan',
    shape: 'sine',
    depth0: 38,
    depthSpan: 62,
    rate0: 0.55,
    rateSpan: 1.7,
  },
  {
    axis: 'veil',
    kind: 'reverb',
    slot: 1,
    target: 'reverbDamping',
    shape: 'sine',
    depth0: 10,
    depthSpan: 18,
    rate0: 0.1,
    rateSpan: 0.18,
  },
  {
    axis: 'halo',
    kind: 'reverb',
    slot: 2,
    target: 'reverbEarly',
    shape: 'sine',
    depth0: 8,
    depthSpan: 16,
    rate0: 0.14,
    rateSpan: 0.24,
  },
    {
    axis: 'well',
    kind: 'eq2',
    slot: 0,
    target: 'eq2Gain',
    shape: 'triangle',
    depth0: 10,
    depthSpan: 16,
    rate0: 0.16,
    rateSpan: 0.28,
  },
  {
    axis: 'sweep',
    kind: 'filter',
    slot: 0,
    target: 'filterCutoff',
    shape: 'sine',
    depth0: 18,
    depthSpan: 42,
    rate0: 0.12,
    rateSpan: 0.45,
  },
  {
    axis: 'peak',
    kind: 'filter',
    slot: 1,
    target: 'filterReso',
    shape: 'sine',
    depth0: 10,
    depthSpan: 22,
    rate0: 0.18,
    rateSpan: 0.4,
  },
  {
    axis: 'melt',
    kind: 'filter',
    slot: 2,
    target: 'filterCutoff',
    shape: 'triangle',
    depth0: 12,
    depthSpan: 28,
    rate0: 0.08,
    rateSpan: 0.22,
  },
]

export const AXIS_LFO_BY_ID: Partial<Record<SensoryAxisId, AxisLfoBind>> = Object.fromEntries(
  AXIS_LFOS.map((bind) => [bind.axis, bind]),
)

export function axisLfoAmount(value: number): number {
  const t = Math.abs(value)
  return t < MORPH_GATE ? 0 : Math.min(1, t)
}

export function axisLfoActive(value: number): boolean {
  return axisLfoAmount(value) > 0
}

export function resolvedAxisLfo(bind: AxisLfoBind, value: number): { depth: number; rateHz: number } | null {
  const u = axisLfoAmount(value)
  if (u <= 0) return null
  return {
    depth: Math.round(bind.depth0 + bind.depthSpan * u),
    rateHz: Number((bind.rate0 + bind.rateSpan * u).toFixed(2)),
  }
}
