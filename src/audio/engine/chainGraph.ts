import { type ChainModule, type ModuleType } from '../chain/chain'
import { createCompressorGraph, type CompressorGraph } from '../fx/compressor'
import { distortionDryWet } from '../fx/distortion'
import { createDistortionGraph, type DistortionGraph } from '../fx/distortionGraph'
import { createFilterGraph, filterDryWetGains, type FilterGraph } from '../fx/filterGraph'
import {
  createDelayGraph,
  createReverbGraph,
  wetDryFor,
  type DelayGraph,
  type ReverbGraph,
} from '../fx/graphs'
import { createLimiterGraph, type LimiterGraph } from '../fx/limiter'
import { createMidSideGraph, type MidSideGraph } from '../fx/midSideGraph'
import { isDelayStereo } from '../fx/spaceModel'
import type { DistortionType } from '../fx/types'
import type { ParamId } from '../parameters/types'
import { EQ_POOL_BANDS } from './eqBands'
import { createEqGraph, type EqGraph } from './eqGraph'
import { createStereoStage, type StereoStage } from './stereoStage'

/**
 * One slot in the ordered Audio Chain. Realtime playback and offline export
 * both build slots with `createChainSlot` so effect order cannot diverge.
 */
export type ChainSlot = {
  instanceId: string
  type: ModuleType
  input: GainNode
  output: GainNode
  dry: GainNode
  wet: GainNode
  eq?: EqGraph
  distortionFx?: DistortionGraph
  filterFx?: FilterGraph
  midSideFx?: MidSideGraph
  delayFx?: DelayGraph
  reverbFx?: ReverbGraph
  limiterFx?: LimiterGraph
  compressorFx?: CompressorGraph
  stereo?: StereoStage
}

export function createChainSlot(
  ctx: BaseAudioContext,
  mod: ChainModule,
  eqBandCount = EQ_POOL_BANDS,
): ChainSlot {
  const input = ctx.createGain()
  const output = ctx.createGain()
  const dry = ctx.createGain()
  const wet = ctx.createGain()
  input.connect(dry)
  dry.connect(output)
  const slot: ChainSlot = {
    instanceId: mod.instanceId,
    type: mod.type,
    input,
    output,
    dry,
    wet,
  }
  if (mod.type === 'gain' || mod.type === 'output' || mod.type === 'grain') {
    wet.gain.value = 0
    dry.gain.value = 1
    if (mod.type === 'gain') {
      try {
        dry.disconnect(output)
      } catch {
        /* first connect */
      }
      const stereo = createStereoStage(ctx)
      dry.connect(stereo.input)
      stereo.output.connect(output)
      slot.stereo = stereo
    }
    return slot
  }
  if (mod.type === 'eq') {
    const graph = createEqGraph(ctx, eqBandCount)
    input.connect(wet)
    wet.connect(graph.input)
    graph.output.connect(output)
    slot.eq = graph
  }
  if (mod.type === 'filter') {
    input.connect(wet)
    slot.filterFx = createFilterGraph(ctx, wet, output)
  }
  if (mod.type === 'midside') {
    input.connect(wet)
    slot.midSideFx = createMidSideGraph(ctx, wet, output)
  }
  if (mod.type === 'distortion') {
    input.connect(wet)
    slot.distortionFx = createDistortionGraph(ctx, wet, output)
  }
  if (mod.type === 'delay') {
    input.connect(wet)
    slot.delayFx = createDelayGraph(ctx, wet, output, input)
  }
  if (mod.type === 'reverb') {
    input.connect(wet)
    slot.reverbFx = createReverbGraph(ctx, wet, output, input)
  }
  if (mod.type === 'compressor') {
    slot.compressorFx = createCompressorGraph(ctx, input, wet)
    wet.connect(output)
  }
  if (mod.type === 'limiter') {
    slot.limiterFx = createLimiterGraph(ctx, input, wet)
    wet.connect(output)
  }
  return slot
}

export function connectChainInOrder(slots: readonly ChainSlot[]): void {
  for (let i = 0; i < slots.length - 1; i++) {
    slots[i]!.output.connect(slots[i + 1]!.input)
  }
}

