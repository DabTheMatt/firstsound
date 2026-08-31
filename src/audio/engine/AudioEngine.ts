import { defaultParamValues, PARAMS } from '../parameters/definitions'
import {
  applyParamValue,
  clampRegion,
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
} from '../parameters/types'
import { pingPongChannel, reverseChannel, reverseTime } from './buffers'
import { mixToMono } from './peaks'

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
  params: Record<ParamId, number>
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
  private limiter: DynamicsCompressorNode | null = null
  private buffer: AudioBuffer | null = null
  // Time-reversed copy of `buffer`; Web Audio can't play a source backwards, so
  // reverse playback plays this forward instead.
  private reversed: AudioBuffer | null = null
  private mono: Float32Array | null = null
  private fileName = ''
  private playing = false
  private loop = true
  private engineMode: EngineMode = 'grain'
  private direction: PlaybackDirection = 'forward'
  private filterType: FilterType = 'off'
  private audioStatus: AudioStatus = 'idle'
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

  getPlayheadSeconds(): number {
    const duration = this.buffer?.duration ?? 0
    const { start, end } = this.region(duration)
    if (!this.playing || !this.ctx || duration <= 0) {
      if (this.engineMode === 'grain') {
        return start + (this.params.position / 100) * (end - start)
      }
      return start
    }
    if (this.engineMode === 'grain') {
      return start + (this.params.position / 100) * (end - start)
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
    this.stopVoices()
    this.playing = true
    const { start } = this.region(this.buffer.duration)
    this.playCtxTime = this.ctx.currentTime
    const { end } = this.region(this.buffer.duration)
    this.playOffset =
      this.engineMode === 'grain'
        ? start + (this.params.position / 100) * (end - start)
        : this.direction === 'reverse'
          ? end
          : start
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
      this.applyRegionChange()
    } else {
      this.params[id] = applyParamValue(value, PARAMS[id])
      this.applyLiveAudio()
    }
    this.emit()
  }

  setRegion(start: number, end: number): void {
    const duration = this.buffer?.duration ?? 0
    const region = clampRegion(start, end, duration, MIN_REGION)
    this.params.start = region.start
    this.params.end = region.end
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
    this.buffer = buffer
    this.reversed = this.buildReversed(buffer)
    this.mono = mixToMono(buffer)
    const region = defaultPlayRegion(buffer.duration, MIN_REGION)
    this.params = { ...this.params, start: region.start, end: region.end }
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
      // Voices -> master gain -> filter -> limiter -> output.
      this.master.connect(this.filter)
      this.filter.connect(this.limiter)
      this.limiter.connect(this.ctx.destination)
      this.master.gain.value = dbToGain(this.params.gain)
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

  private applyLiveAudio(): void {
    if (!this.ctx || !this.master) return
    const now = this.ctx.currentTime
    this.master.gain.setTargetAtTime(dbToGain(this.params.gain), now, 0.03)
    this.applyFilter(0.03)
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
    const clamped = Math.min(
      Math.max(mapped, src.loopStart),
      Math.max(src.loopStart, src.loopEnd - 0.001),
    )
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

    while (this.nextGrainTime < horizon) {
      const t = Math.max(this.nextGrainTime, ctx.currentTime)
      const scatter = this.params.scatter / 100
      const pos = this.params.position / 100
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
      params: { ...this.params },
    }
  }

  private emit(): void {
    this.snapshot = this.buildSnapshot()
    for (const listener of this.listeners) listener()
  }
}

export const engine = new AudioEngine()
