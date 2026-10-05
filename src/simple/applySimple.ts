import type { AudioEngine } from '../audio/engine/AudioEngine'
import { captureDsp, writeDsp } from '../sensory/applySensory'
import { applyToneToDsp } from './applyToneEq'
import {
  delayAmountPatch,
  delayParamPatch,
  delayTypeIsSimple,
  reverbAmountPatch,
  reverbParamPatch,
  reverbTypeIsSimple,
  type SimpleDelayId,
  type SimpleReverbId,
} from './fxPresets'
import { clampToneAmount, toneBandsAt, type SimpleToneId } from './tonePresets'

function moduleId(engine: AudioEngine, type: 'reverb' | 'delay' | 'eq'): string | null {
  return engine.getSnapshot().chain.find((mod) => mod.type === type)?.instanceId ?? null
}

/**
 * A new session is Input → Output. Simple presets must insert the real
 * processor before writing its parameters, or the controls only change
 * numbers that nothing in the graph can hear.
 */
function ensureEffect(engine: AudioEngine, type: 'reverb' | 'delay' | 'eq'): void {
  if (moduleId(engine, type)) return
  engine.ensureModules([type])
}

function setBypass(engine: AudioEngine, type: 'reverb' | 'delay' | 'eq', bypassed: boolean): void {
  const id = moduleId(engine, type)
  if (!id) return
  const mod = engine.getSnapshot().chain.find((item) => item.instanceId === id)
  if (!mod || mod.bypassed === bypassed) return
  engine.setModuleBypass(id, bypassed)
}

/** Replace the EQ character. Natural bypasses EQ and writes a flat curve. */
export function applySimpleTone(engine: AudioEngine, id: SimpleToneId, amount: number): number {
  const strength = id === 'natural' ? 0 : clampToneAmount(amount)
  if (id !== 'natural') ensureEffect(engine, 'eq')
  const dsp = applyToneToDsp(captureDsp(engine), toneBandsAt(id, strength), id === 'natural')
  writeDsp(engine, dsp)
  return strength
}

export function applySimpleReverb(engine: AudioEngine, id: SimpleReverbId, amount: number): void {
  ensureEffect(engine, 'reverb')
  if (!reverbTypeIsSimple(engine.getSnapshot().reverbType)) engine.setReverbType('hall')
  engine.setParams(reverbParamPatch(id, amount))
  setBypass(engine, 'reverb', false)
}

export function applySimpleReverbAmount(engine: AudioEngine, amount: number): void {
  engine.setParams(reverbAmountPatch(amount))
}

export function disableSimpleReverb(engine: AudioEngine): void {
  engine.setParams({ reverbWet: 0 })
  setBypass(engine, 'reverb', true)
}

export function applySimpleDelay(engine: AudioEngine, id: SimpleDelayId, amount: number): void {
  ensureEffect(engine, 'delay')
  if (!delayTypeIsSimple(engine.getSnapshot().delayType)) engine.setDelayType('digital')
  engine.setParams(delayParamPatch(id, amount))
  setBypass(engine, 'delay', false)
}

export function applySimpleDelayAmount(engine: AudioEngine, amount: number): void {
  engine.setParams(delayAmountPatch(amount))
}

export function disableSimpleDelay(engine: AudioEngine): void {
  engine.setParams({ delayWet: 0, delayWetR: 0 })
  setBypass(engine, 'delay', true)
}

/**
 * Clear the Simple surface: flat tone, reverb off, delay off.
 * Leaves the loaded buffer and any modules Simple does not own.
 */
export function resetSimpleSurface(engine: AudioEngine): void {
  applySimpleTone(engine, 'natural', 0)
  disableSimpleReverb(engine)
  disableSimpleDelay(engine)
}
