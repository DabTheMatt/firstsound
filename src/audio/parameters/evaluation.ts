import {
  applyAutomation,
  envelopeToParam,
  laneFor,
  sampleEnvelope,
  type AutomationDocument,
} from '../automation/automation'
import {
  anyFxLfoActive,
  fittedLfoDepth,
  fxLfoBipolar,
  lfoBinding,
  lfoRangeNormalized,
  offsetFxLfos,
  type FxLfoMap,
  type LfoHoldState,
} from '../fx/lfo'
import { applyParamLinks } from './links'
import { PARAMS } from './definitions'
import { applyParamValue, fromNormalized, toNormalized } from './mapping'
import type { ParamId } from './types'

/**
 * One evaluation path for a DSP parameter:
 *
 *   baseValue
 *   → automatedCenter   (absolute lane while transport runs; otherwise base)
 *   → relative LFO      (bipolar, in the parameter's normalized domain)
 *   → safe range        (fitted depth, then clamp)
 *   → denormalize
 *   → DSP
 *
 * Automation is not an additive offset. The LFO orbits the center that
 * automation currently holds, not a stale manual value. Both stages produce
 * one number. Callers schedule that number once. They do not give Automation
 * and LFO separate AudioParam writers.
 *
 * Linked pairs (delay correlate, L/R link) resolve after both stages, in one
 * pass, so a preferred side that automation owns is not overwritten by an LFO
 * on the other side.
 *
 * A later filter-only stage (pitch track, envelope follower, ADSR) may still
 * offset cutoff after this result. It reads the resolved value. It does not
 * schedule a second timeline on the same AudioParam.
 *
 * Future relative sources (sensory macro, envelope follower) should add a
 * normalized offset beside the LFO term and share this safe-range fit. This
 * module does not implement those sources. One LFO binding per parameter stays.
 */

export type PerformanceResolution = {
  /** Automation + relative LFO + link followers. This is what DSP modules receive. */
  values: Record<ParamId, number>
  /**
   * Absolute center before relative LFO and before link followers.
   * Same object as `manual` when the transport is stopped and no LFO is running,
   * so a stopped read cannot rewrite stored knobs.
   */
  centers: Record<ParamId, number>
}

export function resolvePerformance(
  manual: Record<ParamId, number>,
  automation: AutomationDocument,
  timeSec: number,
  playing: boolean,
  lfos: FxLfoMap,
  lfoTimeSec: number,
  hold: LfoHoldState,
  rand?: () => number,
): PerformanceResolution {
  const automated = playing ? applyAutomation(manual, automation, timeSec) : manual
  const lfoOn = anyFxLfoActive(lfos)
  if (automated === manual && !lfoOn) return { values: manual, centers: manual }

  const centers = { ...automated }
  const values = lfoOn ? offsetFxLfos(centers, lfos, lfoTimeSec, hold, rand).values : { ...centers }
  const changed: ParamId[] = []
  for (const id of Object.keys(values) as ParamId[]) {
    if (values[id] !== manual[id]) changed.push(id)
  }
  if (changed.length > 0) applyParamLinks(values, changed)
  return { values, centers }
}

/** DSP numbers only. Same path as `resolvePerformance`. */
export function resolvePerformanceParams(
  manual: Record<ParamId, number>,
  automation: AutomationDocument,
  timeSec: number,
  playing: boolean,
  lfos: FxLfoMap,
  lfoTimeSec: number,
  hold: LfoHoldState,
  rand?: () => number,
): Record<ParamId, number> {
  return resolvePerformance(manual, automation, timeSec, playing, lfos, lfoTimeSec, hold, rand).values
}

/** True while a lane with nodes replaces the manual center. Stopped transport keeps the base. */
export function automationOwnsCenter(doc: AutomationDocument, id: ParamId, playing: boolean): boolean {
  if (!playing) return false
  return (laneFor(doc, id)?.nodes.length ?? 0) > 0
}

/**
 * Center a control should orbit. `publishedCenter` comes from the engine
 * (already evaluated). Stopped transport, or a parameter with no lane, stays
 * on the stored value so the arc does not drift from the knob.
 */
export function modulationCenterValue(
  id: ParamId,
  storedValue: number,
  publishedCenter: number,
  automation: AutomationDocument,
  playing: boolean,
): number {
  return automationOwnsCenter(automation, id, playing) ? publishedCenter : storedValue
}

