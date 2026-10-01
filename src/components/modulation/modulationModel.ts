import { laneFor, type AutomationDocument } from '../../audio/automation/automation'
import {
  EQ_BAND_LFO_IDS,
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
