import type { GuideAction, GuideModule } from './types'

/**
 * Plain facts the guide can see. Built from the engine snapshot and a few UI flags.
 * Diffing two of these is the whole action detector. No animation loop.
 */
export type GuideSignal = {
  sampleLoaded: boolean
  playing: boolean
  duration: number
  regionStart: number
  regionEnd: number
  selectionActive: boolean
  bufferRev: number
  fadeIn: number
  fadeOut: number
  gain: number
  speed: number
  pitch: number
  reversed: boolean
  toneId: string
  eqFlat: boolean
  reverbOn: boolean
  reverbPreset: string | null
  reverbShape: string
  reverbAmount: number
  delayOn: boolean
  delayPreset: string | null
  delayShape: string
  delayAmount: number
  exportOpen: boolean
  exportOpenedCount: number
  exportCompletedCount: number
  compareCount: number
  waveformTouches: number
  reverbIds: string
  delayIds: string
  eqIds: string
  focusedId: string
  reverbWet: number
  delayWet: number
  delayTime: number
  /** Fingerprint of EQ bands. A change is a real band edit, not a button click. */
  eqShape: string
}

export const GAIN_DEFAULT = -3
export const REVERB_AMOUNT_DEFAULT = 0.45
export const DELAY_AMOUNT_DEFAULT = 0.6

export function blankSignal(): GuideSignal {
  return {
    sampleLoaded: false,
    playing: false,
    duration: 0,
    regionStart: 0,
    regionEnd: 0,
    selectionActive: false,
    bufferRev: 0,
    fadeIn: 0,
    fadeOut: 0,
    gain: GAIN_DEFAULT,
    speed: 1,
    pitch: 0,
    reversed: false,
    toneId: 'natural',
    eqFlat: true,
    reverbOn: false,
    reverbPreset: null,
    reverbShape: '',
    reverbAmount: 0,
    delayOn: false,
    delayPreset: null,
    delayShape: '',
    delayAmount: 0,
    exportOpen: false,
    exportOpenedCount: 0,
    exportCompletedCount: 0,
    compareCount: 0,
    waveformTouches: 0,
    reverbIds: '',
    delayIds: '',
    eqIds: '',
    focusedId: '',
    reverbWet: 0,
    delayWet: 0,
    delayTime: 0,
    eqShape: '',
  }
}

export function moduleIds(signal: GuideSignal, module: GuideModule): string[] {
  const raw = module === 'reverb' ? signal.reverbIds : module === 'delay' ? signal.delayIds : module === 'eq' ? signal.eqIds : ''
  return raw.split(',').filter(Boolean)
}

function near(a: number, b: number, epsilon: number): boolean {
  return Math.abs(a - b) <= epsilon
}

/** Actions implied by a real change between two observations. */
export function diffGuideActions(prev: GuideSignal, next: GuideSignal): GuideAction[] {
  const actions: GuideAction[] = []
  if (!prev.playing && next.playing) actions.push('playback.started')
  const selectionMoved =
    next.selectionActive &&
    (!prev.selectionActive || !near(prev.regionStart, next.regionStart, 0.0005) || !near(prev.regionEnd, next.regionEnd, 0.0005))
  if (selectionMoved) actions.push('selection.created')
  if (
    prev.sampleLoaded &&
    next.sampleLoaded &&
    next.bufferRev !== prev.bufferRev &&
    next.duration < prev.duration - 0.01 &&
    prev.selectionActive
  ) {
    actions.push('trim.completed')
  }
  if (next.fadeIn > 0.01 && !near(prev.fadeIn, next.fadeIn, 0.0005)) actions.push('fade.in')
  if (next.fadeOut > 0.01 && !near(prev.fadeOut, next.fadeOut, 0.0005)) actions.push('fade.out')
  if (!near(prev.gain, next.gain, 0.05)) actions.push('gain.changed')
  if (next.toneId === 'clearer' || next.toneId === 'softer') {
    if (prev.toneId !== next.toneId) actions.push('eq.clarity')
  }
  if (next.toneId === 'warmer' || next.toneId === 'brighter' || next.toneId === 'moreBass' || next.toneId === 'lessBass' || next.toneId === 'lessHarsh') {
    if (prev.toneId !== next.toneId) actions.push('eq.tone')
  }
  if (prev.toneId !== next.toneId || prev.eqFlat !== next.eqFlat || prev.eqShape !== next.eqShape) actions.push('eq.changed')
  if (!prev.reverbOn && next.reverbOn) actions.push('reverb.enabled')
  else if (next.reverbOn) {
    if (prev.reverbShape !== next.reverbShape) actions.push('reverb.shaped')
    if (!near(prev.reverbAmount, next.reverbAmount, 0.02)) actions.push('reverb.amount')
  }
  if (!prev.delayOn && next.delayOn) actions.push('delay.enabled')
  else if (next.delayOn) {
    if (prev.delayShape !== next.delayShape) actions.push('delay.shaped')
    if (!near(prev.delayAmount, next.delayAmount, 0.02)) actions.push('delay.amount')
  }
  if (next.exportOpenedCount > prev.exportOpenedCount) actions.push('export.opened')
  if (next.exportCompletedCount > prev.exportCompletedCount) actions.push('export.completed')
  if (!near(prev.speed, next.speed, 0.01)) actions.push('speed.changed')
  if (!near(prev.pitch, next.pitch, 0.05)) actions.push('pitch.changed')
  if (prev.reversed !== next.reversed) actions.push('reverse.changed')
  if (next.compareCount > prev.compareCount) actions.push('compare.used')
  if (next.waveformTouches > prev.waveformTouches) actions.push('waveform.touched')
  if (appeared(prev.reverbIds, next.reverbIds)) actions.push('reverb.added')
  if (appeared(prev.delayIds, next.delayIds)) actions.push('delay.added')
  if (appeared(prev.eqIds, next.eqIds)) actions.push('eq.added')
  if (focusedOnto(prev, next, 'reverb')) actions.push('reverb.selected')
  if (focusedOnto(prev, next, 'delay')) actions.push('delay.selected')
  if (focusedOnto(prev, next, 'eq')) actions.push('eq.selected')
  if (!near(prev.reverbWet, next.reverbWet, 0.02) && next.reverbWet > 0.02) actions.push('reverb.wet')
  if (!near(prev.delayWet, next.delayWet, 0.02) && next.delayWet > 0.02) actions.push('delay.wet')
  if (!near(prev.delayTime, next.delayTime, 5)) actions.push('delay.time')
  return actions
}

