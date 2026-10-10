import type { GuideAction } from './types'

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
  }
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
  if (prev.toneId !== next.toneId || prev.eqFlat !== next.eqFlat) actions.push('eq.changed')
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
  return actions
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
      return false
    default:
      return false
  }
}
