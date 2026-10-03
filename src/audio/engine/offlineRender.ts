import { automationHasNodes, resolvePerformanceParams, type AutomationDocument } from '../automation/automation'
import type { ChainModule } from '../chain/chain'
import { applyGain, peakAmplitude } from '../samplePrep/prepare'
import { renderPrep } from '../samplePrep/render'
import {
  DEFAULT_NORMALIZE_DBFS,
  type ExportSettings,
  type Pcm,
  type SamplePrepState,
} from '../samplePrep/types'
import { dbToGain } from '../parameters/mapping'
import type { ParamId } from '../parameters/types'
import { anyFxLfoActive, defaultLfoHold, type FxLfoMap } from '../fx/lfo'
import { applyFilterModulation, filterModNeedsClock, followerEnvelope } from '../fx/filter'
import { applyDelayGraph, applyReverbGraph, buildReverbBuffer, reverbImpulseKey } from '../fx/graphs'
import { convolverHasBuffer, setConvolverPairBuffer } from './convolverCrossfade'
import { setAudioParamNow, setSmoothedAudioParam } from './paramSmooth'
import type { DelayType, DistortionNoiseKind, DistortionType, ReverbType } from '../fx/types'
import { combAsEqBands, defaultCombFilter, type CombFilterState } from './comb'
import {
  bypassBrokenScriptProcessor,
  connectChainInOrder,
  createChainSlot,
  moduleMixGains,
  setGainAt,
  type ChainSlot,
} from './chainGraph'
import { bandIsActive, defaultEqBands, filterStageCount, type EqBand } from './eqBands'
import {
  effectTailBudgetSec,
  exportFrameCount,
  exportSourceRange,
  trimRenderedTail,
  type ExportScope,
} from './exportTail'
import {
  ensureBandStages,
  writeCombCoefficients,
  writeEqBandCoefficients,
  type EqChannelMode,
  type EqLane,
} from './eqGraph'
import { eqHeardBandLists, modulatedEqBands, type EqModClock } from './eqPerformance'
import { applyStereoStage, forceStereoUpmix } from './stereoStage'
import { applyDistortionGraph } from '../fx/distortionGraph'
import { applyFilterGraph } from '../fx/filterGraph'
import { applyMidSideGraph } from '../fx/midSideGraph'
import { applyCompressorGraph } from '../fx/compressor'
import { applyLimiterGraph } from '../fx/limiter'

export type ExportEqState = {
  bands: EqBand[]
  bandsL: EqBand[]
  bandsR: EqBand[]
  comb: CombFilterState
}

/** Audible processing state. Realtime playback and offline export both read this. */
export type ProcessingSnapshot = {
  chain: ChainModule[]
  params: Record<ParamId, number>
  automation: AutomationDocument
  fxLfos: FxLfoMap
  eqById: Record<string, ExportEqState>
  eqChannelMode: EqChannelMode
  primaryEqId: string
  distortionType: DistortionType
  distortionNoiseKind: DistortionNoiseKind
  delayType: DelayType
  reverbType: ReverbType
  voiceGain: number
  masterGain: number
  /**
   * Serializable per-track mixer for a future offline mix. The single-buffer
   * export still uses voiceGain. Rebuild `trackMixer.ts` from these fields;
   * nothing here is browser-only UI state.
   */
  trackMix?: readonly {
    id: string
    mix: number
    pan: number
    midDb: number
    sideDb: number
    muted: boolean
    solo: boolean
    channels: number
  }[]
  noiseMuted: boolean
  noiseFadeTau: number
  /** Normalized Random offsets. Applied only while automation owns the center. */
  randomOffsets?: Partial<Record<ParamId, number>>
  /**
   * Serializable per-track racks for a later multi-track offline render.
   * The live render still uses the selected track's chain above.
   */
  trackRacks?: Record<string, unknown>
}

export type OfflineContextFactory = (
  channels: number,
  length: number,
  sampleRate: number,
) => BaseAudioContext & { startRendering(): Promise<AudioBuffer> }