export type ParamModulationView = {
  baseValue: number
  centerValue: number
  centerNorm: number
  automationActive: boolean
  /** Bipolar LFO sample in [-1, 1]. Zero when this parameter has no active LFO. */
  lfoOutput: number
  /** Fitted depth in normalized units. */
  depthNorm: number
  /** Signed normalized offset around the center, before link followers. */
  offsetNorm: number
  rangeNorm: { min: number; max: number }
  rangeValue: { min: number; max: number }
  /** Value after automation, LFO, and links. Filter envelope is not included. */
  finalValue: number
}

/**
 * Read one parameter's stages. Uses the same evaluation as DSP.
 * Mutates `hold` the same way a performance tick does — pass a copy if the
 * engine's sample-and-hold state must stay put.
 */
export function describeParamModulation(
  manual: Record<ParamId, number>,
  automation: AutomationDocument,
  timeSec: number,
  playing: boolean,
  lfos: FxLfoMap,
  lfoTimeSec: number,
  hold: LfoHoldState,
  id: ParamId,
  rand?: () => number,
): ParamModulationView {
  const resolved = resolvePerformance(manual, automation, timeSec, playing, lfos, lfoTimeSec, hold, rand)
  const binding = lfoBinding(lfos, id)
  const active = Boolean(binding && binding.lfo.depth > 0 && binding.lfo.target === id)
  const depthPct = active && binding ? binding.lfo.depth : 0
  const lfoOutput =
    active && binding
      ? fxLfoBipolar(binding.lfo, lfoTimeSec, hold[binding.kind][binding.slot]?.value ?? 0)
      : 0
  return modulationViewFromParts(
    id,
    manual[id],
    resolved.centers[id],
    resolved.values[id],
    depthPct,
    automationOwnsCenter(automation, id, playing),
    lfoOutput,
  )
}

/**
 * Stages from values the engine already published. Does not sample envelopes,
 * advance sample-and-hold, or schedule audio. React can read this during render.
 */
export function readParamModulation(
  id: ParamId,
  baseValue: number,
  centerValue: number,
  finalValue: number,
  depthPct: number,
  automationActive: boolean,
  lfoOutput = 0,
): ParamModulationView {
  return modulationViewFromParts(id, baseValue, centerValue, finalValue, depthPct, automationActive, lfoOutput)
}

function modulationViewFromParts(
  id: ParamId,
  baseValue: number,
  centerValue: number,
  finalValue: number,
  depthPct: number,
  automationActive: boolean,
  lfoOutput: number,
): ParamModulationView {
  const def = PARAMS[id]
  const center = automationActive ? centerValue : baseValue
  const centerNorm = toNormalized(center, def)
  const depthNorm = depthPct > 0 ? fittedLfoDepth(centerNorm, depthPct) : 0
  const rangeNorm = depthPct > 0 ? lfoRangeNormalized(centerNorm, depthPct) : { min: centerNorm, max: centerNorm }
  const bipolar = Math.min(1, Math.max(-1, lfoOutput))
  return {
    baseValue,
    centerValue: center,
    centerNorm,
    automationActive,
    lfoOutput: bipolar,
    depthNorm,
    offsetNorm: bipolar * depthNorm,
    rangeNorm,
    rangeValue: {
      min: applyParamValue(fromNormalized(rangeNorm.min, def), def),
      max: applyParamValue(fromNormalized(rangeNorm.max, def), def),
    },
    finalValue,
  }
}

/** Physical center at `timeSec`, before LFO. Stopped transport returns the base. */
export function automatedCenterValue(
  baseValue: number,
  id: ParamId,
  automation: AutomationDocument,
  timeSec: number,
  playing: boolean,
): number {
  if (!automationOwnsCenter(automation, id, playing)) return applyParamValue(baseValue, PARAMS[id])
  const nodes = laneFor(automation, id)?.nodes
  if (!nodes || nodes.length === 0) return applyParamValue(baseValue, PARAMS[id])
  const sample = sampleEnvelope(nodes, timeSec)
  if (sample == null) return applyParamValue(baseValue, PARAMS[id])
  return envelopeToParam(id, sample)
}
