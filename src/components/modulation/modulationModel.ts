import { laneFor, type AutomationDocument } from '../../audio/automation/automation'
import {
  EQ_BAND_LFO_IDS,
  eqBandLfoIds,
  fxLfoIsActive,
  fxLfoKindForParam,
  lfoBinding,
  lfoRangeNormalized,
  type FxLfoKind,
  type FxLfoMap,
} from '../../audio/fx/lfo'
import { PARAMS } from '../../audio/parameters/definitions'
import { fromNormalized, toNormalized } from '../../audio/parameters/mapping'
import type { ParamId } from '../../audio/parameters/types'

/**
 * Sources the Technical modulation editor can offer.
 * Add a member here only when that source exists in the shared DSP.
 */
export const MODULATION_SOURCES = ['lfo', 'automation'] as const
export type ModulationSourceId = (typeof MODULATION_SOURCES)[number]

export type ParameterModulationState = {
  paramId: ParamId
  /** The parameter is a target in the shared LFO / automation registry. */
  supportsModulation: boolean
  sources: readonly ModulationSourceId[]
  /**
   * A shared LFO slot is assigned to this parameter.
   * Independent of whether the editor is open.
   */
  hasLfoInstance: boolean
  /**
   * That slot's route points at this parameter.
   * Assignment is the connection in the current DSP.
   */
  isLfoConnected: boolean
  /** Connected and depth > 0: the oscillator is actually moving the parameter. */
  lfoActive: boolean
  /** The automation lane has nodes. Separate from the LFO route. */
  automationActive: boolean
  /** Presentation only. Opening or closing this must not change routing. */
  editorOpen: boolean
  depthPct: number
  /** Normalized swing around the stored center. Null unless LFO DSP is active. */
  range: { min: number; max: number } | null
  binding: { kind: FxLfoKind; slot: number } | null
}

export function parameterModulationState(input: {
  lfos: FxLfoMap
  automation: AutomationDocument
  paramId: ParamId
  /** Stored / manual center in normalized parameter space. */
  baseNormalized: number
  editorOpen: boolean
}): ParameterModulationState {
  const supportsModulation = fxLfoKindForParam(input.paramId) != null
  const found = supportsModulation ? lfoBinding(input.lfos, input.paramId) : null
  const connected = Boolean(found?.lfo.target === input.paramId)
  const lfoActive = Boolean(found && fxLfoIsActive(found.lfo))
  const depthPct = found?.lfo.depth ?? 0
  const lane = laneFor(input.automation, input.paramId)
  return {
    paramId: input.paramId,
    supportsModulation,
    sources: supportsModulation ? MODULATION_SOURCES : [],
    hasLfoInstance: connected,
    isLfoConnected: connected,
    lfoActive,
    automationActive: (lane?.nodes.length ?? 0) > 0,
    editorOpen: input.editorOpen,
    depthPct,
    range: lfoActive ? lfoRangeNormalized(input.baseNormalized, depthPct) : null,
    binding: found ? { kind: found.kind, slot: found.slot } : null,
  }
}

/** Compact active-state label, e.g. depth 18 → "±18%". */
export function formatModulationDepth(depthPct: number): string {
  const pct = Math.round(Math.min(100, Math.max(0, depthPct)))
  return `±${pct}%`
}

export type ModulationAffordanceModel = {
  depthLabel: string | null
  /** Both sources are moving the parameter. */
  automationMark: boolean
}

/** What the touch row shows. Editor disclosure is not part of this. */
export function modulationAffordanceModel(state: ParameterModulationState): ModulationAffordanceModel {
  return {
    depthLabel: state.lfoActive ? formatModulationDepth(state.depthPct) : null,
    automationMark: state.lfoActive && state.automationActive,
  }
}

/** Selected EQ band field → shared LFO target. Unsupported bands stay null. */
export function eqModulationParamId(index: number, field: 'freq' | 'gain' | 'q'): ParamId | null {
  const ids = eqBandLfoIds(index)
  if (!ids) return null
  if (field === 'freq') return ids.freq
  if (field === 'gain') return ids.gain
  return ids.q
}

export type SliderModulationMarks = {
  /** Stored center. The thumb stays here. */
  thumb: number
  range: { left: number; width: number } | null
  /** Current modulated position. Separate from the thumb. */
  live: number | null
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

/**
 * Slider presentation for an active LFO.
 * `live` is omitted unless the range exists, so a closed editor cannot invent motion.
 */
export function sliderModulationMarks(input: {
  center: number
  range: { min: number; max: number } | null
  live: number | null
}): SliderModulationMarks {
  const thumb = clamp01(input.center)
  if (!input.range) return { thumb, range: null, live: null }
  const min = clamp01(input.range.min)
  const max = clamp01(input.range.max)
  const live = input.live != null && Number.isFinite(input.live) ? clamp01(input.live) : null
  return {
    thumb,
    range: { left: min * 100, width: Math.max(0, (max - min) * 100) },
    live,
  }
}

/** Actual LFO swing in parameter units around a stored center. */
export function activeLfoSpan(
  lfos: FxLfoMap,
  id: ParamId,
  base: number,
): { min: number; max: number } | null {
  const binding = lfoBinding(lfos, id)
  if (!binding || !fxLfoIsActive(binding.lfo)) return null
  const def = PARAMS[id]
  const span = lfoRangeNormalized(toNormalized(base, def), binding.lfo.depth)
  return {
    min: fromNormalized(span.min, def),
    max: fromNormalized(span.max, def),
  }
}

export type EqModulationGuides = {
  frequency: { minHz: number; maxHz: number } | null
  gain: { minDb: number; maxDb: number } | null
}

/** Selected-node guides. Frequency is horizontal, gain is vertical. Q stays off the graph. */
export function eqModulationGuides(
  lfos: FxLfoMap,
  index: number,
  band: { frequency: number; gain: number },
): EqModulationGuides {
  const pair = EQ_BAND_LFO_IDS[index]
  if (!pair) return { frequency: null, gain: null }
  const frequency = activeLfoSpan(lfos, pair.freq, band.frequency)
  const gain = activeLfoSpan(lfos, pair.gain, band.gain)
  return {
    frequency: frequency ? { minHz: frequency.min, maxHz: frequency.max } : null,
    gain: gain ? { minDb: gain.min, maxDb: gain.max } : null,
  }
}