export function wetLevel(
  type: ModuleType,
  params: Record<ParamId, number>,
  distortionType: DistortionType,
): number {
  if (type === 'delay') return wetDryFor('delay', params).wet
  if (type === 'reverb') return wetDryFor('reverb', params).wet
  if (type === 'filter') return filterDryWetGains(params.filterMix).wet
  if (type === 'distortion') {
    return distortionDryWet(
      distortionType,
      params.saturation,
      params.saturationMix,
      params.distortionBits,
      params.distortionDownsample,
      params.distortionNoise,
    ).wet
  }
  if (type === 'eq' || type === 'compressor' || type === 'limiter' || type === 'midside') return 1
  return 0
}

export function dryLevel(
  type: ModuleType,
  params: Record<ParamId, number>,
  distortionType: DistortionType,
): number {
  if (type === 'delay') return wetDryFor('delay', params).dry
  if (type === 'reverb') return wetDryFor('reverb', params).dry
  if (type === 'filter') return filterDryWetGains(params.filterMix).dry
  if (type === 'distortion') {
    return distortionDryWet(
      distortionType,
      params.saturation,
      params.saturationMix,
      params.distortionBits,
      params.distortionDownsample,
      params.distortionNoise,
    ).dry
  }
  if (type === 'eq' || type === 'compressor' || type === 'limiter' || type === 'midside') return 0
  return 1
}

export type ModuleMix = {
  dry: number
  wet: number
  output: number
  /** Bypass/latch forces the delay's internal crossfade closed. */
  muteDelayChannels: boolean
}

/**
 * Dry/wet/output targets for one module. Live ramps and offline scheduling
 * both use this so bypass, stereo delay, and send levels stay one definition.
 */
export function moduleMixGains(
  mod: ChainModule,
  params: Record<ParamId, number>,
  distortionType: DistortionType,
  flags: { eqListenFilters: boolean; spaceLatched: boolean },
): ModuleMix {
  if (mod.type === 'gain' || mod.type === 'output' || mod.type === 'grain') {
    return { dry: 1, wet: 0, output: 1, muteDelayChannels: false }
  }
  const bypassed =
    flags.eqListenFilters &&
    (mod.type === 'delay' ||
      mod.type === 'reverb' ||
      mod.type === 'distortion' ||
      mod.type === 'filter' ||
      mod.type === 'midside' ||
      mod.type === 'compressor' ||
      mod.type === 'limiter')
      ? true
      : flags.eqListenFilters && mod.type === 'eq'
        ? false
        : mod.bypassed
  const stereoDelay = mod.type === 'delay' && isDelayStereo(params)
  const dry = bypassed ? 1 : stereoDelay ? 0 : dryLevel(mod.type, params, distortionType)
  const wet =
    flags.spaceLatched && (mod.type === 'delay' || mod.type === 'reverb')
      ? 0
      : bypassed
        ? 0
        : stereoDelay
          ? 1
          : wetLevel(mod.type, params, distortionType)
  const output =
    mod.type === 'delay' || mod.type === 'reverb'
      ? bypassed
        ? 1
        : wetDryFor(mod.type, params).out
      : 1
  return {
    dry,
    wet,
    output,
    muteDelayChannels: mod.type === 'delay' && (bypassed || flags.spaceLatched),
  }
}

/**
 * node-web-audio-api runs ScriptProcessor callbacks but never plays their
 * output. Browsers do. Offline export keeps the processor in the browser and
 * skips only the broken runtime so the waveshaper still reaches the file.
 */
export function scriptProcessorForwardsOffline(): boolean {
  const runtime = globalThis as { process?: { versions?: { node?: string } } }
  return typeof runtime.process?.versions?.node !== 'string'
}

export function bypassBrokenScriptProcessor(slot: ChainSlot): void {
  const fx = slot.distortionFx
  if (!fx || scriptProcessorForwardsOffline()) return
  try {
    fx.shaper.output.disconnect(fx.proc)
  } catch {
    /* already rewired */
  }
  try {
    fx.proc.disconnect()
  } catch {
    /* already disconnected */
  }
  fx.proc.onaudioprocess = null
  fx.shaper.output.connect(fx.post)
}

/** Schedule a gain without reading AudioParam.value (offline clock stays at 0). */
export function setGainAt(param: AudioParam, value: number, time: number): void {
  const target = value <= 1e-5 ? 0 : value
  param.setValueAtTime(target, time)
}