function defaultOfflineFactory(
  channels: number,
  length: number,
  sampleRate: number,
): BaseAudioContext & { startRendering(): Promise<AudioBuffer> } {
  const Ctor = globalThis.OfflineAudioContext
  if (!Ctor) throw new Error('OfflineAudioContext is not available')
  return new Ctor(channels, Math.max(1, length), sampleRate)
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function blockRms(channels: readonly Float32Array[], start: number, end: number): number {
  let sum = 0
  let n = 0
  for (const ch of channels) {
    const last = Math.min(ch.length, end)
    for (let i = Math.max(0, start); i < last; i++) {
      const x = ch[i] ?? 0
      sum += x * x
      n++
    }
  }
  return n > 0 ? Math.sqrt(sum / n) : 0
}

function needsTimeline(state: ProcessingSnapshot): boolean {
  return (
    automationHasNodes(state.automation) ||
    anyFxLfoActive(state.fxLfos) ||
    filterModNeedsClock(state.params)
  )
}

function controlTimes(
  duration: number,
  timelineStart: number,
  automation: AutomationDocument,
  dynamic: boolean,
): number[] {
  if (!dynamic || !(duration > 0)) return [0]
  const times = new Set<number>([0])
  const step = 0.008
  for (let t = step; t < duration; t += step) times.add(Math.round(t * 1e6) / 1e6)
  if (duration > 0) times.add(duration)
  for (const lane of automation.lanes) {
    for (const node of lane.nodes) {
      const elapsed = node.time - timelineStart
      if (elapsed > 0 && elapsed < duration) times.add(elapsed)
    }
  }
  return [...times].sort((a, b) => a - b)
}

function eqStateFor(state: ProcessingSnapshot, instanceId: string): ExportEqState {
  return (
    state.eqById[instanceId] ?? {
      bands: defaultEqBands(),
      bandsL: [],
      bandsR: [],
      comb: defaultCombFilter(),
    }
  )
}

/**
 * The first control sample is still inaudible: snap so a bypassed wet path
 * cannot leak. Later samples ramp, matching live knob / automation / LFO ticks.
 */
function setAudibleGain(param: AudioParam, value: number, now: number): void {
  const target = value <= 1e-5 ? 0 : value
  if (now <= 1e-6) setAudioParamNow(param, target, now)
  else setSmoothedAudioParam(param, target, now, 'mix')
}

function scheduleEqLane(
  ctx: BaseAudioContext,
  lane: EqLane,
  bands: readonly EqBand[],
  comb: CombFilterState,
  now: number,
  nyquist: number,
): void {
  const immediate = now <= 1e-6
  const count = Math.max(lane.bands.length, bands.length)
  for (let i = 0; i < count; i++) {
    const path = lane.bands[i]
    if (!path) continue
    const band = bands[i]
    const active = Boolean(band && bandIsActive(band))
    ensureBandStages(ctx, path, active && band ? Math.max(1, filterStageCount(band)) : 1)
    writeEqBandCoefficients(path, band, now, immediate, nyquist, 0)
    setAudibleGain(path.wet.gain, active ? 1 : 0, now)
    setAudibleGain(path.dry.gain, active ? 0 : 1, now)
  }
  const teeth = comb.enabled ? combAsEqBands(comb) : []
  writeCombCoefficients(lane, teeth, now, immediate, nyquist, 0)
  setAudibleGain(lane.combWet.gain, teeth.length > 0 ? 1 : 0, now)
  setAudibleGain(lane.combDry.gain, teeth.length > 0 ? 0 : 1, now)
}

function scheduleEq(
  ctx: BaseAudioContext,
  slots: readonly ChainSlot[],
  state: ProcessingSnapshot,
  now: number,
  clock: EqModClock,
): void {
  const nyquist = ctx.sampleRate / 2
  for (const slot of slots) {
    if (slot.type !== 'eq' || !slot.eq) continue
    const st = eqStateFor(state, slot.instanceId)
    const overlay = slot.instanceId === state.primaryEqId
    const heard = eqHeardBandLists(state.eqChannelMode, st.bands, st.bandsL, st.bandsR)
    const left = overlay
      ? modulatedEqBands(heard.left, state.params, state.automation, clock, state.fxLfos)
      : { bands: heard.left, live: state.params }
    const right =
      heard.left === heard.right
        ? left
        : overlay
          ? modulatedEqBands(heard.right, state.params, state.automation, clock, state.fxLfos)
          : { bands: heard.right, live: state.params }
    const combLive = left.live
    const comb = overlay
      ? {
          ...st.comb,
          teeth: combLive.eqcfTeeth ?? st.comb.teeth,
          gain: combLive.eqcfGain ?? st.comb.gain,
          spacing: combLive.eqcfSpacing ?? st.comb.spacing,
          frequency: combLive.eqcfFreq ?? st.comb.frequency,
        }
      : st.comb
    scheduleEqLane(ctx, slot.eq.left, left.bands, comb, now, nyquist)
    scheduleEqLane(ctx, slot.eq.right, right.bands, comb, now, nyquist)
  }
}

function scheduleChain(
  ctx: BaseAudioContext,
  slots: readonly ChainSlot[],
  chain: readonly ChainModule[],
  state: ProcessingSnapshot,
  params: Record<ParamId, number>,
  sourceChannels: number,
  now: number,
  smoothing: number,
  irKey: { current: string },
  commitStatic: boolean,
  clock: EqModClock,
): void {
  const gainSlot = slots.find((slot) => slot.type === 'gain')
  const outSlot = slots.find((slot) => slot.type === 'output')
  if (gainSlot?.stereo) {
    applyStereoStage(
      gainSlot.stereo,
      {
        gainDb: params.gain,
        pan: params.pan,
        leftDb: params.channelGainL,
        rightDb: params.channelGainR,
        mono: params.makeMono > 0.5,
        invert: params.invertPhase > 0.5,
        sourceChannels,
      },
      now,
      smoothing,
    )
  } else if (gainSlot) {
    setAudibleGain(gainSlot.output.gain, dbToGain(params.gain), now)
  }
  if (outSlot) setAudibleGain(outSlot.output.gain, dbToGain(params.outputGain), now)
  scheduleEq(ctx, slots, state, now, clock)
  for (const slot of slots) {
    if (slot.filterFx) applyFilterGraph(slot.filterFx, params, now, smoothing, ctx.sampleRate, commitStatic)
    if (slot.midSideFx) applyMidSideGraph(slot.midSideFx, params, now, smoothing)
    if (slot.distortionFx) {
      applyDistortionGraph(
        slot.distortionFx,
        params,
        state.distortionType,
        state.distortionNoiseKind,
        now,
        smoothing,
        ctx.sampleRate,
        state.noiseMuted,
        state.noiseFadeTau,
        commitStatic,
      )
    }
    if (slot.compressorFx) applyCompressorGraph(slot.compressorFx, params, now, smoothing)
    if (slot.limiterFx) applyLimiterGraph(slot.limiterFx, params, now, smoothing)
    if (slot.delayFx) {
      applyDelayGraph(slot.delayFx, params, state.delayType, params.bpm, now, smoothing, ctx, commitStatic)
    }
    if (slot.reverbFx) {
      applyReverbGraph(slot.reverbFx, params, state.reverbType, params.bpm, now, smoothing, commitStatic)
      if (commitStatic) {
        const key = reverbImpulseKey(params, state.reverbType)
        if (key !== irKey.current || !convolverHasBuffer(slot.reverbFx.conv)) {
          irKey.current = key
          setConvolverPairBuffer(slot.reverbFx.conv, buildReverbBuffer(ctx, params, state.reverbType), now)
        }
      }
    }
  }
  for (const mod of chain) {
    const slot = slots.find((item) => item.instanceId === mod.instanceId)
    if (!slot) continue
    const mix = moduleMixGains(mod, params, state.distortionType, {
      eqListenFilters: false,
      spaceLatched: false,
    })
    setAudibleGain(slot.dry.gain, mix.dry, now)
    setAudibleGain(slot.wet.gain, mix.wet, now)
    if (mod.type === 'delay' || mod.type === 'reverb') setAudibleGain(slot.output.gain, mix.output, now)
    if (mix.muteDelayChannels && slot.delayFx) {
      // applyDelayGraph may already have opened the internal dry send.
      // Close it on the same clock so that send cannot sit on the slot dry path.
      setAudibleGain(slot.delayFx.chanDryL.gain, 0, now)
      setAudibleGain(slot.delayFx.chanDryR.gain, 0, now)
      setAudibleGain(slot.delayFx.chanWetL.gain, 1, now)
      setAudibleGain(slot.delayFx.chanWetR.gain, 1, now)
    }
  }
}

function copyRendered(buffer: AudioBuffer, length: number): Float32Array[] {
  const frames = Math.max(0, Math.min(buffer.length, length))
  const channels: Float32Array[] = []
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    channels.push(buffer.getChannelData(c).slice(0, frames))
  }
  return channels
}

