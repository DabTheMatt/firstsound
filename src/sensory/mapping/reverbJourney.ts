import { findSpacePreset } from '../../audio/fx/presets'
import type { ReverbType } from '../../audio/fx/types'
import type { ParamId } from '../../audio/parameters/types'
import { MORPH_GATE } from './morph'
import type { SensoryValues } from '../sensoryState'

export type ReverbJourneyPoint = {
  type: ReverbType
  params: Partial<Record<ParamId, number>>
}

type Stage = {
  t: number
  id: string
  wetScale?: number
}

/** Space travels through named room presets instead of one hall getting wetter. */
const SPACE_STAGES: readonly Stage[] = [
  { t: 0, id: 'rv-amb', wetScale: 0 },
  { t: 0.14, id: 'rv-small' },
  { t: 0.28, id: 'rv-big' },
  { t: 0.42, id: 'rv-vocal-hall' },
  { t: 0.56, id: 'rv-vocal-plate' },
  { t: 0.7, id: 'rv-bloom' },
  { t: 0.84, id: 'rv-shimmer' },
  { t: 1, id: 'rv-cathedral' },
]

const PULLS: readonly { axis: keyof SensoryValues; id: string; weight: number }[] = [
  { axis: 'bloom', id: 'rv-bloom', weight: 1 },
  { axis: 'plate', id: 'rv-vocal-plate', weight: 1 },
  { axis: 'spring', id: 'rv-spring', weight: 1 },
  { axis: 'shimmer', id: 'rv-shimmer', weight: 1 },
  { axis: 'reverse', id: 'rv-reverse', weight: 1 },
  { axis: 'gate', id: 'rv-gated', weight: 1 },
  { axis: 'veil', id: 'rv-wash', weight: 0.85 },
  { axis: 'halo', id: 'rv-dreamy', weight: 0.8 },
  { axis: 'well', id: 'rv-abyss', weight: 0.75 },
]

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

function pointFromPreset(id: string, wetScale = 1): ReverbJourneyPoint {
  const preset = findSpacePreset(id)
  const type = (preset?.reverbType ?? 'hall') as ReverbType
  const params: Partial<Record<ParamId, number>> = { ...(preset?.params ?? {}) }
  if (params.reverbWet != null) params.reverbWet = params.reverbWet * wetScale
  return { type, params }
}

function lerpParams(
  a: Partial<Record<ParamId, number>>,
  b: Partial<Record<ParamId, number>>,
  u: number,
): Partial<Record<ParamId, number>> {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<ParamId>
  const out: Partial<Record<ParamId, number>> = {}
  for (const id of keys) {
    const av = a[id]
    const bv = b[id]
    if (av == null && bv == null) continue
    const left = av ?? bv ?? 0
    const right = bv ?? av ?? 0
    out[id] = left + (right - left) * u
  }
  return out
}

function stagePoint(stage: Stage): ReverbJourneyPoint {
  return pointFromPreset(stage.id, stage.wetScale ?? 1)
}

/** Interpolate the space axis through the preset path. */
export function spaceReverbPath(space01: number): ReverbJourneyPoint {
  const t = clamp01(space01)
  const first = SPACE_STAGES[0]!
  const last = SPACE_STAGES[SPACE_STAGES.length - 1]!
  if (t <= first.t) return stagePoint(first)
  if (t >= last.t) return stagePoint(last)
  for (let i = 0; i < SPACE_STAGES.length - 1; i++) {
    const a = SPACE_STAGES[i]!
    const b = SPACE_STAGES[i + 1]!
    if (t < a.t || t > b.t) continue
    const span = b.t - a.t
    const u = span <= 1e-6 ? 0 : (t - a.t) / span
    const pa = stagePoint(a)
    const pb = stagePoint(b)
    return {
      type: u < 0.5 ? pa.type : pb.type,
      params: lerpParams(pa.params, pb.params, u),
    }
  }
  return stagePoint(last)
}

function addWeighted(
  acc: Partial<Record<ParamId, number>>,
  src: Partial<Record<ParamId, number>>,
  w: number,
): void {
  for (const [key, value] of Object.entries(src)) {
    if (value == null) continue
    const id = key as ParamId
    acc[id] = (acc[id] ?? 0) + value * w
  }
}

/**
 * Space walks through room → hall → plate → bloom → shimmer → cathedral.
 * Bloom / vinyl-adjacent space feelings pull the same path toward their preset.
 */
export function sensoryReverbJourney(values: SensoryValues): ReverbJourneyPoint {
  const space = clamp01(values.space)
  const base = spaceReverbPath(space)
  const pulls: { w: number; point: ReverbJourneyPoint }[] = []
  if (space >= MORPH_GATE) pulls.push({ w: 0.72 + space * 0.28, point: base })
  for (const pull of PULLS) {
    const amount = clamp01(Number(values[pull.axis]) || 0)
    if (amount < MORPH_GATE) continue
    pulls.push({ w: amount * pull.weight, point: pointFromPreset(pull.id) })
  }
  if (pulls.length === 0) {
    return { type: 'hall', params: { ...base.params, reverbWet: 0 } }
  }
  const total = pulls.reduce((sum, p) => sum + p.w, 0)
  const params: Partial<Record<ParamId, number>> = {}
  let best = pulls[0]!
  for (const pull of pulls) {
    addWeighted(params, pull.point.params, pull.w / total)
    if (pull.w > best.w) best = pull
  }
  const specialty = pulls.length > 1 || space < MORPH_GATE
  if (!specialty && params.reverbWet != null) {
    params.reverbWet *= 0.4 + space * 0.6
  }
  if (!specialty) params.reverbEarly = Math.max(params.reverbEarly ?? 0, 44 + space * 34)
  return { type: best.point.type, params }
}

export function journeyHasReverb(values: SensoryValues): boolean {
  if (values.space >= MORPH_GATE) return true
  return PULLS.some((pull) => clamp01(Number(values[pull.axis]) || 0) >= MORPH_GATE)
}
