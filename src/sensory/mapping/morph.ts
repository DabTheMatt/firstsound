import type { EqBand, EqFilterType } from '../../audio/engine/eqBands'
import type { ParamId } from '../../audio/parameters/types'
import type { ModuleType } from '../../audio/chain/chain'
import type { DistortionType, ReverbType } from '../../audio/fx/types'

export type MorphEqBand = {
  band: number
  type: EqFilterType
  frequency: number
  gain: number
  q: number
}

export type MorphStop = {
  t: number
  params?: Partial<Record<ParamId, number>>
  eq?: readonly MorphEqBand[]
}

export type EffectMorph = {
  axis: string
  module: ModuleType
  /** Extra inserts this feeling un-bypasses (hybrids that braid several effects). */
  modules?: readonly ModuleType[]
  reverbType?: ReverbType
  distortionType?: DistortionType
  stops: readonly MorphStop[]
}

export const MORPH_GATE = 0.04

function lerp(a: number, b: number, u: number): number {
  return a + (b - a) * u
}

function lerpType(a: EqFilterType, b: EqFilterType, u: number): EqFilterType {
  if (a === b) return a
  if (a === 'off') return u < 0.12 ? 'off' : b
  if (b === 'off') return u > 0.88 ? 'off' : a
  return u < 0.5 ? a : b
}

function stopIndexPair(stops: readonly MorphStop[], t: number): { a: MorphStop; b: MorphStop; u: number } {
  const sorted = stops
  if (sorted.length === 0) return { a: { t: 0 }, b: { t: 0 }, u: 0 }
  const first = sorted[0]!
  const last = sorted[sorted.length - 1]!
  if (t <= first.t) return { a: first, b: first, u: 0 }
  if (t >= last.t) return { a: last, b: last, u: 1 }
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]!
    const b = sorted[i + 1]!
    if (t >= a.t && t <= b.t) {
      const span = b.t - a.t
      return { a, b, u: span === 0 ? 0 : (t - a.t) / span }
    }
  }
  return { a: last, b: last, u: 1 }
}

export function interpolateMorphStop(stops: readonly MorphStop[], t: number): MorphStop {
  const { a, b, u } = stopIndexPair(stops, t)
  const keys = new Set([...Object.keys(a.params ?? {}), ...Object.keys(b.params ?? {})]) as Set<ParamId>
  const params: Partial<Record<ParamId, number>> = {}
  for (const id of keys) {
    const av = a.params?.[id]
    const bv = b.params?.[id]
    if (av == null && bv == null) continue
    params[id] = lerp(av ?? bv ?? 0, bv ?? av ?? 0, u)
  }
  const eqByBand = new Map<number, MorphEqBand>()
  const bands = new Set([...(a.eq ?? []).map((e) => e.band), ...(b.eq ?? []).map((e) => e.band)])
  for (const band of bands) {
    const ae = a.eq?.find((e) => e.band === band)
    const be = b.eq?.find((e) => e.band === band)
    const src = ae ?? be
    const dst = be ?? ae
    if (!src || !dst) continue
    eqByBand.set(band, {
      band,
      type: lerpType(src.type, dst.type, u),
      frequency: lerp(src.frequency, dst.frequency, u),
      gain: lerp(src.gain, dst.gain, u),
      q: lerp(src.q, dst.q, u),
    })
  }
  return {
    t,
    params,
    eq: [...eqByBand.values()].sort((x, y) => x.band - y.band),
  }
}

export function applyMorphStopToBands(bands: EqBand[], stop: MorphStop): void {
  for (const spec of stop.eq ?? []) {
    const current = bands[spec.band]
    if (!current) continue
    bands[spec.band] = {
      ...current,
      type: spec.type,
      frequency: spec.frequency,
      gain: spec.gain,
      q: spec.q,
      bypassed: false,
    }
  }
}