function collapseMonoSource(channels: Float32Array[], sourceChannels: number): Float32Array[] {
  if (sourceChannels >= 2 || channels.length < 2) return channels
  const left = channels[0]!
  const right = channels[1]!
  const n = Math.min(left.length, right.length)
  const step = Math.max(1, Math.floor(n / 4000))
  let diff = 0
  for (let i = 0; i < n; i += step) diff = Math.max(diff, Math.abs((left[i] ?? 0) - (right[i] ?? 0)))
  if (diff < 1e-4) return [left]
  return channels
}

export type ExportProgressPhase = 'preparing' | 'rendering' | 'encoding'

export type ProcessedRenderOptions = {
  timelineStart?: number
  factory?: OfflineContextFactory
  onProgress?: (phase: ExportProgressPhase) => void
}

const EXPORT_TRACE = () =>
  (globalThis as { __FIELD_EXPORT_DEBUG__?: boolean }).__FIELD_EXPORT_DEBUG__ === true

export function traceExport(stage: string, detail?: Record<string, unknown>): void {
  if (!EXPORT_TRACE()) return
  console.info(`[export] ${stage}`, detail ?? '')
}

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}

/**
 * Run `source` through the same ordered chain, bypass state, parameters,
 * automation, and LFO map the live engine plays. The render continues past
 * the source so delay and reverb can decay, then trims that tail by level.
 */