function idList(raw: string): string[] {
  return raw.split(',').filter(Boolean)
}

function appeared(prev: string, next: string): boolean {
  const had = new Set(idList(prev))
  return idList(next).some((id) => !had.has(id))
}

function focusedOnto(prev: GuideSignal, next: GuideSignal, module: GuideModule): boolean {
  if (!next.focusedId || next.focusedId === prev.focusedId) return false
  return moduleIds(next, module).includes(next.focusedId)
}

/**
 * True when the project already contains the result, so the step must not
 * demand the same edit again. Gestures that are not stored in the project
 * (play, export, compare) stay false.
 */
export function projectSatisfies(action: GuideAction, signal: GuideSignal): boolean {
  switch (action) {
    case 'playback.started':
      return signal.playing
    case 'selection.created':
      return signal.selectionActive
    case 'trim.completed':
      return false
    case 'fade.in':
      return signal.fadeIn > 0.01
    case 'fade.out':
      return signal.fadeOut > 0.01
    case 'gain.changed':
      return !near(signal.gain, GAIN_DEFAULT, 0.15)
    case 'eq.clarity':
      return signal.toneId === 'clearer' || signal.toneId === 'softer'
    case 'eq.tone':
      return signal.toneId === 'warmer' || signal.toneId === 'brighter' || signal.toneId === 'moreBass' || signal.toneId === 'lessBass' || signal.toneId === 'lessHarsh'
    case 'eq.changed':
      return !signal.eqFlat && signal.toneId === 'custom'
    case 'reverb.enabled':
      return signal.reverbOn
    case 'reverb.shaped':
      return signal.reverbOn && signal.reverbPreset === 'medium'
    case 'reverb.amount':
      return signal.reverbOn && !near(signal.reverbAmount, REVERB_AMOUNT_DEFAULT, 0.04) && signal.reverbAmount > 0.02
    case 'delay.enabled':
      return signal.delayOn
    case 'delay.shaped':
      return signal.delayOn && (signal.delayPreset === 'short' || signal.delayPreset === 'medium')
    case 'delay.amount':
      return signal.delayOn && !near(signal.delayAmount, DELAY_AMOUNT_DEFAULT, 0.04) && signal.delayAmount > 0.02
    case 'export.opened':
      return signal.exportOpen
    case 'export.completed':
      return false
    case 'speed.changed':
      return !near(signal.speed, 1, 0.02)
    case 'pitch.changed':
      return !near(signal.pitch, 0, 0.05)
    case 'reverse.changed':
      return signal.reversed
    case 'compare.used':
    case 'waveform.touched':
    case 'reverb.added':
    case 'delay.added':
    case 'eq.added':
    case 'delay.time':
      return false
    case 'reverb.selected':
      return moduleIds(signal, 'reverb').includes(signal.focusedId)
    case 'delay.selected':
      return moduleIds(signal, 'delay').includes(signal.focusedId)
    case 'eq.selected':
      return moduleIds(signal, 'eq').includes(signal.focusedId)
    case 'reverb.wet':
      return signal.reverbWet > 0.02
    case 'delay.wet':
      return signal.delayWet > 0.02
    default:
      return false
  }
}

export type GuideBindings = Partial<Record<GuideModule, string>>

/** Bind the instance the user just added or the only one of its type. Never guess among several. */
export function freshBindings(
  prev: GuideSignal,
  next: GuideSignal,
  bindings: GuideBindings,
  adding: ReadonlySet<GuideModule>,
): GuideBindings | null {
  const out: GuideBindings = {}
  for (const module of ['reverb', 'delay', 'eq', 'gain'] as const) {
    const prevIds = module === 'gain' ? [] : moduleIds(prev, module)
    const nextIds = module === 'gain' ? [] : moduleIds(next, module)
    const had = new Set(prevIds)
    const fresh = nextIds.filter((id) => !had.has(id))
    if (fresh.length === 1 && (!bindings[module] || adding.has(module))) out[module] = fresh[0]
    else if (!bindings[module] && nextIds.length === 1) out[module] = nextIds[0]
    else if (!bindings[module] && next.focusedId && nextIds.includes(next.focusedId)) out[module] = next.focusedId
  }
  return Object.keys(out).length ? out : null
}

export function boundInstance(module: GuideModule | null | undefined, signal: GuideSignal, bindings: GuideBindings): string | null {
  if (!module || module === 'gain') return null
  const ids = moduleIds(signal, module)
  const bound = bindings[module]
  if (bound && ids.includes(bound)) return bound
  if (ids.length === 1) return ids[0]!
  if (signal.focusedId && ids.includes(signal.focusedId)) return signal.focusedId
  return null
}
