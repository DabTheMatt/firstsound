import { envelopeToParam, laneFor, sampleEnvelope, type AutomationDocument } from '../../audio/automation/automation'
import { bandUsesGain, bandwidthHz, type EqFilterType } from '../../audio/engine/eqBands'
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

/**
 * Focus EQ can offer modulation only for a field the shared bank actually owns.
 * A secondary EQ, a later band, or a filter without gain stays quiet.
 */
export function eqFocusModulationParam(
  index: number,
  field: 'freq' | 'gain' | 'q',
  bandType: EqFilterType,
  shared: boolean,
): ParamId | null {
  if (!shared) return null
  if (field === 'gain' && !bandUsesGain(bandType)) return null
  return eqModulationParamId(index, field)
}

export type EqFocusModulationFrame =
  | { kind: 'none' }
  | { kind: 'horizontal'; left: number; width: number; centerY: number }
  | { kind: 'vertical'; centerX: number; top: number; height: number }
  | { kind: 'area'; left: number; width: number; top: number; height: number }

function axisSpan(a: number, b: number): { start: number; size: number } | null {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null
  const start = Math.min(a, b)
  const size = Math.abs(b - a)
  if (!(size > 0)) return null
  return { start, size }
}

/**
 * Selected-node range in plot percent.
 * Frequency is horizontal, gain is vertical, and both together are one area.
 */
export function eqFocusModulationFrame(input: {
  x: number
  y: number
  freqX: readonly [number, number] | null
  gainY: readonly [number, number] | null
}): EqFocusModulationFrame {
  const freq = input.freqX ? axisSpan(input.freqX[0], input.freqX[1]) : null
  const gain = input.gainY ? axisSpan(input.gainY[0], input.gainY[1]) : null
  if (freq && gain) {
    return { kind: 'area', left: freq.start, width: freq.size, top: gain.start, height: gain.size }
  }
  if (freq) return { kind: 'horizontal', left: freq.start, width: freq.size, centerY: input.y }
  if (gain) return { kind: 'vertical', centerX: input.x, top: gain.start, height: gain.size }
  return { kind: 'none' }
}

/**
 * Automation Focus may admit that an LFO is also connected.
 * The cue is separate from the lane: it never describes a mixed curve.
 */
export function automationFocusLfoCue(
  state: Pick<ParameterModulationState, 'isLfoConnected' | 'lfoActive' | 'automationActive' | 'depthPct'>,
): { visible: boolean; depthLabel: string | null } {
  if (!state.automationActive || !state.isLfoConnected) return { visible: false, depthLabel: null }
  return {
    visible: true,
    depthLabel: state.lfoActive ? formatModulationDepth(state.depthPct) : null,
  }
}