export async function renderProcessedPcm(
  source: Pcm,
  state: ProcessingSnapshot,
  options: ProcessedRenderOptions = {},
): Promise<Pcm> {
  const sampleRate = source.sampleRate
  const sourceFrames = source.channels[0]?.length ?? 0
  if (!(sampleRate > 0) || sourceFrames < 1) {
    return { sampleRate: sampleRate > 0 ? sampleRate : 44100, channels: [new Float32Array()] }
  }
  const tail = effectTailBudgetSec(state.chain, state.params, state.reverbType)
  const length = exportFrameCount(sourceFrames, sampleRate, tail)
  const totalSeconds = length / sampleRate
  traceExport('SOURCE PREPARED', {
    sourceDuration: sourceFrames / sampleRate,
    sampleRate,
    channels: source.channels.length,
    tail,
    renderDuration: totalSeconds,
    frames: length,
    estimatedBytes: length * 2 * 4,
  })
  options.onProgress?.('rendering')
  const factory = options.factory ?? defaultOfflineFactory
  traceExport('OFFLINE CONTEXT CREATED', { channels: 2, frames: length, sampleRate })
  const ctx = factory(2, length, sampleRate)
  const timelineStart = options.timelineStart ?? 0
  const chain = state.chain
  const slots = chain.map((mod) => {
    const slot = createChainSlot(ctx, mod, undefined, { offlineBypass: mod.bypassed })
    bypassBrokenScriptProcessor(slot)
    return slot
  })
  connectChainInOrder(slots)
  const bus = ctx.createGain()
  forceStereoUpmix(bus)
  setGainAt(bus.gain, state.voiceGain * state.masterGain, 0)
  if (slots.length > 0) {
    bus.connect(slots[0]!.input)
    slots[slots.length - 1]!.output.connect(ctx.destination)
  } else {
    bus.connect(ctx.destination)
  }

  const buffer = ctx.createBuffer(Math.max(1, source.channels.length), sourceFrames, sampleRate)
  for (let c = 0; c < source.channels.length; c++) {
    buffer.getChannelData(c).set(source.channels[c] ?? new Float32Array(sourceFrames))
  }
  const src = ctx.createBufferSource()
  src.buffer = buffer
  src.connect(bus)
  src.start(0)

  const dynamic = needsTimeline(state)
  const smoothing = dynamic ? 0.004 : 0.0005
  const times = controlTimes(totalSeconds, timelineStart, state.automation, dynamic)
  const hold = defaultLfoHold()
  const rand = mulberry32(0x1fee2e01)
  const snh = { index: -1, value: 0 }
  let follower = 0
  traceExport('DSP GRAPH BUILT', { modules: chain.length, dynamic })
  const irKey = { current: '' }
  let previous = 0
  let scheduled = 0
  for (let index = 0; index < times.length; index++) {
    const elapsed = times[index] ?? 0
    const commitStatic = index === times.length - 1
    const dt = Math.max(0.001, elapsed - previous)
    previous = elapsed
    if (state.params.filterEnvAmt > 0.4) {
      const a = Math.floor(elapsed * sampleRate)
      const b = a + Math.max(1, Math.floor(dt * sampleRate))
      const level = blockRms(source.channels, a, Math.min(sourceFrames, b))
      follower = followerEnvelope(
        follower,
        Math.min(1, level * 3.4),
        dt,
        state.params.filterEnvAttack,
        state.params.filterEnvRelease,
      )
    }
    const performed = resolvePerformanceParams(
      state.params,
      state.automation,
      timelineStart + elapsed,
      true,
      state.fxLfos,
      elapsed,
      hold,
      rand,
      state.randomOffsets,
    )
    const live = applyFilterModulation(performed, {
      timeSec: elapsed,
      playing: true,
      envOriginSec: 0,
      follower01: follower,
      snh,
      rand,
    })
    scheduleChain(
      ctx,
      slots,
      chain,
      state,
      live,
      source.channels.length,
      elapsed,
      smoothing,
      irKey,
      commitStatic,
      {
        transportSec: timelineStart + elapsed,
        lfoTimeSec: elapsed,
        playing: true,
        hold,
        rand,
        randomOffsets: state.randomOffsets,
      },
    )
    scheduled += 1
    if (scheduled % 40 === 0) await yieldToMain()
  }
  traceExport('AUTOMATION SCHEDULED', { points: times.length })
  traceExport('RENDER START', { frames: length })

  const rendered = await ctx.startRendering()
  traceExport('RENDER COMPLETE', { frames: rendered.length })
  const keep = trimRenderedTail(channelsOf(rendered), sourceFrames, sampleRate)
  const channels = collapseMonoSource(copyRendered(rendered, keep), source.channels.length)
  return { sampleRate, channels }
}

