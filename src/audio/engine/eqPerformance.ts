import {
  resolvePerformanceParams,
  type AutomationDocument,
} from '../automation/automation'
import {
  EQ_BAND_LFO_IDS,
  liveEqBandsFromParams,
  type FxLfoMap,
  type LfoHoldState,
} from '../fx/lfo'
import type { ParamId } from '../parameters/types'
import type { EqChannelMode } from './eqGraph'

/**
 * Clock shared by the live engine and offline export.
 * One sample of this clock must feed every EQ destination so sample-and-hold
 * does not step twice and left/right do not drift apart.
 */
export type EqModClock = {
  transportSec: number
  lfoTimeSec: number
  playing: boolean
  hold: LfoHoldState
  rand?: () => number
  /** Normalized Random offsets applied only while automation owns the center. */
  randomOffsets?: Partial<Record<ParamId, number>>
}

type EqCenterBand = { frequency: number; gain: number; q: number }

/**
 * The EQ band is the manual center. Shadow params (`eqNFreq` and friends)
 * exist so LFO and automation have a stable id, but a stale shadow must not
 * replace the band the user is hearing.
 */
export function withEqBandCenters(
  params: Record<ParamId, number>,
  bands: readonly EqCenterBand[],
): Record<ParamId, number> {
  let next: Record<ParamId, number> | null = null
  const count = Math.min(bands.length, EQ_BAND_LFO_IDS.length)
  for (let i = 0; i < count; i++) {
    const band = bands[i]
    const ids = EQ_BAND_LFO_IDS[i]
    if (!band || !ids) continue
    const { frequency, gain, q } = band
    if (!Number.isFinite(frequency) || !Number.isFinite(gain) || !Number.isFinite(q)) continue
    if (params[ids.freq] === frequency && params[ids.gain] === gain && params[ids.q] === q) continue
    if (!next) next = { ...params }
    next[ids.freq] = frequency
    next[ids.gain] = gain
    next[ids.q] = q
  }
  return next ?? params
}

/**
 * BASE (band) → automation center while playing → Random offset → relative LFO.
 * Bands past the shared registry are returned unchanged.
 */
export function modulatedEqBands<T extends EqCenterBand>(
  bands: readonly T[],
  manual: Record<ParamId, number>,
  automation: AutomationDocument,
  clock: EqModClock,
  lfos: FxLfoMap,
): { bands: T[]; live: Record<ParamId, number> } {
  const centered = withEqBandCenters(manual, bands)
  const live = resolvePerformanceParams(
    centered,
    automation,
    clock.transportSec,
    clock.playing,
    lfos,
    clock.lfoTimeSec,
    clock.hold,
    clock.rand,
    clock.randomOffsets,
  )
  return { bands: liveEqBandsFromParams(bands, live), live }
}

/** Lists actually written to the left and right EQ lanes. */
export function eqHeardBandLists<T>(
  mode: EqChannelMode,
  shared: T[],
  left: T[],
  right: T[],
): { left: T[]; right: T[] } {
  return {
    left: mode !== 'shared' && left.length > 0 ? left : shared,
    right: mode !== 'shared' && right.length > 0 ? right : shared,
  }
}
