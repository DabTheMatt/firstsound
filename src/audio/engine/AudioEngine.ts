import {
  defaultChain,
  normalizeChain,
  parseChain,
  reorderChain,
  setBypassed,
  type ChainModule,
  type ModuleType,
} from '../chain/chain'
import { defaultParamValues, PARAMS } from '../parameters/definitions'
import {
  applyParamValue,
  clamp,
  clampRegion,
  clampScrubTime,
  dbToGain,
  defaultPlayRegion,
  fullPlayRegion,
  playbackRate,
} from '../parameters/mapping'
import type {
  EngineMode,
  FilterType,
  ParamId,
  PlaybackDirection,
  PresetV1,
  ScrubMode,
} from '../parameters/types'
import {
  applyDelayGraph,
  applyReverbGraph,
  buildReverbBuffer,
  createDelayGraph,
  createReverbGraph,
  reverbImpulseKey,
  wetDryFor,
  type DelayGraph,
  type ReverbGraph,
} from '../fx/graphs'
import { migrateSpaceParams } from '../fx/migrate'
import { findSpacePreset, type SpacePreset } from '../fx/presets'
import { syncedDelayMs } from '../fx/sync'
import {
  noteDivisionAt,
  noteKindAt,
  parseDelayType,
  parseReverbType,
  type DelayType,
  type ReverbType,
} from '../fx/types'
import {
  applyAutoFades,
  canRedo,
  canUndo,
  clampPrep,
  clonePcmFromBuffer,
  commit,
  createHistory,
  defaultPrep,
  defaultRenderOptions,
  detectSilence,
  encodeWav,
  exportFileName,
  findZeroCrossing as snapFindZero,
  isTrimmed,
  nextVariationName,
  pcmDuration,
  prepEqual,
  renderPrep,
  resetHistory,
  type ExportSettings,
  type History,
  type Pcm,
  type RenderOptions,
  type SamplePrepState,
  type SampleVariation,
  undo as undoHistory,
  redo as redoHistory,
  PREP_MIN_REGION,
  ZERO_SEARCH_SEC,
  ZERO_WARN_SEC,
} from '../samplePrep'
import type { SilenceProposal } from '../samplePrep/prepare'
import { pingPongChannel, reverseChannel, reverseRegionInPlace, reverseTime, applyGainInPlace } from './buffers'
import { defaultEqBands, parseEqBands, type EqBand, type EqFilterType } from './eqBands'
import { regionFadeCurveFrom, regionFadeGain, type FadeCurve } from './fades'
import { motionValue } from './motion'
import { mixToMono, buildPeakMips, type PeakMip } from './peaks'
import { peakNormalizeGain, peakOfBuffer, renderRegion } from './renderRegion'
import { findZeroCrossing, indexToSeconds, secondsToIndex } from './zeroCrossing'

export type AudioStatus = 'idle' | 'blocked' | 'running'

export type EngineSnapshot = {
  fileName: string
  duration: number
  sampleRate: number
  channelCount: number
  sampleLoaded: boolean
  playing: boolean
  loop: boolean
  engineMode: EngineMode
  direction: PlaybackDirection
  filterType: FilterType
  audioStatus: AudioStatus
  scrubMode: ScrubMode
  params: Record<ParamId, number>
  chain: ChainModule[]
  eqBands: EqBand[]
  muted: boolean
  delayType: DelayType
  reverbType: ReverbType
  hasSource: boolean
  prep: SamplePrepState
  canUndoPrep: boolean
  canRedoPrep: boolean
  previewPlaying: boolean
  previewLoop: boolean
  sourceDuration: number
  sourceSampleRate: number
  sourceChannels: number
  prepApplied: boolean
  bufferRev: number
  zeroNotice: string | null
  silenceProposal: SilenceProposal | null
  variations: { id: string; name: string }[]
}

type Listener = () => void

const LOOKAHEAD = 0.08
const SCHEDULER_MS = 20
const MIN_REGION = 0.05
const RAMP = 0.008

function createContext(): AudioContext {
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  if (!Ctor) throw new Error('Web Audio is not available in this browser.')
  return new Ctor()
}

type AudioSessionNavigator = Navigator & { audioSession?: { type: string } }

function setPlaybackAudioSession(): void {
  try {
    const nav = navigator as AudioSessionNavigator
    if (nav.audioSession && nav.audioSession.type !== 'playback') {
      nav.audioSession.type = 'playback'
    }
  } catch {
    /* audioSession unsupported — Web Audio still works elsewhere. */
  }
}

type Slot = {
  instanceId: string
  type: ModuleType
  input: GainNode
  output: GainNode
  dry: GainNode
  wet: GainNode
  eq?: BiquadFilterNode[]
  shaper?: WaveShaperNode
  delay?: DelayNode
  delayFb?: GainNode
  convolver?: ConvolverNode
  predelay?: DelayNode
  damp?: BiquadFilterNode
  delayFx?: DelayGraph
  reverbFx?: ReverbGraph
}