export type SliderModulationMarks = {
  /** Current effective position. Falls back to the stored center. */
  thumb: number
  range: { left: number; width: number } | null
  /** Kept empty so a second marker does not compete with the thumb. */
  live: number | null
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

/**
 * Slider presentation for an active LFO.
 * The thumb is the effective value. The range band is secondary.
 */
export function sliderModulationMarks(input: {
  center: number
  range: { min: number; max: number } | null
  live: number | null
}): SliderModulationMarks {
  const centerN = clamp01(input.center)
  if (!input.range) return { thumb: centerN, range: null, live: null }
  const min = clamp01(input.range.min)
  const max = clamp01(input.range.max)
  const live = input.live != null && Number.isFinite(input.live) ? clamp01(input.live) : null
  return {
    thumb: live ?? centerN,
    range: { left: min * 100, width: Math.max(0, (max - min) * 100) },
    live: null,
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

/**
 * Automation replaces the manual center only while transport is running.
 * Stopped playback keeps the stored value, matching resolvePerformanceParams.
 */
export function automatedParamValue(
  automation: AutomationDocument,
  id: ParamId,
  manual: number,
  timeSec: number,
  playing: boolean,
): number {
  if (!playing) return manual
  const lane = laneFor(automation, id)
  if (!lane || lane.nodes.length === 0) return manual
  const normalized = sampleEnvelope(lane.nodes, timeSec)
  if (normalized == null) return manual
  return envelopeToParam(id, normalized)
}

/** EQ guide center: stored band, or the automated value while playing. */
export function eqModulationCenter(
  automation: AutomationDocument,
  index: number,
  band: { frequency: number; gain: number },
  timeSec: number,
  playing: boolean,
): { frequency: number; gain: number } {
  const pair = EQ_BAND_LFO_IDS[index]
  if (!pair) return { frequency: band.frequency, gain: band.gain }
  return {
    frequency: automatedParamValue(automation, pair.freq, band.frequency, timeSec, playing),
    gain: automatedParamValue(automation, pair.gain, band.gain, timeSec, playing),
  }
}

/** Selected-node guides. Frequency is horizontal, gain is vertical. Q stays off the graph. */
export function eqModulationGuides(
  lfos: FxLfoMap,
  index: number,
  band: { frequency: number; gain: number },
  center?: { frequency: number; gain: number },
): EqModulationGuides {
  const pair = EQ_BAND_LFO_IDS[index]
  if (!pair) return { frequency: null, gain: null }
  const frequency = activeLfoSpan(lfos, pair.freq, center?.frequency ?? band.frequency)
  const gain = activeLfoSpan(lfos, pair.gain, center?.gain ?? band.gain)
  return {
    frequency: frequency ? { minHz: frequency.min, maxHz: frequency.max } : null,
    gain: gain ? { minDb: gain.min, maxDb: gain.max } : null,
  }
}

/** Normalized live position for a knob or slider. Omitted unless the LFO is actually moving DSP. */
export function liveControlNormalized(live: number | undefined, id: ParamId, active: boolean): number | undefined {
  if (!active || live == null || !Number.isFinite(live)) return undefined
  return toNormalized(live, PARAMS[id])
}

const WIDTH_MIN_HZ = 10
const WIDTH_MAX_HZ = 10000

/** Bandwidth knob space. Matches the EQ width dial (10 Hz … 10 kHz, logarithmic). */
export function widthNorm(hz: number): number {
  const min = Math.log(WIDTH_MIN_HZ)
  const max = Math.log(WIDTH_MAX_HZ)
  const clamped = Math.min(WIDTH_MAX_HZ, Math.max(WIDTH_MIN_HZ, hz))
  return (Math.log(clamped) - min) / (max - min)
}

/**
 * Q modulation drawn in width-knob space.
 * The arc ends are the DSP Q extremes converted through bandwidth, not a Q-normalized arc pasted onto the width dial.
 */
export function widthModulationRange(
  lfos: FxLfoMap,
  id: ParamId,
  frequency: number,
  q: number,
): { min: number; max: number } | undefined {
  const span = activeLfoSpan(lfos, id, q)
  if (!span) return undefined
  const low = widthNorm(bandwidthHz(frequency, span.max))
  const high = widthNorm(bandwidthHz(frequency, span.min))
  return { min: Math.min(low, high), max: Math.max(low, high) }
}

export function liveWidthNormalized(frequency: number, liveQ: number | undefined): number | undefined {
  if (liveQ == null || !Number.isFinite(liveQ)) return undefined
  return widthNorm(bandwidthHz(frequency, liveQ))
}

export type EqNodeMotion = {
  /** Horizontal position. Logarithmic mapping stays with the graph. */
  frequencyHz: number
  /** Vertical gain used when the filter exposes gain. */
  gainDb: number
  /** Q used to place the node. Stays at the center so Q does not invent XY motion. */
  q: number
  /** Q the response should hear. */
  heardQ: number
  centerHz: number
  centerGainDb: number
  centerQ: number
  freqOffset: boolean
  gainOffset: boolean
  qLive: boolean
}

const FREQ_OFFSET_RATIO = 0.002
const GAIN_OFFSET_DB = 0.05
const Q_OFFSET = 0.01

function lfoAxisLive(lfos: FxLfoMap, id: ParamId | undefined, allow: boolean): boolean {
  if (!allow || !id) return false
  const binding = lfoBinding(lfos, id)
  return Boolean(binding && fxLfoIsActive(binding.lfo))
}

function finiteOr(value: number | undefined, fallback: number): number {
  return value != null && Number.isFinite(value) ? value : fallback
}

/**
 * Where the colored EQ node sits.
 * Frequency and gain come from the current DSP value. Q changes the response, not the node.
 * A drag writes the center, so the node follows the pointer instead of fighting the LFO.
 */
export function eqNodeMotion(input: {
  band: { type: EqFilterType; frequency: number; gain: number; q: number }
  index: number
  lfos: FxLfoMap
  automation: AutomationDocument
  live: Record<ParamId, number> | null
  timeSec: number
  playing: boolean
  dragging: boolean
  modulate: boolean
}): EqNodeMotion {
  const center = eqModulationCenter(input.automation, input.index, input.band, input.timeSec, input.playing)
  const ids = EQ_BAND_LFO_IDS[input.index]
  const allow = input.modulate && !input.dragging
  const freqOn = lfoAxisLive(input.lfos, ids?.freq, allow)
  const gainOn = lfoAxisLive(input.lfos, ids?.gain, allow) && bandUsesGain(input.band.type)
  const qOn = lfoAxisLive(input.lfos, ids?.q, allow)
  const frequencyHz = freqOn ? finiteOr(ids ? input.live?.[ids.freq] : undefined, center.frequency) : center.frequency
  const gainDb = gainOn ? finiteOr(ids ? input.live?.[ids.gain] : undefined, center.gain) : center.gain
  const heardQ = qOn ? finiteOr(ids ? input.live?.[ids.q] : undefined, input.band.q) : input.band.q
  const freqOffset =
    freqOn &&
    center.frequency > 0 &&
    frequencyHz > 0 &&
    Math.abs(Math.log(frequencyHz) - Math.log(center.frequency)) > FREQ_OFFSET_RATIO
  const gainOffset = gainOn && Math.abs(gainDb - center.gain) > GAIN_OFFSET_DB
  const qLive = qOn && Math.abs(heardQ - input.band.q) > Q_OFFSET
  return {
    frequencyHz,
    gainDb,
    q: input.band.q,
    heardQ,
    centerHz: center.frequency,
    centerGainDb: center.gain,
    centerQ: input.band.q,
    freqOffset,
    gainOffset,
    qLive,
  }
}

/** Bands used to seat one node on the curve without letting its own Q slide it. */
export function eqNodeAnchorBands<T extends { frequency: number; gain: number; q: number }>(
  bands: readonly T[],
  index: number,
  frequency: number,
  gain: number,
  q: number,
): T[] {
  return bands.map((band, i) => (i === index ? { ...band, frequency, gain, q } : band))
}