function channelsOf(buffer: AudioBuffer): Float32Array[] {
  const channels: Float32Array[] = []
  for (let c = 0; c < buffer.numberOfChannels; c++) channels.push(buffer.getChannelData(c))
  return channels
}

export async function renderExportPcm(
  source: Pcm,
  prep: SamplePrepState,
  settings: ExportSettings,
  processing: ProcessingSnapshot,
  options: ProcessedRenderOptions = {},
): Promise<Pcm> {
  const scope: ExportScope = settings.scope ?? 'project'
  const range = exportSourceRange(prep, scope)
  traceExport('EXPORT START', {
    scope: settings.scope ?? 'project',
    sampleRate: source.sampleRate,
    channels: source.channels.length,
    sourceFrames: source.channels[0]?.length ?? 0,
  })
  const prepared = renderPrep(source, prep, {
    applyFades: settings.applyFades,
    applyGain: settings.applyGain,
    applyReverse: settings.applyReverse,
    applyNormalize: false,
    applyDc: prep.removeDc,
    applyChannels: true,
    sampleRate: settings.sampleRate,
    range,
  })
  const processed = await renderProcessedPcm(prepared, processing, {
    ...options,
    timelineStart: range.start,
  })
  traceExport('ENCODE START', {
    frames: processed.channels[0]?.length ?? 0,
    sampleRate: processed.sampleRate,
    channels: processed.channels.length,
  })
  if (!settings.applyNormalize) return processed
  const peak = peakAmplitude(processed.channels)
  const target = dbToGain(prep.normalizeTargetDbfs || DEFAULT_NORMALIZE_DBFS)
  if (!(peak > 1e-8)) return processed
  return { sampleRate: processed.sampleRate, channels: applyGain(processed.channels, target / peak) }
}