/**
 * Client-side sample instrument engine.
 * React must not drive audio timing — this class owns the clock.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null
  private voiceBus: GainNode | null = null
  private safetyGain: GainNode | null = null
  private limiter: DynamicsCompressorNode | null = null
  private analyser: AnalyserNode | null = null
  private analyserPre: AnalyserNode | null = null
  private analyserL: AnalyserNode | null = null
  private analyserR: AnalyserNode | null = null
  private regionFade: { fadeIn: number; fadeOut: number; curve: FadeCurve } = {
    fadeIn: 0.01,
    fadeOut: 0.01,
    curve: 'equalPower',
  }
  private voiceGain: GainNode | null = null
  private fadeRestartId = 0
  private slots = new Map<string, Slot>()
  private buffer: AudioBuffer | null = null
  private sourceBuffer: AudioBuffer | null = null
  private reversed: AudioBuffer | null = null
  private mono: Float32Array | null = null
  private fileName = ''
  private playing = false
  private loop = true
  private engineMode: EngineMode = 'grain'
  private direction: PlaybackDirection = 'forward'
  private filterType: FilterType = 'off'
  private audioStatus: AudioStatus = 'idle'
  private scrubMode: ScrubMode = 'region'
  private muted = false
  private delayType: DelayType = 'digital'
  private reverbType: ReverbType = 'hall'
  private reverbIrKey = ''
  private reverbIrTimer = 0
  private params: Record<ParamId, number> = defaultParamValues()
  private chain: ChainModule[] = defaultChain()
  private eqBands: EqBand[] = defaultEqBands()
  private listeners = new Set<Listener>()
  private snapshot: EngineSnapshot
  private source: AudioBufferSourceNode | null = null
  private playCtxTime = 0
  private playOffset = 0
  private nextGrainTime = 0
  private schedulerId = 0
  private visibilityBound = false
  private unlocked = false
  private motionRandCur = 0
  private motionRandTarget = 0
  private motionClock = 0
  private reconnecting = false
  private sourceMono: Float32Array | null = null
  private sourceMips: PeakMip[][] = []
  private prep: SamplePrepState = defaultPrep(0)
  private prepHistory: History<SamplePrepState> = createHistory(this.prep)
  private prepGestureOrigin: SamplePrepState | null = null
  private prepApplied = false
  private bufferRev = 0
  private previewLoop = true
  private previewPlaying = false
  private previewSource: AudioBufferSourceNode | null = null
  private previewGain: GainNode | null = null
  private zeroNotice: string | null = null
  private silenceProposal: SilenceProposal | null = null
  private variations: SampleVariation[] = []
  private variationSeq = 0

  constructor() {
    this.snapshot = this.buildSnapshot()
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = (): EngineSnapshot => this.snapshot

  getBuffer(): AudioBuffer | null {
    return this.buffer
  }

  getMono(): Float32Array | null {
    return this.mono
  }

  getSourceBuffer(): AudioBuffer | null {
    return this.sourceBuffer
  }

  getSourceMono(): Float32Array | null {
    return this.sourceMono
  }

  getSourceMips(): PeakMip[][] {
    return this.sourceMips
  }

  getPrep(): SamplePrepState {
    return this.prep
  }

  getAnalyser(tap: 'pre' | 'post' = 'post'): AnalyserNode | null {
    if (tap === 'pre') return this.analyserPre ?? this.analyser
    return this.analyser
  }

  setRegionFades(fadeIn: number, fadeOut: number, curve: FadeCurve): void {
    const next = {
      fadeIn: Math.max(0, fadeIn),
      fadeOut: Math.max(0, fadeOut),
      curve,
    }
    const same =
      this.regionFade.fadeIn === next.fadeIn &&
      this.regionFade.fadeOut === next.fadeOut &&
      this.regionFade.curve === next.curve
    if (same) return
    this.regionFade = next
    this.emit()
    if (this.playing && this.engineMode === 'playback') {
      if (this.fadeRestartId) window.clearTimeout(this.fadeRestartId)
      this.fadeRestartId = window.setTimeout(() => {
        this.fadeRestartId = 0
        if (!this.playing || this.engineMode !== 'playback') return
        this.playOffset = this.getPlayheadSeconds()
        void this.play()
      }, 70)
    }
  }

  getChannelAnalysers(): { left: AnalyserNode | null; right: AnalyserNode | null } {
    return { left: this.analyserL, right: this.analyserR }
  }

  getPlayheadSeconds(): number {
    const duration = this.buffer?.duration ?? 0
    const { start, end } = this.region(duration)
    if (!this.playing || !this.ctx || duration <= 0) {
      if (duration <= 0) return 0
      return clamp(this.playOffset, 0, duration)
    }
    if (this.engineMode === 'grain') {
      const p = clamp(this.params.position / 100 + this.motionOffset(this.ctx.currentTime) * 0.5, 0, 1)
      return start + p * (end - start)
    }
    const rate = playbackRate(this.params.speed, this.params.pitch)
    const elapsed = (this.ctx.currentTime - this.playCtxTime) * rate
    const span = Math.max(end - start, MIN_REGION)
    if (this.direction === 'pingpong') {
      const cycle = 2 * span
      const phase = this.loop ? elapsed % cycle : Math.min(elapsed, cycle)
      return phase <= span ? start + phase : end - (phase - span)
    }
    if (this.loop) {
      if (this.direction === 'reverse') return end - (elapsed % span)
      const rel = (this.playOffset - start + elapsed) % span
      return start + (rel < 0 ? rel + span : rel)
    }
    return this.direction === 'reverse'
      ? Math.max(start, this.playOffset - elapsed)
      : Math.min(end, this.playOffset + elapsed)
  }

  async unlock(): Promise<void> {
    await this.ensureContext()
  }

  async loadDemoTone(): Promise<void> {
    await this.ensureContext()
    if (!this.ctx) return
    const duration = 8
    const rate = this.ctx.sampleRate
    const buffer = this.ctx.createBuffer(2, Math.floor(duration * rate), rate)
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch)
      let lp = 0
      for (let i = 0; i < data.length; i++) {
        const t = i / rate
        const noise = Math.random() * 2 - 1
        lp += 0.02 * (noise - lp)
        const tone = Math.sin(2 * Math.PI * 110 * t) * Math.exp(-t * 0.12)
        const grain = Math.sin(2 * Math.PI * (220 + ch * 3) * t) * 0.15
        data[i] = lp * 0.55 + tone * 0.35 + grain
      }
    }
    this.stopVoices()
    this.playing = false
    this.fileName = 'field_demo.wav'
    this.applyLoadedBuffer(buffer, true)
  }

  async loadArrayBuffer(data: ArrayBuffer, fileName: string): Promise<void> {
    await this.ensureContext()
    if (!this.ctx) return
    const copy = data.slice(0)
    const decoded = await this.ctx.decodeAudioData(copy)
    this.stopVoices()
    this.playing = false
    this.fileName = fileName
    this.applyLoadedBuffer(decoded, true)
  }

  async play(): Promise<void> {
    await this.ensureContext()
    if (!this.ctx || !this.buffer) return
    if (this.audioStatus === 'blocked') return
    this.stopVoices()
    this.playing = true
    const duration = this.buffer.duration
    this.playCtxTime = this.ctx.currentTime
    this.playOffset = clamp(this.playOffset, 0, duration)
    if (this.engineMode === 'grain') {
      this.nextGrainTime = this.ctx.currentTime
      this.schedulerId = window.setInterval(() => this.scheduleGrains(), SCHEDULER_MS)
      this.scheduleGrains()
    } else if (this.direction === 'pingpong') {
      this.startPingPongVoice()
    } else {
      this.startBufferVoice(this.playOffset)
    }
    this.emit()
  }

  stop(): void {
    if (this.fadeRestartId) {
      window.clearTimeout(this.fadeRestartId)
      this.fadeRestartId = 0
    }
    this.stopVoices()
    this.playing = false
    this.emit()
  }

  togglePlay(): void {
    if (this.playing) this.stop()
    else void this.play()
  }

  setLoop(loop: boolean): void {
    this.loop = loop
    if (this.playing) void this.play()
    else this.emit()
  }

  seekSeconds(time: number, mode: ScrubMode = this.scrubMode): void {
    const duration = this.buffer?.duration ?? 0
    if (duration <= 0) return
    const { start, end } = this.region(duration)
    const offset = clampScrubTime(time, mode, start, end, duration)
    this.playOffset = offset
    if (this.ctx) this.playCtxTime = this.ctx.currentTime
    if (this.engineMode === 'grain') {
      const span = Math.max(end - start, MIN_REGION)
      if (offset >= start && offset <= end) {
        this.params.position = applyParamValue(((offset - start) / span) * 100, PARAMS.position)
        this.applyLiveAudio()
      }
      this.emit()
      return
    }
    if (this.playing) {
      if (this.direction === 'forward') {
        this.stopVoices()
        this.startBufferVoice(offset)
        this.emit()
      } else {
        void this.play()
      }
    } else {
      this.emit()
    }
  }

  nudgePlayhead(delta: number, mode: ScrubMode = this.scrubMode): void {
    this.seekSeconds(this.getPlayheadSeconds() + delta, mode)
  }

  setScrubMode(mode: ScrubMode): void {
    if (this.scrubMode === mode) return
    this.scrubMode = mode
    const duration = this.buffer?.duration ?? 0
    if (duration > 0 && mode === 'region') {
      const { start, end } = this.region(duration)
      this.playOffset = clamp(this.playOffset, start, end)
      if (this.engineMode === 'grain') {
        const span = Math.max(end - start, MIN_REGION)
        this.params.position = applyParamValue(
          ((this.playOffset - start) / span) * 100,
          PARAMS.position,
        )
      }
    }
    this.emit()
  }

  setEngineMode(mode: EngineMode): void {
    if (this.engineMode === mode) return
    this.engineMode = mode
    this.chain = this.chain.map((mod) =>
      mod.type === 'grain' ? { ...mod, bypassed: mode === 'playback' } : mod,
    )
    if (this.playing) void this.play()
    else this.emit()
  }

  setDirection(direction: PlaybackDirection): void {
    if (this.direction === direction) return
    this.direction = direction
    if (this.playing) void this.play()
    else this.emit()
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    this.rampSafety(muted ? 0.0001 : 1)
    this.emit()
  }

  setParam(id: ParamId, value: number): void {
    const duration = this.buffer?.duration ?? 0
    if (id === 'start' || id === 'end') {
      const next = { ...this.params, [id]: value }
      const region = clampRegion(next.start, next.end, duration, MIN_REGION)
      this.params.start = region.start
      this.params.end = region.end
      this.applyRegionChange()
    } else {
      this.params[id] = applyParamValue(value, PARAMS[id])
      this.syncTimeFromClock(id)
      this.applyLiveAudio()
    }
    if (id === 'position' || id === 'start' || id === 'end') {
      const dur = this.buffer?.duration ?? 0
      const { start, end } = this.region(dur)
      this.playOffset = start + (this.params.position / 100) * Math.max(end - start, 0)
    }
    this.emit()
  }

  setParams(patch: Partial<Record<ParamId, number>>): void {
    for (const key of Object.keys(patch) as ParamId[]) {
      const value = patch[key]
      if (typeof value !== 'number') continue
      this.params[key] = applyParamValue(value, PARAMS[key])
    }
    this.syncTimeFromClock('bpm')
    this.applyLiveAudio()
    this.emit()
  }

  setDelayType(type: DelayType): void {
    if (this.delayType === type) return
    this.delayType = type
    this.applyLiveAudio()
    this.emit()
  }

  setReverbType(type: ReverbType): void {
    if (this.reverbType === type) return
    this.reverbType = type
    this.reverbIrKey = ''
    this.applyLiveAudio()
    this.emit()
  }

  applySpacePreset(preset: SpacePreset | string): void {
    const next = typeof preset === 'string' ? findSpacePreset(preset) : preset
    if (!next) return
    if (next.delayType) this.delayType = next.delayType
    if (next.reverbType) this.reverbType = next.reverbType
    this.setParams(next.params)
  }

  private syncTimeFromClock(id: ParamId): void {
    if (id === 'delayTime' && this.params.delaySync > 0.5) this.params.delaySync = 0
    if (id === 'reverbPredelay' && this.params.reverbSync > 0.5) this.params.reverbSync = 0
    if (
      this.params.delaySync > 0.5 &&
      (id === 'bpm' || id === 'delayNote' || id === 'delayNoteKind' || id === 'delaySync')
    ) {
      this.params.delayTime = applyParamValue(
        syncedDelayMs(this.params.bpm, noteDivisionAt(this.params.delayNote), noteKindAt(this.params.delayNoteKind)),
        PARAMS.delayTime,
      )
    }
    if (
      this.params.reverbSync > 0.5 &&
      (id === 'bpm' || id === 'reverbNote' || id === 'reverbNoteKind' || id === 'reverbSync')
    ) {
      this.params.reverbPredelay = applyParamValue(
        syncedDelayMs(this.params.bpm, noteDivisionAt(this.params.reverbNote), noteKindAt(this.params.reverbNoteKind)),
        PARAMS.reverbPredelay,
      )
    }
  }

  setRegion(start: number, end: number): void {
    const duration = this.buffer?.duration ?? 0
    const region = clampRegion(start, end, duration, MIN_REGION)
    this.params.start = region.start
    this.params.end = region.end
    if (!this.prepApplied) {
      this.prep = clampPrep(
        { ...this.prep, selectionStart: region.start, selectionEnd: region.end },
        this.sourceDuration(),
      )
    }
    this.applyRegionChange()
    this.emit()
  }

  private sourceDuration(): number {
    return this.sourceBuffer?.duration ?? 0
  }

  beginPrepGesture(): void {
    this.prepGestureOrigin = { ...this.prep }
  }

  setPrepLive(patch: Partial<SamplePrepState>, emit = false): void {
    this.prep = clampPrep({ ...this.prep, ...patch }, this.sourceDuration())
    if (emit) this.emit()
  }

  endPrepGesture(): void {
    const origin = this.prepGestureOrigin
    this.prepGestureOrigin = null
    if (!origin) return
    if (this.prep.fadeAuto) this.prep = applyAutoFades(this.prep)
    this.prepHistory = commit({ ...this.prepHistory, current: origin }, this.prep, prepEqual)
    this.syncInstrumentRegionFromPrep()
    this.emit()
  }

  commitPrep(patch: Partial<SamplePrepState>): void {
    const next = clampPrep({ ...this.prep, ...patch }, this.sourceDuration())
    this.prepHistory = commit(this.prepHistory, next, prepEqual)
    this.prep = this.prepHistory.current
    this.syncInstrumentRegionFromPrep()
    this.emit()
  }

  undoPrep(): void {
    if (!canUndo(this.prepHistory)) return
    this.prepHistory = undoHistory(this.prepHistory)
    this.prep = this.prepHistory.current
    this.syncInstrumentRegionFromPrep()
    this.emit()
  }

  redoPrep(): void {
    if (!canRedo(this.prepHistory)) return
    this.prepHistory = redoHistory(this.prepHistory)
    this.prep = this.prepHistory.current
    this.syncInstrumentRegionFromPrep()
    this.emit()
  }

  private syncInstrumentRegionFromPrep(): void {
    if (this.prepApplied) return
    const duration = this.buffer?.duration ?? 0
    const region = clampRegion(
      this.prep.selectionStart,
      this.prep.selectionEnd,
      duration,
      Math.min(MIN_REGION, Math.max(PREP_MIN_REGION, duration)),
    )
    this.params.start = region.start
    this.params.end = region.end
    this.applyRegionChange()
  }

  snapZero(which: 'start' | 'end'): void {
    const channels: Float32Array[] = []
    if (this.sourceBuffer) {
      for (let c = 0; c < this.sourceBuffer.numberOfChannels; c++) {
        channels.push(this.sourceBuffer.getChannelData(c))
      }
    }
    const sr = this.sourceBuffer?.sampleRate ?? 0
    const t = which === 'start' ? this.prep.selectionStart : this.prep.selectionEnd
    const hit = snapFindZero(channels, sr, t, ZERO_SEARCH_SEC, ZERO_WARN_SEC)
    this.zeroNotice = null
    if (!hit) {
      this.zeroNotice = 'No clean zero crossing nearby'
      this.emit()
      return
    }
    if (hit.far) {
      this.zeroNotice = `Nearest zero is ${Math.round(hit.distanceSec * 1000)} ms away — not moved`
      this.emit()
      return
    }
    const patch =
      which === 'start' ? { selectionStart: hit.seconds } : { selectionEnd: hit.seconds }
    const clean = hit.score < 0.08
    this.commitPrep(this.prep.fadeAuto ? applyAutoFades({ ...this.prep, ...patch }, clean) : patch)
  }

  trimToSelection(): void {
    this.commitPrep(
      applyAutoFades(
        {
          ...this.prep,
          windowStart: this.prep.selectionStart,
          windowEnd: this.prep.selectionEnd,
        },
        false,
      ),
    )
  }

  detectSilenceMarkers(): void {
    const channels: Float32Array[] = []
    if (this.sourceBuffer) {
      for (let c = 0; c < this.sourceBuffer.numberOfChannels; c++) {
        channels.push(this.sourceBuffer.getChannelData(c))
      }
    }
    const sr = this.sourceBuffer?.sampleRate ?? 0
    this.silenceProposal = detectSilence(channels, sr)
    this.emit()
  }

  applySilenceProposal(): void {
    if (!this.silenceProposal) return
    const { startSec, endSec } = this.silenceProposal
    this.silenceProposal = null
    this.commitPrep(
      applyAutoFades(
        {
          ...this.prep,
          windowStart: startSec,
          windowEnd: endSec,
          selectionStart: startSec,
          selectionEnd: endSec,
        },
        false,
      ),
    )
  }

  dismissSilenceProposal(): void {
    this.silenceProposal = null
    this.emit()
  }

  clearZeroNotice(): void {
    this.zeroNotice = null
    this.emit()
  }

  setPreviewLoop(loop: boolean): void {
    this.previewLoop = loop
    if (this.previewPlaying) void this.playSelection()
    else this.emit()
  }

  async playSelection(): Promise<void> {
    await this.ensureContext()
    if (!this.ctx || !this.sourceBuffer) return
    this.stopPreview()
    this.stopVoices()
    this.playing = false
    const pcm = this.renderCurrent({ ...defaultRenderOptions(this.prep), sampleRate: 'original' })
    const buffer = this.pcmToBuffer(pcm)
    if (!buffer || !this.previewGain) return
    const src = this.ctx.createBufferSource()
    src.buffer = buffer
    src.loop = this.previewLoop
    src.connect(this.previewGain)
    src.start(0)
    src.onended = () => {
      if (this.previewSource === src) this.stopPreview()
    }
    this.previewSource = src
    this.previewPlaying = true
    this.emit()
  }

  async playAudition(edge: 'start' | 'end'): Promise<void> {
    await this.ensureContext()
    if (!this.ctx || !this.sourceBuffer || !this.previewGain) return
    this.stopPreview()
    this.stopVoices()
    this.playing = false
    const pcm = this.renderCurrent({ ...defaultRenderOptions(this.prep), sampleRate: 'original' })
    const buffer = this.pcmToBuffer(pcm)
    if (!buffer) return
    const windowSec = Math.min(0.35, Math.max(0.08, buffer.duration * 0.2))
    const offset = edge === 'start' ? 0 : Math.max(0, buffer.duration - windowSec)
    const src = this.ctx.createBufferSource()
    src.buffer = buffer
    src.connect(this.previewGain)
    src.start(0, offset, windowSec)
    src.onended = () => {
      if (this.previewSource === src) this.stopPreview()
    }
    this.previewSource = src
    this.previewPlaying = true
    this.emit()
  }

  stopPreview(): void {
    if (this.previewSource) {
      try {
        this.previewSource.onended = null
        this.previewSource.stop()
      } catch {
        /* already stopped */
      }
      this.previewSource.disconnect()
      this.previewSource = null
    }
    const was = this.previewPlaying
    this.previewPlaying = false
    if (was) this.emit()
  }

  toggleSelectionPlayback(): void {
    if (this.previewPlaying) this.stopPreview()
    else void this.playSelection()
  }

  saveVariation(name?: string): void {
    const label =
      name?.trim() ||
      this.prep.clipName.trim() ||
      nextVariationName(
        this.fileName,
        this.variations.map((v) => v.name),
      )
    this.variationSeq += 1
    const id = `clip-${this.variationSeq}`
    const prep = { ...this.prep, clipName: label }
    this.variations = [...this.variations, { id, name: label, prep }]
    this.prep = prep
    this.emit()
  }

  loadVariation(id: string): void {
    const found = this.variations.find((v) => v.id === id)
    if (!found) return
    const next = clampPrep({ ...found.prep }, this.sourceDuration())
    this.prepHistory = commit(this.prepHistory, next, prepEqual)
    this.prep = this.prepHistory.current
    this.syncInstrumentRegionFromPrep()
    this.emit()
  }

  enterSampleEdit(): void {
    if (!this.sourceBuffer) return
    this.stopPreview()
    this.stopVoices()
    this.playing = false
    this.buffer = this.sourceBuffer
    this.reversed = this.buildReversed(this.sourceBuffer)
    this.mono = this.sourceMono
    this.prepApplied = false
    this.syncInstrumentRegionFromPrep()
    this.emit()
  }

  exportWav(settings: ExportSettings): { filename: string; blob: Blob; duration: number } | null {
    if (!this.sourceBuffer) return null
    const pcm = this.renderCurrent({
      applyFades: settings.applyFades,
      applyGain: settings.applyGain,
      applyReverse: settings.applyReverse,
      applyNormalize: settings.applyNormalize,
      applyDc: this.prep.removeDc,
      applyChannels: true,
      sampleRate: settings.sampleRate,
    })
    const bytes = encodeWav(pcm, settings.bitDepth)
    const partial =
      isTrimmed(this.prep, this.sourceDuration()) ||
      this.prep.selectionStart > this.prep.windowStart + 0.001 ||
      this.prep.selectionEnd < this.prep.windowEnd - 0.001
    const filename = settings.name || exportFileName(this.fileName, partial, this.prep.clipName)
    return {
      filename: filename.endsWith('.wav') ? filename : `${filename}.wav`,
      blob: new Blob([bytes], { type: 'audio/wav' }),
      duration: pcmDuration(pcm),
    }
  }

  renderCurrent(options?: RenderOptions): Pcm {
    if (!this.sourceBuffer) return { sampleRate: 44100, channels: [new Float32Array()] }
    return renderPrep(
      clonePcmFromBuffer(this.sourceBuffer),
      this.prep,
      options ?? defaultRenderOptions(this.prep),
    )
  }

  private pcmToBuffer(pcm: Pcm): AudioBuffer | null {
    if (!this.ctx) return null
    const frames = pcm.channels[0]?.length ?? 0
    if (frames < 1) return null
    const buffer = this.ctx.createBuffer(Math.max(1, pcm.channels.length), frames, pcm.sampleRate)
    for (let c = 0; c < pcm.channels.length; c++) {
      buffer.getChannelData(c).set(pcm.channels[c] ?? new Float32Array(frames))
    }
    return buffer
  }

  snapToZero(which: 'start' | 'end'): void {
    if (!this.buffer) return
    const time = which === 'start' ? this.params.start : this.params.end
    const channels: Float32Array[] = []
    for (let c = 0; c < this.buffer.numberOfChannels; c++) {
      channels.push(this.buffer.getChannelData(c))
    }
    const idx = secondsToIndex(time, this.buffer.sampleRate, this.buffer.length)
    const radius = Math.round(this.buffer.sampleRate * 0.08)
    const found = findZeroCrossing(channels, idx, radius)
    this.setParam(which, indexToSeconds(found, this.buffer.sampleRate))
  }

  private applyRegionChange(): void {
    if (this.playing && this.engineMode === 'playback' && this.direction === 'pingpong') {
      void this.play()
    } else {
      this.applyLiveAudio()
    }
  }

  resetParam(id: ParamId): void {
    if (id === 'start') {
      this.setParam('start', 0)
      return
    }
    if (id === 'end') {
      this.setParam('end', this.buffer?.duration ?? 1)
      return
    }
    this.setParam(id, PARAMS[id].defaultValue)
  }

  resetAll(): void {
    const duration = this.buffer?.duration ?? 0
    this.params = defaultParamValues()
    const region = defaultPlayRegion(duration, MIN_REGION)
    this.params.start = region.start
    this.params.end = region.end
    this.engineMode = 'playback'
    this.direction = 'forward'
    this.filterType = 'off'
    this.delayType = 'digital'
    this.reverbType = 'hall'
    this.reverbIrKey = ''
    this.eqBands = defaultEqBands()
    this.chain = defaultChain()
    this.muted = false
    void this.rebuildGraph()
    this.applyLiveAudio()
    this.emit()
  }

  reorderModules(fromIndex: number, toIndex: number): void {
    const next = reorderChain(this.chain, fromIndex, toIndex)
    if (next === this.chain || modulesEqual(next, this.chain)) return
    this.chain = next
    void this.rebuildGraph()
  }

  setModuleBypass(instanceId: string, bypassed: boolean): void {
    this.chain = setBypassed(this.chain, instanceId, bypassed)
    const grain = this.chain.find((m) => m.instanceId === instanceId && m.type === 'grain')
    if (grain) this.engineMode = grain.bypassed ? 'playback' : 'grain'
    this.applyBypassRamps()
    if (grain && this.playing) void this.play()
    else this.emit()
  }

  setEqBand(index: number, patch: Partial<EqBand>): void {
    const band = this.eqBands[index]
    if (!band) return
    this.eqBands = this.eqBands.map((item, i) => (i === index ? { ...item, ...patch } : item))
    this.filterType = this.eqBands[0]?.type ?? 'off'
    this.applyEq(0.03)
    this.emit()
  }

  toPreset(): PresetV1 {
    return {
      instrument: 'field',
      version: 1,
      loop: this.loop,
      engineMode: this.engineMode,
      direction: this.direction,
      reverse: this.direction === 'reverse',
      filterType: this.filterType,
      params: { ...this.params },
      chain: this.chain.map((m) => ({ ...m })),
      eqBands: this.eqBands.map((b) => ({ ...b })),
      muted: this.muted,
      delayType: this.delayType,
      reverbType: this.reverbType,
    }
  }

  applyPreset(preset: PresetV1): void {
    this.loop = preset.loop
    this.engineMode = preset.engineMode
    this.direction = preset.direction ?? (preset.reverse ? 'reverse' : 'forward')
    this.filterType = preset.filterType ?? 'off'
    this.muted = preset.muted ?? false
    this.delayType = parseDelayType(preset.delayType) ?? 'digital'
    this.reverbType = parseReverbType(preset.reverbType) ?? 'hall'
    this.reverbIrKey = ''
    const migrated = migrateSpaceParams(preset.params)
    for (const id of Object.keys(this.params) as ParamId[]) {
      const value = migrated[id]
      if (typeof value === 'number') {
        this.params[id] = value
      }
    }
    const duration = this.buffer?.duration ?? 0
    const region = clampRegion(this.params.start, this.params.end, duration, MIN_REGION)
    this.params.start = region.start
    this.params.end = region.end
    const parsedChain = parseChain(preset.chain)
    if (parsedChain) this.chain = parsedChain
    const parsedEq = parseEqBands(preset.eqBands)
    if (parsedEq) this.eqBands = parsedEq
    else if (this.filterType !== 'off') {
      const first = this.eqBands[0]
      if (first) {
        this.eqBands = [
          {
            ...first,
            type: this.filterType as EqFilterType,
            frequency: this.params.filterCutoff,
            q: this.params.filterReso,
          },
          ...this.eqBands.slice(1),
        ]
      }
    }
    void this.rebuildGraph().then(() => {
      if (this.playing) void this.play()
      else this.emit()
    })
  }

  /** Bake the current edit into the working buffer and load it as the instrument sample. */
  async useAsSample(edit?: {
    fadeIn: number
    fadeOut: number
    fadeCurve: FadeCurve
    reverse: boolean
    normalize: boolean
  }): Promise<void> {
    await this.ensureContext()
    if (!this.ctx) return
    this.stopPreview()
    this.stopVoices()
    this.playing = false
    if (edit && this.buffer) {
      const peak = peakOfBuffer(this.buffer, this.params.start, this.params.end)
      const gain = edit.normalize ? peakNormalizeGain(peak, -1) : 1
      const rendered = renderRegion(this.buffer, this.ctx, {
        start: this.params.start,
        end: this.params.end,
        reverse: edit.reverse,
        fadeIn: edit.fadeIn,
        fadeOut: edit.fadeOut,
        fadeCurve: edit.fadeCurve,
        gain,
      })
      this.fileName = stemName(this.fileName) + '_sample.wav'
      this.applyLoadedBuffer(rendered, false, 'full')
      return
    }
    if (!this.sourceBuffer) return
    const pcm = this.renderCurrent({ ...defaultRenderOptions(this.prep), sampleRate: 'original' })
    const buffer = this.pcmToBuffer(pcm)
    if (!buffer) return
    this.buffer = buffer
    this.reversed = this.buildReversed(buffer)
    this.mono = mixToMono(buffer)
    this.params.start = 0
    this.params.end = buffer.duration
    this.playOffset = 0
    this.prepApplied = true
    this.emit()
  }

  revertToSource(): void {
    if (!this.sourceBuffer) return
    this.stopVoices()
    this.playing = false
    this.applyLoadedBuffer(this.sourceBuffer, false)
  }

  /** Peak-normalize the current play region in place (does not crop). */
  normalizeRegion(): void {
    const buffer = this.detachWorkingBuffer()
    if (!buffer) return
    const { start, end } = this.region(buffer.duration)
    const gain = peakNormalizeGain(peakOfBuffer(buffer, start, end), -1)
    const idx = this.regionIndices(buffer)
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      applyGainInPlace(buffer.getChannelData(ch), idx.start, idx.end, gain)
    }
    this.afterBufferEdit()
  }

  /** Reverse the current play region in place (does not crop). */
  reverseRegion(): void {
    const buffer = this.detachWorkingBuffer()
    if (!buffer) return
    const idx = this.regionIndices(buffer)
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      reverseRegionInPlace(buffer.getChannelData(ch), idx.start, idx.end)
    }
    if (this.direction === 'reverse') this.direction = 'forward'
    this.afterBufferEdit()
  }

  renderEdit(edit: {
    fadeIn: number
    fadeOut: number
    fadeCurve: FadeCurve
    reverse: boolean
    normalize: boolean
  }): AudioBuffer | null {
    if (!this.ctx || !this.buffer) return null
    const peak = peakOfBuffer(this.buffer, this.params.start, this.params.end)
    const gain = edit.normalize ? peakNormalizeGain(peak, -1) : 1
    return renderRegion(this.buffer, this.ctx, {
      start: this.params.start,
      end: this.params.end,
      reverse: edit.reverse,
      fadeIn: edit.fadeIn,
      fadeOut: edit.fadeOut,
      fadeCurve: edit.fadeCurve,
      gain,
    })
  }

  private applyLoadedBuffer(
    buffer: AudioBuffer,
    asSource: boolean,
    regionMode: 'inset' | 'full' = 'inset',
  ): void {
    this.buffer = buffer
    if (asSource) this.sourceBuffer = buffer
    this.reversed = this.buildReversed(buffer)
    this.mono = mixToMono(buffer)
    if (asSource) {
      this.sourceMono = this.mono
      this.sourceMips = []
      if (this.sourceBuffer) {
        for (let c = 0; c < this.sourceBuffer.numberOfChannels; c++) {
          this.sourceMips.push(buildPeakMips(this.sourceBuffer.getChannelData(c)))
        }
      }
      this.variations = []
      this.variationSeq = 0
      this.prepApplied = false
      this.prep = defaultPrep(buffer.duration)
      this.prepHistory = resetHistory(this.prep)
      this.silenceProposal = null
      this.zeroNotice = null
      this.stopPreview()
      this.params = {
        ...this.params,
        start: this.prep.selectionStart,
        end: this.prep.selectionEnd,
      }
      this.playOffset = this.params.start
    } else {
      const region =
        regionMode === 'full'
          ? fullPlayRegion(buffer.duration)
          : defaultPlayRegion(buffer.duration, MIN_REGION)
      this.params = { ...this.params, start: region.start, end: region.end }
      this.playOffset = region.start
    }
    this.bufferRev++
    this.emit()
  }

  private detachWorkingBuffer(): AudioBuffer | null {
    if (!this.ctx || !this.buffer) return null
    if (this.buffer !== this.sourceBuffer) return this.buffer
    const src = this.buffer
    const copy = this.ctx.createBuffer(src.numberOfChannels, src.length, src.sampleRate)
    for (let ch = 0; ch < src.numberOfChannels; ch++) {
      copy.getChannelData(ch).set(src.getChannelData(ch))
    }
    this.buffer = copy
    return copy
  }

  private regionIndices(buffer: AudioBuffer): { start: number; end: number } {
    const { start, end } = this.region(buffer.duration)
    const sr = buffer.sampleRate
    const s = Math.min(Math.max(0, Math.floor(start * sr)), buffer.length)
    const e = Math.min(buffer.length, Math.max(s + 1, Math.floor(end * sr)))
    return { start: s, end: e }
  }

  private afterBufferEdit(): void {
    if (!this.buffer) return
    this.reversed = this.buildReversed(this.buffer)
    this.mono = mixToMono(this.buffer)
    this.bufferRev++
    if (this.playing) void this.play()
    else this.emit()
  }

  private buildReversed(buffer: AudioBuffer): AudioBuffer | null {
    if (!this.ctx) return null
    const rev = this.ctx.createBuffer(
      buffer.numberOfChannels,
      buffer.length,
      buffer.sampleRate,
    )
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      rev.getChannelData(ch).set(reverseChannel(buffer.getChannelData(ch)))
    }
    return rev
  }

  private activeBuffer(): AudioBuffer | null {
    return this.direction === 'reverse' && this.reversed ? this.reversed : this.buffer
  }

  private buildPingPong(startSec: number, endSec: number): AudioBuffer | null {
    if (!this.ctx || !this.buffer) return null
    const sr = this.buffer.sampleRate
    const s = Math.floor(startSec * sr)
    const e = Math.floor(endSec * sr)
    const len = Math.max(2, (e - s) * 2)
    const pp = this.ctx.createBuffer(this.buffer.numberOfChannels, len, sr)
    for (let ch = 0; ch < this.buffer.numberOfChannels; ch++) {
      pp.getChannelData(ch).set(pingPongChannel(this.buffer.getChannelData(ch), s, e))
    }
    return pp
  }

  private region(duration: number) {
    return clampRegion(this.params.start, this.params.end, duration, MIN_REGION)
  }

  private async ensureContext(): Promise<void> {
    setPlaybackAudioSession()
    if (!this.ctx) {
      this.ctx = createContext()
      this.buildSlots()
      this.connectSlots()
      this.bindVisibility()
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume()
    }
    if (!this.unlocked && this.ctx.state === 'running') {
      this.primeOutput()
      this.unlocked = true
    }
    this.audioStatus = this.ctx.state === 'running' ? 'running' : 'blocked'
    this.emit()
  }

  private buildSlots(): void {
    if (!this.ctx) return
    const ctx = this.ctx
    this.voiceBus = ctx.createGain()
    this.voiceBus.gain.value = 1
    this.safetyGain = ctx.createGain()
    this.safetyGain.gain.value = this.muted ? 0.0001 : 1
    this.limiter = ctx.createDynamicsCompressor()
    this.limiter.threshold.value = -6
    this.limiter.knee.value = 6
    this.limiter.ratio.value = 12
    this.limiter.attack.value = 0.003
    this.limiter.release.value = 0.12
    this.analyser = ctx.createAnalyser()
    this.analyser.fftSize = 4096
    this.analyser.smoothingTimeConstant = 0.7
    this.analyserPre = ctx.createAnalyser()
    this.analyserPre.fftSize = 4096
    this.analyserPre.smoothingTimeConstant = 0.7
    this.analyserL = ctx.createAnalyser()
    this.analyserR = ctx.createAnalyser()
    this.analyserL.fftSize = 2048
    this.analyserR.fftSize = 2048
    this.analyserL.smoothingTimeConstant = 0.4
    this.analyserR.smoothingTimeConstant = 0.4
    this.previewGain = ctx.createGain()
    this.previewGain.gain.value = 1

    for (const mod of normalizeChain(this.chain)) {
      this.slots.set(mod.instanceId, this.createSlot(mod))
    }
    this.applyLiveAudio()
    this.applyBypassRamps(0)
  }

  private createSlot(mod: ChainModule): Slot {
    const ctx = this.ctx!
    const input = ctx.createGain()
    const output = ctx.createGain()
    const dry = ctx.createGain()
    const wet = ctx.createGain()
    input.connect(dry)
    dry.connect(output)
    const slot: Slot = {
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
      return slot
    }
    if (mod.type === 'eq') {
      const bands: BiquadFilterNode[] = []
      for (let i = 0; i < 4; i++) bands.push(ctx.createBiquadFilter())
      input.connect(wet)
      wet.connect(bands[0]!)
      for (let i = 0; i < bands.length - 1; i++) bands[i]!.connect(bands[i + 1]!)
      bands.at(-1)!.connect(output)
      slot.eq = bands
    }
    if (mod.type === 'saturation') {
      const shaper = ctx.createWaveShaper()
      shaper.curve = makeTanhCurve(0)
      shaper.oversample = '2x'
      input.connect(wet)
      wet.connect(shaper)
      shaper.connect(output)
      slot.shaper = shaper
    }
    if (mod.type === 'delay') {
      input.connect(wet)
      slot.delayFx = createDelayGraph(ctx, wet, output)
    }
    if (mod.type === 'reverb') {
      input.connect(wet)
      slot.reverbFx = createReverbGraph(ctx, wet, output)
    }
    return slot
  }

  private connectSlots(): void {
    if (!this.ctx || !this.voiceBus || !this.safetyGain || !this.limiter || !this.analyser) return
    const ordered = this.chain
      .map((m) => this.slots.get(m.instanceId))
      .filter((s): s is Slot => Boolean(s))
    if (ordered.length === 0) return
    this.voiceBus.connect(ordered[0]!.input)
    if (this.analyserPre) this.voiceBus.connect(this.analyserPre)
    for (let i = 0; i < ordered.length - 1; i++) {
      ordered[i]!.output.connect(ordered[i + 1]!.input)
    }
    const last = ordered.at(-1)!
    last.output.connect(this.limiter)
    this.limiter.connect(this.safetyGain)
    this.safetyGain.connect(this.ctx.destination)
    this.limiter.connect(this.analyser)
    if (this.previewGain) this.previewGain.connect(this.limiter)
    const split = this.ctx.createChannelSplitter(2)
    this.limiter.connect(split)
    if (this.analyserL) split.connect(this.analyserL, 0)
    if (this.analyserR) split.connect(this.analyserR, 1)
  }

  private disconnectSlots(): void {
    for (const slot of this.slots.values()) {
      try {
        slot.output.disconnect()
      } catch {
        /* already disconnected */
      }
    }
    try {
      this.voiceBus?.disconnect()
    } catch {
      /* already disconnected */
    }
    try {
      this.limiter?.disconnect()
    } catch {
      /* already disconnected */
    }
    try {
      this.safetyGain?.disconnect()
    } catch {
      /* already disconnected */
    }
  }

  private async rebuildGraph(): Promise<void> {
    if (!this.ctx || this.reconnecting) {
      this.emit()
      return
    }
    this.reconnecting = true
    this.rampSafety(0.0001)
    await waitMs(28)
    if (!this.ctx) {
      this.reconnecting = false
      return
    }
    this.disconnectSlots()
    for (const mod of this.chain) {
      if (!this.slots.has(mod.instanceId)) this.slots.set(mod.instanceId, this.createSlot(mod))
    }
    this.connectSlots()
    this.applyLiveAudio()
    this.applyBypassRamps(0.01)
    this.rampSafety(this.muted ? 0.0001 : 1)
    this.reconnecting = false
    this.emit()
  }

  private rampSafety(value: number): void {
    if (!this.ctx || !this.safetyGain) return
    const now = this.ctx.currentTime
    this.safetyGain.gain.cancelScheduledValues(now)
    this.safetyGain.gain.setTargetAtTime(value, now, RAMP)
  }

  private applyBypassRamps(smoothing = 0.01): void {
    if (!this.ctx) return
    const now = this.ctx.currentTime
    for (const mod of this.chain) {
      const slot = this.slots.get(mod.instanceId)
      if (!slot) continue
      if (mod.type === 'gain' || mod.type === 'output' || mod.type === 'grain') {
        slot.dry.gain.setTargetAtTime(1, now, smoothing)
        slot.wet.gain.setTargetAtTime(0, now, smoothing)
        continue
      }
      const bypassed = mod.bypassed
      slot.dry.gain.setTargetAtTime(bypassed ? 1 : dryLevel(mod.type, this.params), now, smoothing)
      slot.wet.gain.setTargetAtTime(bypassed ? 0 : wetLevel(mod.type, this.params), now, smoothing)
    }
  }

  private primeOutput(): void {
    if (!this.ctx) return
    const buffer = this.ctx.createBuffer(1, 1, this.ctx.sampleRate)
    const src = this.ctx.createBufferSource()
    src.buffer = buffer
    src.connect(this.ctx.destination)
    src.start(0)
  }

  private bindVisibility(): void {
    if (this.visibilityBound || typeof document === 'undefined') return
    this.visibilityBound = true
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible' || !this.ctx) return
      void this.ctx.resume().then(() => {
        this.audioStatus = this.ctx?.state === 'running' ? 'running' : 'blocked'
        this.emit()
      })
    })
  }

  setFilterType(type: FilterType): void {
    this.setEqBand(0, { type: type as EqFilterType })
  }

  private applyEq(smoothing: number): void {
    if (!this.ctx) return
    const now = this.ctx.currentTime
    const nyquist = this.ctx.sampleRate / 2
    const eqSlot = [...this.slots.values()].find((s) => s.type === 'eq')
    const filters = eqSlot?.eq
    if (!filters) return
    for (let i = 0; i < filters.length; i++) {
      const band = this.eqBands[i]
      const node = filters[i]
      if (!band || !node) continue
      if (band.type === 'off') {
        node.type = 'allpass'
        node.frequency.setTargetAtTime(1000, now, smoothing)
        node.Q.setTargetAtTime(0.0001, now, smoothing)
        node.gain.setTargetAtTime(0, now, smoothing)
        continue
      }
      node.type = band.type
      node.frequency.setTargetAtTime(Math.min(band.frequency, nyquist * 0.99), now, smoothing)
      node.Q.setTargetAtTime(Math.min(20, Math.max(0.1, band.q)), now, smoothing)
      node.gain.setTargetAtTime(band.gain, now, smoothing)
    }
  }

  private applyFxParams(smoothing: number): void {
    if (!this.ctx) return
    const now = this.ctx.currentTime
    const bpm = this.params.bpm
    for (const slot of this.slots.values()) {
      if (slot.shaper) slot.shaper.curve = makeTanhCurve(this.params.saturation / 100)
      if (slot.delayFx) {
        applyDelayGraph(slot.delayFx, this.params, this.delayType, bpm, now, smoothing, this.ctx)
      }
      if (slot.reverbFx) {
        applyReverbGraph(slot.reverbFx, this.params, this.reverbType, bpm, now, smoothing)
        const key = reverbImpulseKey(this.params, this.reverbType)
        if (key !== this.reverbIrKey) {
          this.reverbIrKey = key
          if (this.reverbIrTimer) window.clearTimeout(this.reverbIrTimer)
          const fx = slot.reverbFx
          if (!fx.conv.buffer) {
            fx.conv.buffer = buildReverbBuffer(this.ctx, this.params, this.reverbType)
          } else {
            this.reverbIrTimer = window.setTimeout(() => {
              this.reverbIrTimer = 0
              if (!this.ctx || !fx) return
              fx.conv.buffer = buildReverbBuffer(this.ctx, this.params, this.reverbType)
            }, 40)
          }
        }
      }
    }
  }

  private applyLiveAudio(): void {
    if (!this.ctx) return
    const now = this.ctx.currentTime
    const gainSlot = [...this.slots.values()].find((s) => s.type === 'gain')
    const outSlot = [...this.slots.values()].find((s) => s.type === 'output')
    if (gainSlot) gainSlot.output.gain.setTargetAtTime(dbToGain(this.params.gain), now, 0.03)
    if (outSlot) outSlot.output.gain.setTargetAtTime(dbToGain(this.params.outputGain), now, 0.03)
    this.applyEq(0.03)
    this.applyFxParams(0.03)
    this.applyBypassRamps(0.03)
    if (this.source && this.engineMode === 'playback') {
      const rate = playbackRate(this.params.speed, this.params.pitch)
      this.source.playbackRate.setTargetAtTime(rate, now, 0.03)
      if (this.direction !== 'pingpong') {
        const duration = this.buffer?.duration ?? 0
        const { start, end } = this.region(duration)
        this.source.loopStart = this.direction === 'reverse' ? reverseTime(end, duration) : start
        this.source.loopEnd = this.direction === 'reverse' ? reverseTime(start, duration) : end
      }
    }
  }

  private startBufferVoice(offset: number): void {
    const buffer = this.activeBuffer()
    if (!this.ctx || !this.voiceBus || !buffer) return
    const duration = buffer.duration
    const { start, end } = this.region(duration)
    const reverse = this.direction === 'reverse'
    const loopStart = reverse ? reverseTime(end, duration) : start
    const loopEnd = reverse ? reverseTime(start, duration) : end
    const span = Math.max(loopEnd - loopStart, MIN_REGION)
    const mapped = reverse ? reverseTime(offset, duration) : offset
    const clamped = Math.min(Math.max(mapped, loopStart), Math.max(loopStart, loopEnd - 0.001))
    const fromRel = Math.max(0, clamped - loopStart)
    const remaining = Math.max(0.01, loopEnd - clamped)
    const rate = playbackRate(this.params.speed, this.params.pitch)
    const src = this.ctx.createBufferSource()
    src.buffer = buffer
    src.loop = false
    src.playbackRate.value = rate
    this.connectFadedVoice(src, fromRel, span, remaining / rate)
    src.start(this.ctx.currentTime, clamped, remaining)
    src.onended = () => {
      if (this.source !== src || !this.playing) return
      if (this.loop) {
        this.source = null
        this.playOffset = reverse ? end : start
        this.playCtxTime = this.ctx?.currentTime ?? 0
        this.startBufferVoice(this.playOffset)
        return
      }
      this.stop()
    }
    this.source = src
  }

  private startPingPongVoice(): void {
    if (!this.ctx || !this.voiceBus || !this.buffer) return
    const { start, end } = this.region(this.buffer.duration)
    const buffer = this.buildPingPong(start, end)
    if (!buffer) return
    const span = buffer.duration
    const rate = playbackRate(this.params.speed, this.params.pitch)
    const src = this.ctx.createBufferSource()
    src.buffer = buffer
    src.loop = false
    src.playbackRate.value = rate
    this.connectFadedVoice(src, 0, span, span / rate)
    src.start(this.ctx.currentTime, 0)
    src.onended = () => {
      if (this.source !== src || !this.playing) return
      if (this.loop) {
        this.source = null
        this.playOffset = start
        this.playCtxTime = this.ctx?.currentTime ?? 0
        this.startPingPongVoice()
        return
      }
      this.stop()
    }
    this.source = src
  }

  private connectFadedVoice(
    src: AudioBufferSourceNode,
    fromRel: number,
    span: number,
    durationSec: number,
  ): void {
    if (!this.ctx || !this.voiceBus) return
    this.disconnectVoiceGain()
    const gain = this.ctx.createGain()
    const curve = regionFadeCurveFrom(
      fromRel,
      span,
      this.regionFade.fadeIn,
      this.regionFade.fadeOut,
      this.regionFade.curve,
      96,
    )
    gain.gain.setValueCurveAtTime(curve, this.ctx.currentTime, Math.max(0.008, durationSec))
    src.connect(gain)
    gain.connect(this.voiceBus)
    this.voiceGain = gain
  }

  private disconnectVoiceGain(): void {
    if (!this.voiceGain) return
    try {
      this.voiceGain.disconnect()
    } catch {
      /* already disconnected */
    }
    this.voiceGain = null
  }

  private motionOffset(t: number): number {
    return motionValue(
      this.params.motionDepth,
      this.params.motionRate,
      this.params.motionJitter,
      this.motionRandCur,
      t,
    )
  }

  private advanceMotion(): void {
    if (this.params.motionDepth <= 0 || this.params.motionJitter <= 0) return
    const dt = SCHEDULER_MS / 1000
    this.motionClock += dt
    const period = 1 / Math.max(this.params.motionRate, 0.02)
    if (this.motionClock >= period) {
      this.motionClock -= period
      this.motionRandTarget = Math.random() * 2 - 1
    }
    this.motionRandCur += (this.motionRandTarget - this.motionRandCur) * Math.min(1, dt * 4)
  }

  private scheduleGrains(): void {
    const buffer = this.activeBuffer()
    if (!this.playing || this.engineMode !== 'grain' || !this.ctx || !buffer || !this.voiceBus) {
      return
    }
    const ctx = this.ctx
    const duration = buffer.duration
    const horizon = ctx.currentTime + LOOKAHEAD
    const density = Math.max(this.params.density, 0.5)
    const interval = 1 / density
    const grainDur = this.params.grainSize / 1000
    const { start, end } = this.region(duration)
    const span = Math.max(end - start, MIN_REGION)
    const amp = 0.35 / Math.sqrt(density / 8)
    this.advanceMotion()

    while (this.nextGrainTime < horizon) {
      const t = Math.max(this.nextGrainTime, ctx.currentTime)
      const scatter = this.params.scatter / 100
      const pos = clamp(this.params.position / 100 + this.motionOffset(t) * 0.5, 0, 1)
      const jitter = (Math.random() * 2 - 1) * scatter * span * 0.5
      let offset = start + pos * span + jitter
      offset = Math.min(Math.max(offset, start), Math.max(start, end - grainDur * 0.25))
      const grainPitch =
        this.params.grainPitch + (Math.random() * 2 - 1) * this.params.pitchSpread
      const rate = playbackRate(this.params.speed, this.params.pitch + grainPitch)

      const playbackRel =
        this.direction === 'reverse' ? Math.max(0, end - offset) : Math.max(0, offset - start)
      const fadeAmp = regionFadeGain(
        playbackRel,
        span,
        this.regionFade.fadeIn,
        this.regionFade.fadeOut,
        this.regionFade.curve,
      )
      const src = ctx.createBufferSource()
      src.buffer = buffer
      src.playbackRate.value = rate
      const gain = ctx.createGain()
      const attack = Math.min(0.012, grainDur * 0.25)
      const releaseStart = Math.max(attack, grainDur - grainDur * 0.35)
      const peak = amp * fadeAmp
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(peak, t + attack)
      gain.gain.linearRampToValueAtTime(peak, t + releaseStart)
      gain.gain.linearRampToValueAtTime(0, t + grainDur)
      src.connect(gain)
      gain.connect(this.voiceBus)
      const dur = Math.min(grainDur, Math.max(0.01, duration - offset))
      const grainOffset =
        this.direction === 'reverse' ? Math.max(0, duration - offset - dur) : offset
      src.start(t, grainOffset, dur)
      src.stop(t + dur + 0.02)
      this.nextGrainTime += interval
    }
  }

  private stopVoices(): void {
    if (this.schedulerId) {
      window.clearInterval(this.schedulerId)
      this.schedulerId = 0
    }
    if (this.source) {
      try {
        this.source.onended = null
        this.source.stop()
      } catch {
        /* already stopped */
      }
      this.source.disconnect()
      this.source = null
    }
    this.disconnectVoiceGain()
  }

  private buildSnapshot(): EngineSnapshot {
    return {
      fileName: this.fileName,
      duration: this.buffer?.duration ?? 0,
      sampleRate: this.buffer?.sampleRate ?? this.ctx?.sampleRate ?? 0,
      channelCount: this.buffer?.numberOfChannels ?? 0,
      sampleLoaded: Boolean(this.buffer),
      playing: this.playing,
      loop: this.loop,
      engineMode: this.engineMode,
      direction: this.direction,
      filterType: this.filterType,
      audioStatus: this.audioStatus,
      scrubMode: this.scrubMode,
      params: { ...this.params },
      chain: this.chain.map((m) => ({ ...m })),
      eqBands: this.eqBands.map((b) => ({ ...b })),
      muted: this.muted,
      delayType: this.delayType,
      reverbType: this.reverbType,
      hasSource: Boolean(this.sourceBuffer) && this.sourceBuffer !== this.buffer,
      prep: { ...this.prep },
      canUndoPrep: canUndo(this.prepHistory),
      canRedoPrep: canRedo(this.prepHistory),
      previewPlaying: this.previewPlaying,
      previewLoop: this.previewLoop,
      sourceDuration: this.sourceBuffer?.duration ?? 0,
      sourceSampleRate: this.sourceBuffer?.sampleRate ?? 0,
      sourceChannels: this.sourceBuffer?.numberOfChannels ?? 0,
      prepApplied: this.prepApplied,
      bufferRev: this.bufferRev,
      zeroNotice: this.zeroNotice,
      silenceProposal: this.silenceProposal,
      variations: this.variations.map((v) => ({ id: v.id, name: v.name })),
    }
  }

  private emit(): void {
    this.snapshot = this.buildSnapshot()
    for (const listener of this.listeners) listener()
  }
}

