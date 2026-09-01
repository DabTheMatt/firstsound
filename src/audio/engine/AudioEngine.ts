import { defaultParamValues, PARAMS } from '../parameters/definitions'
import {
  applyParamValue,
  clamp,
  clampRegion,
  clampScrubTime,
  dbToGain,
  defaultPlayRegion,
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
  findZeroCrossing,
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
import { pingPongChannel, reverseChannel, reverseTime } from './buffers'
import { motionValue } from './motion'
import { mixToMono, buildPeakMips, type PeakMip } from './peaks'

export type AudioStatus = 'idle' | 'blocked' | 'running'

export type EngineSnapshot = {
  fileName: string
  duration: number
  sampleLoaded: boolean
  playing: boolean
  loop: boolean
  engineMode: EngineMode
  direction: PlaybackDirection
  filterType: FilterType
  audioStatus: AudioStatus
  scrubMode: ScrubMode
  params: Record<ParamId, number>
  prep: SamplePrepState
  canUndoPrep: boolean
  canRedoPrep: boolean
  previewPlaying: boolean
  previewLoop: boolean
  sourceDuration: number
  sourceSampleRate: number
  sourceChannels: number
  prepApplied: boolean
  zeroNotice: string | null
  silenceProposal: SilenceProposal | null
  variations: { id: string; name: string }[]
}

type Listener = () => void

const LOOKAHEAD = 0.08
const SCHEDULER_MS = 20
const MIN_REGION = 0.05

function createContext(): AudioContext {
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  if (!Ctor) throw new Error('Web Audio is not available in this browser.')
  return new Ctor()
}

type AudioSessionNavigator = Navigator & { audioSession?: { type: string } }

/** Route audio through the "playback" category so iOS ignores the silent switch. */
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

/**
 * Client-side sample instrument engine.
 * React must not drive audio timing — this class owns the clock.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private filter: BiquadFilterNode | null = null
  private spaceSend: GainNode | null = null
  private delay: DelayNode | null = null
  private delayFeedback: GainNode | null = null
  private reverb: ConvolverNode | null = null
  private reverbGain: GainNode | null = null
  private limiter: DynamicsCompressorNode | null = null
  private buffer: AudioBuffer | null = null
  // Original decoded file — sample prep stays non-destructive until render/export.
  private sourceBuffer: AudioBuffer | null = null
  // Time-reversed copy of `buffer`; Web Audio can't play a source backwards, so
  // reverse playback plays this forward instead.
  private reversed: AudioBuffer | null = null
  private mono: Float32Array | null = null
  private sourceMono: Float32Array | null = null
  private fileName = ''
  private playing = false
  private loop = true
  private engineMode: EngineMode = 'grain'
  private direction: PlaybackDirection = 'forward'
  private filterType: FilterType = 'off'
  private audioStatus: AudioStatus = 'idle'
  private scrubMode: ScrubMode = 'region'
  private params: Record<ParamId, number> = defaultParamValues()
  private listeners = new Set<Listener>()
  private snapshot: EngineSnapshot
  private source: AudioBufferSourceNode | null = null
  private playCtxTime = 0
  private playOffset = 0
  private nextGrainTime = 0
  private schedulerId = 0
  private visibilityBound = false
  private unlocked = false
  // Motion modulation state (grain-position drift): smoothed random-walk value.
  private motionRandCur = 0
  private motionRandTarget = 0
  private motionClock = 0
  private prep: SamplePrepState = defaultPrep(0)
  private prepHistory: History<SamplePrepState> = createHistory(this.prep)
  private prepGestureOrigin: SamplePrepState | null = null
  private prepApplied = false
  private previewLoop = true
  private previewPlaying = false
  private previewSource: AudioBufferSourceNode | null = null
  private previewGain: GainNode | null = null
  private previewStartedAt = 0
  private previewOffset = 0
  private previewDuration = 0
  private zeroNotice: string | null = null
  private silenceProposal: SilenceProposal | null = null
  private sourceMips: PeakMip[][] = []
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

  getSourceChannels(): Float32Array[] {
    if (!this.sourceBuffer) return []
    const out: Float32Array[] = []
    for (let c = 0; c < this.sourceBuffer.numberOfChannels; c++) {
      out.push(this.sourceBuffer.getChannelData(c))
    }
    return out
  }

  getSourceMips(): PeakMip[][] {
    return this.sourceMips
  }

  getPrep(): SamplePrepState {
    return this.prep
  }

  getPlayheadSeconds(): number {
    if (this.previewPlaying && this.ctx) {
      const elapsed = this.ctx.currentTime - this.previewStartedAt
      const span = this.previewDuration
      if (span <= 0) return this.prep.selectionStart
      const t = this.previewOffset + elapsed
      const phase = this.previewLoop ? t % span : Math.min(t, span)
      return this.prep.selectionStart + phase
    }
    const duration = this.buffer?.duration ?? 0
    const { start, end } = this.region(duration)
    if (!this.playing || !this.ctx || duration <= 0) {
      if (duration <= 0) return 0
      return clamp(this.playOffset, 0, duration)
    }
    if (this.engineMode === 'grain') {
      // Reflect motion drift in the playhead so modulation is visible.
      const p = clamp(this.params.position / 100 + this.motionOffset(this.ctx.currentTime) * 0.5, 0, 1)
      return start + p * (end - start)
    }
    const rate = playbackRate(this.params.speed, this.params.pitch)
    const elapsed = (this.ctx.currentTime - this.playCtxTime) * rate
    const span = Math.max(end - start, MIN_REGION)
    if (this.direction === 'pingpong') {
      // Bounce start -> end -> start over a 2*span cycle.
      const cycle = 2 * span
      const phase = this.loop ? elapsed % cycle : Math.min(elapsed, cycle)
      return phase <= span ? start + phase : end - (phase - span)
    }
    if (this.loop) {
      // Reverse counts the playhead down from `end`, wrapping back to `end`.
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
    this.applyLoadedBuffer(buffer)
  }

  async loadArrayBuffer(data: ArrayBuffer, fileName: string): Promise<void> {
    await this.ensureContext()
    if (!this.ctx) return
    const copy = data.slice(0)
    const decoded = await this.ctx.decodeAudioData(copy)
    this.stopVoices()
    this.playing = false
    this.fileName = fileName
    this.applyLoadedBuffer(decoded)
  }

  async play(): Promise<void> {
    await this.ensureContext()
    if (!this.ctx || !this.buffer) return
    if (this.audioStatus === 'blocked') return
    this.stopPreview()
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

  /**
   * Move the playhead to an absolute time in the sample.
   * `region` clamps to the loop selection; `sample` allows the full file.
   */
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

  /** Nudge the playhead by `delta` seconds, honoring the active scrub mode. */
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
    if (this.playing) void this.play()
    else this.emit()
  }

  setDirection(direction: PlaybackDirection): void {
    if (this.direction === direction) return
    this.direction = direction
    if (this.playing) void this.play()
    else this.emit()
  }

  setParam(id: ParamId, value: number): void {
    const duration = this.buffer?.duration ?? 0
    if (id === 'start' || id === 'end') {
      const next = { ...this.params, [id]: value }
      const region = clampRegion(next.start, next.end, duration, MIN_REGION)
      this.params.start = region.start
      this.params.end = region.end
      if (!this.prepApplied) {
        this.prep = clampPrep(
          { ...this.prep, selectionStart: region.start, selectionEnd: region.end },
          this.sourceDuration(),
        )
      }
      this.applyRegionChange()
    } else {
      this.params[id] = applyParamValue(value, PARAMS[id])
      this.applyLiveAudio()
    }
    if (id === 'position' || id === 'start' || id === 'end') {
      const dur = this.buffer?.duration ?? 0
      const { start, end } = this.region(dur)
      this.playOffset = start + (this.params.position / 100) * Math.max(end - start, 0)
    }
    this.emit()
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

  /** Ping-pong bakes the region into a buffer, so a region change rebuilds it. */
  private applyRegionChange(): void {
    if (this.playing && this.engineMode === 'playback' && this.direction === 'pingpong') {
      void this.play()
    } else {
      this.applyLiveAudio()
    }
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
    if (this.prep.fadeAuto) {
      this.prep = applyAutoFades(this.prep)
    }
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
    const channels = this.getSourceChannels()
    const sr = this.sourceBuffer?.sampleRate ?? 0
    const t = which === 'start' ? this.prep.selectionStart : this.prep.selectionEnd
    const hit = findZeroCrossing(channels, sr, t, ZERO_SEARCH_SEC, ZERO_WARN_SEC)
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
    const next = applyAutoFades(
      {
        ...this.prep,
        windowStart: this.prep.selectionStart,
        windowEnd: this.prep.selectionEnd,
      },
      false,
    )
    this.commitPrep(next)
  }

  detectSilenceMarkers(): void {
    const channels = this.getSourceChannels()
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
    this.previewStartedAt = this.ctx.currentTime
    this.previewOffset = 0
    this.previewDuration = pcmDuration(pcm)
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
    this.previewStartedAt = this.ctx.currentTime
    this.previewOffset = offset
    this.previewDuration = buffer.duration
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

  async useAsSample(): Promise<void> {
    await this.ensureContext()
    if (!this.ctx || !this.sourceBuffer) return
    this.stopPreview()
    this.stopVoices()
    this.playing = false
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
    const options = {
      applyFades: settings.applyFades,
      applyGain: settings.applyGain,
      applyReverse: settings.applyReverse,
      applyNormalize: settings.applyNormalize,
      applyDc: this.prep.removeDc,
      applyChannels: true,
      sampleRate: settings.sampleRate,
    }
    const pcm = this.renderCurrent(options)
    const bytes = encodeWav(pcm, settings.bitDepth)
    const partial = isTrimmed(this.prep, this.sourceDuration()) ||
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
    this.applyLiveAudio()
    this.emit()
  }

  toPreset(): PresetV1 {
    return {
      instrument: 'field',
      version: 1,
      loop: this.loop,
      engineMode: this.engineMode,
      direction: this.direction,
      // Legacy field so older builds still read a sensible value.
      reverse: this.direction === 'reverse',
      filterType: this.filterType,
      params: { ...this.params },
    }
  }

  applyPreset(preset: PresetV1): void {
    this.loop = preset.loop
    this.engineMode = preset.engineMode
    this.direction = preset.direction ?? (preset.reverse ? 'reverse' : 'forward')
    this.filterType = preset.filterType ?? 'off'
    for (const id of Object.keys(this.params) as ParamId[]) {
      const value = preset.params[id]
      if (typeof value === 'number') {
        this.params[id] = applyParamValue(value, PARAMS[id])
      }
    }
    const duration = this.buffer?.duration ?? 0
    const region = clampRegion(this.params.start, this.params.end, duration, MIN_REGION)
    this.params.start = region.start
    this.params.end = region.end
    if (this.playing) void this.play()
    else {
      this.applyLiveAudio()
      this.emit()
    }
  }

  private applyLoadedBuffer(buffer: AudioBuffer): void {
    this.sourceBuffer = buffer
    this.buffer = buffer
    this.reversed = this.buildReversed(buffer)
    this.mono = mixToMono(buffer)
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
    const region = {
      start: this.prep.selectionStart,
      end: this.prep.selectionEnd,
    }
    this.params = { ...this.params, start: region.start, end: region.end }
    this.playOffset = region.start
    this.emit()
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

  /** Buffer feeding the voices — reversed copy when playing backwards. */
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
    // iOS Safari plays Web Audio through the "ambient" session by default, which
    // the hardware silent switch mutes. Opt into "playback" so sound is audible
    // regardless of the mute switch (iOS 16.4+). Must run inside a user gesture.
    setPlaybackAudioSession()
    if (!this.ctx) {
      this.ctx = createContext()
      this.master = this.ctx.createGain()
      this.filter = this.ctx.createBiquadFilter()
      this.limiter = this.ctx.createDynamicsCompressor()
      this.limiter.threshold.value = -6
      this.limiter.knee.value = 6
      this.limiter.ratio.value = 12
      this.limiter.attack.value = 0.003
      this.limiter.release.value = 0.12
      // Dry path: voices -> master gain -> filter -> limiter -> output.
      // Space send (parallel): filter -> spaceSend -> delay(+feedback) & reverb -> limiter.
      this.spaceSend = this.ctx.createGain()
      this.delay = this.ctx.createDelay(2)
      this.delayFeedback = this.ctx.createGain()
      this.reverb = this.ctx.createConvolver()
      this.reverb.buffer = this.buildReverbImpulse()
      this.reverbGain = this.ctx.createGain()
      this.master.connect(this.filter)
      this.filter.connect(this.limiter)
      this.filter.connect(this.spaceSend)
      this.spaceSend.connect(this.delay)
      this.delay.connect(this.delayFeedback)
      this.delayFeedback.connect(this.delay)
      this.delay.connect(this.limiter)
      this.spaceSend.connect(this.reverb)
      this.reverb.connect(this.reverbGain)
      this.reverbGain.connect(this.limiter)
      this.limiter.connect(this.ctx.destination)
      this.previewGain = this.ctx.createGain()
      this.previewGain.gain.value = 1
      this.previewGain.connect(this.limiter)
      this.master.gain.value = dbToGain(this.params.gain)
      // Initialise space params directly; live changes are smoothed in applySpace.
      this.spaceSend.gain.value = this.params.spaceMix / 100
      this.delay.delayTime.value = this.params.delayTime / 1000
      this.delayFeedback.gain.value = Math.min(0.95, this.params.delayFeedback / 100)
      this.reverbGain.gain.value = this.params.reverb / 100
      this.applyFilter(0)
      this.bindVisibility()
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume()
    }
    // Older iOS needs a source started from the gesture to fully unlock output.
    if (!this.unlocked && this.ctx.state === 'running') {
      this.primeOutput()
      this.unlocked = true
    }
    this.audioStatus = this.ctx.state === 'running' ? 'running' : 'blocked'
    this.emit()
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
    // iOS suspends AudioContext in the background; resume on return.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible' || !this.ctx) return
      void this.ctx.resume().then(() => {
        this.audioStatus = this.ctx?.state === 'running' ? 'running' : 'blocked'
        this.emit()
      })
    })
  }

  setFilterType(type: FilterType): void {
    if (this.filterType === type) return
    this.filterType = type
    this.applyFilter(0.02)
    this.emit()
  }

  /**
   * Configure the biquad from current params. When `off` we keep the node in the
   * graph but make it transparent (open low-pass, no resonance) instead of
   * reconnecting the graph, which would risk clicks mid-playback.
   */
  private applyFilter(smoothing: number): void {
    if (!this.ctx || !this.filter) return
    const now = this.ctx.currentTime
    const nyquist = this.ctx.sampleRate / 2
    if (this.filterType === 'off') {
      this.filter.type = 'lowpass'
      this.filter.frequency.setTargetAtTime(Math.min(20000, nyquist), now, smoothing)
      this.filter.Q.setTargetAtTime(0.0001, now, smoothing)
      return
    }
    this.filter.type = this.filterType
    const cutoff = Math.min(this.params.filterCutoff, nyquist * 0.99)
    this.filter.frequency.setTargetAtTime(cutoff, now, smoothing)
    this.filter.Q.setTargetAtTime(this.params.filterReso, now, smoothing)
  }

  /** Exponentially decaying stereo noise — a lightweight synthetic reverb tail. */
  private buildReverbImpulse(): AudioBuffer | null {
    if (!this.ctx) return null
    const sr = this.ctx.sampleRate
    const len = Math.floor(sr * 2.2)
    const ir = this.ctx.createBuffer(2, len, sr)
    for (let ch = 0; ch < 2; ch++) {
      const data = ir.getChannelData(ch)
      for (let i = 0; i < len; i++) {
        const decay = (1 - i / len) ** 2.5
        data[i] = (Math.random() * 2 - 1) * decay
      }
    }
    return ir
  }

  private applySpace(smoothing: number): void {
    if (!this.ctx || !this.spaceSend || !this.delay || !this.delayFeedback || !this.reverbGain) {
      return
    }
    const now = this.ctx.currentTime
    this.spaceSend.gain.setTargetAtTime(this.params.spaceMix / 100, now, smoothing)
    this.delay.delayTime.setTargetAtTime(this.params.delayTime / 1000, now, smoothing)
    // Clamp feedback below unity so the delay tail always decays.
    this.delayFeedback.gain.setTargetAtTime(
      Math.min(0.95, this.params.delayFeedback / 100),
      now,
      smoothing,
    )
    this.reverbGain.gain.setTargetAtTime(this.params.reverb / 100, now, smoothing)
  }

  private applyLiveAudio(): void {
    if (!this.ctx || !this.master) return
    const now = this.ctx.currentTime
    this.master.gain.setTargetAtTime(dbToGain(this.params.gain), now, 0.03)
    this.applyFilter(0.03)
    this.applySpace(0.03)
    if (this.source && this.engineMode === 'playback') {
      const rate = playbackRate(this.params.speed, this.params.pitch)
      this.source.playbackRate.setTargetAtTime(rate, now, 0.03)
      // Ping-pong loops the whole baked buffer, so its loop points stay fixed.
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
    if (!this.ctx || !this.master || !buffer) return
    const duration = buffer.duration
    const { start, end } = this.region(duration)
    const reverse = this.direction === 'reverse'
    const src = this.ctx.createBufferSource()
    src.buffer = buffer
    src.loop = this.loop
    // Reversed buffer: mirror the region so the same forward-time window plays.
    src.loopStart = reverse ? reverseTime(end, duration) : start
    src.loopEnd = reverse ? reverseTime(start, duration) : end
    src.playbackRate.value = playbackRate(this.params.speed, this.params.pitch)
    src.connect(this.master)
    const mapped = reverse ? reverseTime(offset, duration) : offset
    // Allow sample-mode seeks outside the loop region; still stay in the buffer.
    const clamped = Math.min(Math.max(mapped, 0), Math.max(0, duration - 0.001))
    src.start(this.ctx.currentTime, clamped)
    if (!this.loop) {
      src.onended = () => {
        if (this.source === src) this.stop()
      }
    }
    this.source = src
  }

  private startPingPongVoice(): void {
    if (!this.ctx || !this.master || !this.buffer) return
    const { start, end } = this.region(this.buffer.duration)
    const buffer = this.buildPingPong(start, end)
    if (!buffer) return
    const src = this.ctx.createBufferSource()
    src.buffer = buffer
    src.loop = this.loop
    src.loopStart = 0
    src.loopEnd = buffer.duration
    src.playbackRate.value = playbackRate(this.params.speed, this.params.pitch)
    src.connect(this.master)
    src.start(this.ctx.currentTime, 0)
    if (!this.loop) {
      src.onended = () => {
        if (this.source === src) this.stop()
      }
    }
    this.source = src
  }

  /** Slow drift applied to the grain position: sine LFO blended with a random walk. */
  private motionOffset(t: number): number {
    return motionValue(
      this.params.motionDepth,
      this.params.motionRate,
      this.params.motionJitter,
      this.motionRandCur,
      t,
    )
  }

  /** Step the motion random-walk once per scheduler tick toward a new target. */
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
    if (!this.playing || this.engineMode !== 'grain' || !this.ctx || !buffer || !this.master) {
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

      const src = ctx.createBufferSource()
      src.buffer = buffer
      src.playbackRate.value = rate
      const gain = ctx.createGain()
      const attack = Math.min(0.012, grainDur * 0.25)
      const releaseStart = Math.max(attack, grainDur - grainDur * 0.35)
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(amp, t + attack)
      gain.gain.linearRampToValueAtTime(amp, t + releaseStart)
      gain.gain.linearRampToValueAtTime(0, t + grainDur)
      src.connect(gain)
      gain.connect(this.master)
      const dur = Math.min(grainDur, Math.max(0.01, duration - offset))
      // Mirror the grain window so each grain also plays backwards when reversed.
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
  }

  private buildSnapshot(): EngineSnapshot {
    return {
      fileName: this.fileName,
      duration: this.buffer?.duration ?? 0,
      sampleLoaded: Boolean(this.buffer),
      playing: this.playing,
      loop: this.loop,
      engineMode: this.engineMode,
      direction: this.direction,
      filterType: this.filterType,
      audioStatus: this.audioStatus,
      scrubMode: this.scrubMode,
      params: { ...this.params },
      prep: { ...this.prep },
      canUndoPrep: canUndo(this.prepHistory),
      canRedoPrep: canRedo(this.prepHistory),
      previewPlaying: this.previewPlaying,
      previewLoop: this.previewLoop,
      sourceDuration: this.sourceBuffer?.duration ?? 0,
      sourceSampleRate: this.sourceBuffer?.sampleRate ?? 0,
      sourceChannels: this.sourceBuffer?.numberOfChannels ?? 0,
      prepApplied: this.prepApplied,
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
