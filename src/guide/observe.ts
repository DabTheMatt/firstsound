import type { EngineSnapshot } from '../audio/engine/AudioEngine'
import { matchSimpleDelay, matchSimpleReverb } from '../simple/fxPresets'
import { matchSimpleTone } from '../simple/tonePresets'
import { blankSignal, type GuideSignal } from './actions'

export type GuideContext = {
  fadeIn: number
  fadeOut: number
  exportOpen: boolean
  exportOpenedCount: number
  exportCompletedCount: number
  compareCount: number
  waveformTouches: number
  focusActive: boolean
  uiMode: 'simple' | 'technical' | 'sensory' | null
  menuOpen: boolean
  focusedId: string
}

export const EMPTY_GUIDE_CONTEXT: GuideContext = {
  fadeIn: 0,
  fadeOut: 0,
  exportOpen: false,
  exportOpenedCount: 0,
  exportCompletedCount: 0,
  compareCount: 0,
  waveformTouches: 0,
  focusActive: false,
  uiMode: null,
  menuOpen: false,
  focusedId: '',
}

function moduleBypassed(snap: EngineSnapshot, type: 'eq' | 'reverb' | 'delay'): boolean {
  const mod = snap.chain.find((item) => item.type === type)
  if (!mod) return true
  return mod.bypassed
}

/** Adapter over the live engine snapshot. Does not write audio. */
export function signalFromSnapshot(snap: EngineSnapshot, ctx: GuideContext): GuideSignal {
  const eqBypassed = moduleBypassed(snap, 'eq')
  const tone = matchSimpleTone(snap.eqBands, eqBypassed)
  const reverb = matchSimpleReverb({
    bypassed: moduleBypassed(snap, 'reverb'),
    type: snap.reverbType,
    wet: snap.params.reverbWet,
    size: snap.params.reverbSize,
    decay: snap.params.reverbDecay,
    predelay: snap.params.reverbPredelay,
    correlate: snap.params.reverbCorrelate,
  })
  const delay = matchSimpleDelay({
    bypassed: moduleBypassed(snap, 'delay'),
    type: snap.delayType,
    wet: snap.params.delayWet,
    wetR: snap.params.delayWetR,
    time: snap.params.delayTime,
    feedback: snap.params.delayFeedback,
    sync: snap.params.delaySync,
    correlate: snap.params.delayCorrelate,
  })
  const reverbOn = reverb.kind !== 'off'
  const delayOn = delay.kind !== 'off'
  const reverbAmount = reverb.kind === 'preset' ? reverb.amount : reverbOn ? snap.params.reverbWet / 100 : 0
  const delayAmount = delay.kind === 'preset' ? delay.amount : delayOn ? snap.params.delayWet / 100 : 0
  return {
    ...blankSignal(),
    sampleLoaded: snap.sampleLoaded,
    playing: snap.playing,
    duration: snap.duration,
    regionStart: snap.params.start,
    regionEnd: snap.params.end,
    selectionActive: snap.canClearSelection,
    bufferRev: snap.bufferRev,
    fadeIn: ctx.fadeIn,
    fadeOut: ctx.fadeOut,
    gain: snap.params.gain,
    speed: snap.params.speed,
    pitch: snap.params.pitch,
    reversed: snap.direction === 'reverse',
    toneId: tone.id,
    eqFlat: tone.id === 'natural',
    reverbOn,
    reverbPreset: reverb.kind === 'preset' ? reverb.id : null,
    reverbShape: reverbOn ? `${reverb.kind}:${reverb.kind === 'preset' ? reverb.id : 'x'}:${Math.round(snap.params.reverbSize)}:${Math.round(snap.params.reverbDecay * 10)}` : '',
    reverbAmount,
    delayOn,
    delayPreset: delay.kind === 'preset' ? delay.id : null,
    delayShape: delayOn ? `${delay.kind}:${delay.kind === 'preset' ? delay.id : 'x'}:${Math.round(snap.params.delayTime)}` : '',
    delayAmount,
    exportOpen: ctx.exportOpen,
    exportOpenedCount: ctx.exportOpenedCount,
    exportCompletedCount: ctx.exportCompletedCount,
    compareCount: ctx.compareCount,
    waveformTouches: ctx.waveformTouches,
    reverbIds: idsOf(snap.chain, 'reverb'),
    delayIds: idsOf(snap.chain, 'delay'),
    eqIds: idsOf(snap.chain, 'eq'),
    focusedId: ctx.focusedId,
    reverbWet: snap.params.reverbWet / 100,
    delayWet: snap.params.delayWet / 100,
    delayTime: snap.params.delayTime,
    eqShape: eqShape(snap),
  }
}

function eqShape(snap: EngineSnapshot): string {
  let shared = false
  return snap.chain
    .filter((item) => item.type === 'eq')
    .map((item) => {
      const own = snap.eqById[item.instanceId]?.bands
      const bands = own ?? (shared ? [] : snap.eqBands)
      if (!own) shared = true
      const body = bands
        .map((band) => `${Math.round(band.frequency)}:${band.gain.toFixed(2)}:${band.q.toFixed(2)}:${band.type}`)
        .join(',')
      return `${item.instanceId}:${body}`
    })
    .join(';')
}

function idsOf(chain: EngineSnapshot['chain'], type: 'reverb' | 'delay' | 'eq'): string {
  return chain.filter((item) => item.type === type).map((item) => item.instanceId).join(',')
}