export const engine = new AudioEngine()

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function makeTanhCurve(amount: number): Float32Array<ArrayBuffer> {
  const n = 1024
  const curve = new Float32Array(new ArrayBuffer(n * 4))
  const k = 1 + amount * 10
  const denom = Math.tanh(k)
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1
    curve[i] = denom === 0 ? x : Math.tanh(k * x) / denom
  }
  return curve
}

function wetLevel(type: ModuleType, params: Record<ParamId, number>): number {
  if (type === 'delay') return wetDryFor('delay', params).wet
  if (type === 'reverb') return wetDryFor('reverb', params).wet
  if (type === 'saturation') return params.saturation > 0 ? 1 : 0
  if (type === 'eq') return 1
  return 0
}

function dryLevel(type: ModuleType, params: Record<ParamId, number>): number {
  if (type === 'delay') return wetDryFor('delay', params).dry
  if (type === 'reverb') return wetDryFor('reverb', params).dry
  if (type === 'saturation') return params.saturation > 0 ? 0 : 1
  if (type === 'eq') return 0
  return 1
}

function modulesEqual(a: ChainModule[], b: ChainModule[]): boolean {
  if (a.length !== b.length) return false
  return a.every(
    (m, i) =>
      m.instanceId === b[i]?.instanceId &&
      m.type === b[i]?.type &&
      m.bypassed === b[i]?.bypassed,
  )
}

function stemName(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, '') || 'sample'
}
