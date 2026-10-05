/**
 * 3D spectral history model.
 * Snapshots are real FFT magnitudes on a log frequency axis, stored in a
 * fixed ring with audio-time timestamps. Nothing here touches the DSP graph.
 */

import { mixCssColor } from '../../theme/cssColor'
import { formatHoverFreq, visibleAxisLabelIndices } from './pitchScale'
import type { SpectrumLayer } from './spectrumPrefs'

export const SPECTRAL_HISTORY_CAPACITY = 240

export const SPECTRAL_HISTORY_SECONDS = [1, 2, 5, 10] as const
export type SpectralHistorySeconds = (typeof SPECTRAL_HISTORY_SECONDS)[number]

export const SPECTRAL_VIEW_MODES = ['2d', '3d'] as const
export type SpectralViewMode = (typeof SPECTRAL_VIEW_MODES)[number]

export const SPECTRAL_CAMERA_PRESETS = ['front', 'angled', 'top'] as const
export type SpectralCameraPreset = (typeof SPECTRAL_CAMERA_PRESETS)[number]

export const SPECTRAL_DENSITIES = ['auto', 'low', 'normal', 'high'] as const
export type SpectralDensity = (typeof SPECTRAL_DENSITIES)[number]

export const SPECTRAL_DRAW_STYLES = ['lines', 'surface'] as const
export type SpectralDrawStyle = (typeof SPECTRAL_DRAW_STYLES)[number]

export const SPECTRAL_COLOR_MODES = ['off', 'level', 'frequency'] as const
export type SpectralColorMode = (typeof SPECTRAL_COLOR_MODES)[number]

export function clampSpectralColorMode(value: unknown, legacyLevel?: boolean): SpectralColorMode {
  if (value === 'off' || value === 'level' || value === 'frequency') return value
  return legacyLevel ? 'level' : 'off'
}

/** Restrained ticks. Not every grid line. */
export const SPECTRAL_FREQ_TICKS = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000] as const

export type SpectralCamera = {
  preset: SpectralCameraPreset
  /** Limited user offset around the preset. -1..1. */
  yaw: number
  pitch: number
  /** Limited zoom. 1 is the preset. */
  zoom: number
}

export type SpectralPlot = {
  left: number
  top: number
  right: number
  bottom: number
}

const sessionListeners = new Set<() => void>()

type SpectralSession = {
  frozen: boolean
  clearGen: number
  resetGen: number
}

const session: SpectralSession = {
  frozen: false,
  clearGen: 0,
  resetGen: 0,
}

function emitSession(): void {
  for (const listener of sessionListeners) listener()
}

/** Freeze, clear, and reset are session actions. History samples are not persisted. */
export function spectralHistorySession(): SpectralSession {
  return session
}

export function setSpectralHistoryFrozen(frozen: boolean): void {
  if (session.frozen === frozen) return
  session.frozen = frozen
  emitSession()
}

export function requestSpectralHistoryClear(): void {
  session.clearGen += 1
  emitSession()
}

export function requestSpectralViewReset(): void {
  session.resetGen += 1
  emitSession()
}

export function subscribeSpectralHistorySession(onChange: () => void): () => void {
  sessionListeners.add(onChange)
  return () => sessionListeners.delete(onChange)
}

export function clampSpectralHistorySeconds(value: unknown): SpectralHistorySeconds {
  const n = typeof value === 'number' ? value : Number(value)
  if (n === 1 || n === 2 || n === 10) return n
  return 5
}

export function clampSpectralViewMode(value: unknown): SpectralViewMode {
  return value === '3d' ? '3d' : '2d'
}

export function clampSpectralCameraPreset(value: unknown): SpectralCameraPreset {
  return value === 'front' || value === 'top' || value === 'angled' ? value : 'angled'
}

export function clampSpectralDensity(value: unknown): SpectralDensity {
  return value === 'low' || value === 'normal' || value === 'high' || value === 'auto' ? value : 'auto'
}

export function clampSpectralDrawStyle(value: unknown): SpectralDrawStyle {
  return value === 'surface' ? 'surface' : 'lines'
}

export function clampSpectralHistoryLayer(value: unknown): SpectrumLayer {
  return value === 'pre' || value === 'both' || value === 'post' ? value : 'post'
}

export function defaultSpectralCamera(preset: SpectralCameraPreset = 'angled'): SpectralCamera {
  return { preset, yaw: 0, pitch: 0, zoom: 1 }
}

function clampUnit(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

export function clampSpectralCamera(camera: SpectralCamera): SpectralCamera {
  return {
    preset: clampSpectralCameraPreset(camera.preset),
    yaw: clampUnit(camera.yaw, -1, 1),
    pitch: clampUnit(camera.pitch, -1, 1),
    zoom: clampUnit(camera.zoom, 0.75, 1.4),
  }
}

/** Animated perspective only when the user has not asked for reduced motion. */
export function spectralCameraEases(reducedMotion: boolean): boolean {
  return !reducedMotion
}

/**
 * Fixed ring of visualization spectra.
 * `push` copies into a preallocated slot. Capacity never grows.
 */
export class SpectralFrameBuffer {
  readonly capacity: number
  private pointCount: number
  private values: Float32Array
  private times: Float64Array
  private head = 0
  private stored = 0

  constructor(capacity = SPECTRAL_HISTORY_CAPACITY, points = 256) {
    this.capacity = Math.max(4, capacity)
    this.pointCount = Math.max(2, points)
    this.values = new Float32Array(this.capacity * this.pointCount)
    this.times = new Float64Array(this.capacity)
  }

  get points(): number {
    return this.pointCount
  }

  get count(): number {
    return this.stored
  }

  /** Stable backing store. Tests use this to prove pushes do not allocate a new block. */
  get valueBuffer(): Float32Array {
    return this.values
  }

  clear(): void {
    this.head = 0
    this.stored = 0
  }

  resize(points: number): void {
    const next = Math.max(2, points)
    if (next === this.pointCount) return
    this.pointCount = next
    this.values = new Float32Array(this.capacity * this.pointCount)
    this.times = new Float64Array(this.capacity)
    this.head = 0
    this.stored = 0
  }

  push(frame: ArrayLike<number>, timeSec: number): void {
    const slot = this.head
    const offset = slot * this.pointCount
    const n = Math.min(this.pointCount, frame.length)
    for (let i = 0; i < n; i++) this.values[offset + i] = frame[i] ?? Number.NaN
    for (let i = n; i < this.pointCount; i++) this.values[offset + i] = Number.NaN
    this.times[slot] = timeSec
    this.head = (this.head + 1) % this.capacity
    if (this.stored < this.capacity) this.stored += 1
  }

  private oldestSlot(index: number): number {
    const start = (this.head - this.stored + this.capacity) % this.capacity
    return (start + index) % this.capacity
  }

  /** Index 0 is the oldest stored frame. */
  timeAt(index: number): number {
    if (index < 0 || index >= this.stored) return Number.NaN
    return this.times[this.oldestSlot(index)] ?? Number.NaN
  }

  valueAt(index: number, point: number): number {
    if (index < 0 || index >= this.stored || point < 0 || point >= this.pointCount) return Number.NaN
    return this.values[this.oldestSlot(index) * this.pointCount + point] ?? Number.NaN
  }

  /** Oldest-first timestamps. Writes into `out` and returns the count. */
  copyTimes(out: Float64Array): number {
    const n = Math.min(this.stored, out.length)
    for (let i = 0; i < n; i++) out[i] = this.timeAt(i)
    return n
  }
}

/**
 * Audio-time clock for history capture.
 * Pause, stop, and freeze do not advance it, so ridges do not age on the wall clock.
 */
export class SpectralHistoryClock {
  now = 0
  private lastSample = Number.NEGATIVE_INFINITY

  reset(): void {
    this.now = 0
    this.lastSample = Number.NEGATIVE_INFINITY
  }

  /**
   * Advance by measured seconds of playback.
   * Returns true when a new snapshot should be stored.
   */
  tick(dtSec: number, playing: boolean, frozen: boolean, intervalSec: number): boolean {
    if (!playing || frozen) return false
    const step = Math.min(1, Math.max(0, dtSec))
    if (step > 0) this.now += step
    const interval = Math.max(1 / 60, intervalSec)
    if (this.lastSample >= 0 && this.now - this.lastSample < interval) return false
    this.lastSample = this.now
    return true
  }
}

export function dbToSpectralLevel(db: number, floorDb: number): number {
  if (!Number.isFinite(db)) return 0
  const span = 0 - floorDb
  if (!(span > 0)) return 0
  return clampUnit((db - floorDb) / span, 0, 1)
}

/** Front stays strong. Older ridges fade and never pop off before leaving the window. */
export function spectralAgeOpacity(age01: number): number {
  const t = clampUnit(age01, 0, 1)
  return 0.08 + 0.92 * (1 - t) ** 1.85
}

export function spectralAgeWidth(age01: number): number {
  const t = clampUnit(age01, 0, 1)
  return 1.65 - t * 0.95
}

/**
 * Theme ridge ramp: quiet stays cool, peaks warm.
 * The two ends are different hues so level color stays readable on gray themes.
 */
export function spectralLevelColor(cool: string, mid: string, warm: string, level: number): string {
  const shaped = clampUnit(level, 0, 1) ** 0.72
  if (shaped < 0.5) return mixCssColor(cool, mid, shaped / 0.5)
  return mixCssColor(mid, warm, (shaped - 0.5) / 0.5)
}

/**
 * Age of one history ridge, measured back from now.
 * Index 0 is the youngest slice. Ages advance with playback time, and a slice
 * that reaches the next step continues as the following index instead of popping.
 */
export function spectralScrollAge(
  indexFromFront: number,
  sliceCount: number,
  nowSec: number,
  durationSec: number,
): number {
  const slices = Math.max(1, sliceCount)
  const duration = Math.max(0, durationSec)
  const step = duration / slices
  if (!(step > 0)) return 0
  const turns = Math.floor(nowSec / step)
  const phase = nowSec - turns * step
  const age = (phase < 0 ? phase + step : phase) + Math.max(0, indexFromFront) * step
  return Math.min(duration, age)
}

/**
 * Spectrum at an audio time, lerped between the two stored frames around it.
 * `timesOldestFirst` matches `SpectralFrameBuffer` order. Writes into `out`.
 */
export function interpolateSpectralFrame(
  buffer: SpectralFrameBuffer,
  timesOldestFirst: ArrayLike<number>,
  count: number,
  timeSec: number,
  out: Float32Array,
): boolean {
  const n = Math.min(count, timesOldestFirst.length)
  if (n <= 0) return false
  const oldest = timesOldestFirst[0] ?? Number.NaN
  const newest = timesOldestFirst[n - 1] ?? Number.NaN
  if (!Number.isFinite(oldest) || !Number.isFinite(newest)) return false
  if (timeSec < oldest - 1e-4 || timeSec > newest + 1e-3) return false
  let lo = 0
  let hi = n - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if ((timesOldestFirst[mid] ?? 0) <= timeSec) lo = mid
    else hi = mid - 1
  }
  const i0 = lo
  const i1 = Math.min(n - 1, i0 + 1)
  const t0 = timesOldestFirst[i0] ?? timeSec
  const t1 = timesOldestFirst[i1] ?? t0
  const span = t1 - t0
  const u = i0 === i1 || span <= 1e-6 ? 0 : clampUnit((timeSec - t0) / span, 0, 1)
  const points = Math.min(buffer.points, out.length)
  for (let p = 0; p < points; p++) {
    const a = buffer.valueAt(i0, p)
    const b = buffer.valueAt(i1, p)
    const aOk = Number.isFinite(a)
    const bOk = Number.isFinite(b)
    if (aOk && bOk) out[p] = a + (b - a) * u
    else if (aOk) out[p] = a
    else if (bOk) out[p] = b
    else out[p] = Number.NaN
  }
  for (let p = points; p < out.length; p++) out[p] = Number.NaN
  return true
}

/**
 * How many ridges to draw. Duration changes time, not a promise to draw every analysis frame.
 * Mobile and a small plot ask for fewer ridges. `quality` is the adaptive scaler (1 = full).
 */
export function spectralSliceTarget(options: {
  durationSec: number
  density: SpectralDensity
  plotWidth: number
  plotHeight: number
  mobile: boolean
  both: boolean
  quality?: number
}): number {
  const duration = options.durationSec
  const base = duration <= 1 ? 26 : duration <= 2 ? 36 : duration <= 5 ? 52 : 76
  const area = Math.max(1, options.plotWidth) * Math.max(1, options.plotHeight)
  const fit = Math.min(1.15, Math.max(0.42, area / (880 * 380)))
  const densityMul = options.density === 'low' ? 0.55 : options.density === 'high' ? 1.35 : options.density === 'normal' ? 1 : 1
  const mobileMul = options.mobile ? 0.48 : 1
  const bothMul = options.both ? 0.7 : 1
  const quality = clampUnit(options.quality ?? 1, 0.4, 1)
  const raw = Math.round(base * fit * densityMul * mobileMul * bothMul * quality)
  const cap = options.mobile ? 42 : 96
  return Math.max(8, Math.min(cap, raw))
}

/**
 * Visualization columns. Independent of FFT size.
 * Two stable sizes so a window resize does not wipe the history ring.
 */
export function spectralPointCount(plotWidth: number, mobile: boolean, _quality = 1): number {
  if (mobile || plotWidth < 560) return 96
  return 224
}

/** Store a little denser than the drawn ridges, still inside the fixed ring. */
export function spectralCaptureInterval(durationSec: number, sliceTarget: number): number {
  const duration = Math.max(0.25, durationSec)
  const stored = Math.min(SPECTRAL_HISTORY_CAPACITY, Math.max(sliceTarget + 4, Math.ceil(sliceTarget * 1.35)))
  return duration / stored
}

/**
 * Oldest-to-newest indices inside the history window.
 * Always includes the newest stored frame when any frame falls in the window.
 */
export function selectSpectralSlices(
  timesOldestFirst: ArrayLike<number>,
  count: number,
  now: number,
  durationSec: number,
  slices: number,
): number[] {
  if (count <= 0 || slices < 1) return []
  const start = now - durationSec
  const visible: number[] = []
  const n = Math.min(count, timesOldestFirst.length)
  for (let i = 0; i < n; i++) {
    const time = timesOldestFirst[i] ?? Number.NaN
    if (time >= start - 1e-4 && time <= now + 1e-3) visible.push(i)
  }
  if (visible.length === 0) return []
  const want = Math.min(slices, visible.length)
  if (visible.length <= want) return visible
  const picked: number[] = []
  const last = visible.length - 1
  for (let s = 0; s < want; s++) {
    const index = Math.round((s / (want - 1)) * last)
    const slot = visible[index]!
    if (picked[picked.length - 1] !== slot) picked.push(slot)
  }
  const newest = visible[last]!
  if (picked[picked.length - 1] !== newest) picked.push(newest)
  return picked
}

export function spectralPeakHold(
  buffer: SpectralFrameBuffer,
  indices: readonly number[],
  out: Float32Array,
): void {
  const points = Math.min(buffer.points, out.length)
  out.fill(Number.NaN)
  for (const index of indices) {
    for (let i = 0; i < points; i++) {
      const db = buffer.valueAt(index, i)
      if (!Number.isFinite(db)) continue
      const prev = out[i] ?? Number.NaN
      if (!Number.isFinite(prev) || db > prev) out[i] = db
    }
  }
}

const PRESET_POSE = {
  angled: { perspective: 0.72, pitch: 0.5, yaw: 0.1 },
  front: { perspective: 0.16, pitch: 0.14, yaw: 0 },
  top: { perspective: 0.05, pitch: 0.08, yaw: 0 },
} as const

/**
 * Constrained analyzer camera.
 * x = frequency 0..1, y = level 0..1 (0 is the floor), z = age 0..1 (0 is now).
 * Screen Y grows downward. Depth of the scene does not depend on history duration.
 */
export function projectSpectralPoint(
  freq01: number,
  level01: number,
  age01: number,
  plot: SpectralPlot,
  camera: SpectralCamera,
): { x: number; y: number } {
  const pose = PRESET_POSE[clampSpectralCameraPreset(camera.preset)]
  const freq = clampUnit(freq01, 0, 1)
  const level = clampUnit(level01, 0, 1)
  const age = clampUnit(age01, 0, 1)
  const yaw = clampUnit(pose.yaw + camera.yaw * 0.22, -0.42, 0.42)
  const pitch = clampUnit(pose.pitch + camera.pitch * 0.16, 0.04, 0.72)
  const zoom = clampUnit(camera.zoom, 0.75, 1.4)
  const width = Math.max(1, plot.right - plot.left)
  const height = Math.max(1, plot.bottom - plot.top)
  const cx = (plot.left + plot.right) / 2

  if (camera.preset === 'top') {
    const xShear = (freq - 0.5) * Math.cos(yaw) + (age - 0.5) * Math.sin(yaw) * 0.2
    const x = cx + xShear * width * 0.92 * zoom
    const y = plot.bottom - height * 0.08 - age * height * 0.84 * zoom - level * height * 0.05
    return { x, y }
  }

  const perspective = zoom / (1 + age * pose.perspective)
  const xNorm = freq - 0.5
  const xShear = xNorm * Math.cos(yaw) + (age - 0.15) * Math.sin(yaw) * 0.48
  const x = cx + xShear * width * 0.92 * perspective
  const frontBase = plot.bottom - height * 0.045
  const baseY = frontBase - age * height * pitch * 0.98
  const rise = level * height * (0.8 - pitch * 0.22) * perspective
  return { x, y: baseY - rise }
}

export function spectralFreqTicks(minHz: number, maxHz: number): number[] {
  return SPECTRAL_FREQ_TICKS.filter((hz) => hz >= minHz - 0.5 && hz <= maxHz + 0.5)
}

export function spectralVisibleFreqTicks(
  ticks: readonly { hz: number; x: number; width: number }[],
  gapPx: number,
): Set<number> {
  return visibleAxisLabelIndices(
    ticks.map((tick) => ({ x: tick.x, width: tick.width, major: true })),
    gapPx,
  )
}

export function spectralDbGuides(floorDb: number, limit: number): number[] {
  const floor = Math.round(floorDb)
  const step = Math.abs(floor) >= 100 ? 24 : 12
  const marks = [0]
  for (let db = -step; db > floor; db -= step) marks.push(db)
  if (marks[marks.length - 1] !== floor) marks.push(floor)
  if (marks.length <= limit) return marks
  const out = [0, floor]
  const room = Math.max(0, limit - 2)
  for (let i = 1; i <= room; i++) {
    const db = Math.round((floor * i) / (room + 1) / step) * step
    if (!out.includes(db)) out.push(db)
  }
  out.sort((a, b) => b - a)
  return out
}

export function spectralTimeLabels(durationSec: number, limit: number): { ageSec: number; text: string }[] {
  const duration = clampSpectralHistorySeconds(durationSec)
  const step = duration <= 2 ? 0.5 : 1
  const ages = [0]
  for (let age = step; age < duration - 0.05; age += step) ages.push(Math.round(age * 10) / 10)
  ages.push(duration)
  const label = (age: number): string => {
    if (age <= 0.001) return 'NOW'
    const rounded = Math.round(age * 10) / 10
    const body = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
    return age >= duration - 0.05 ? `-${body}s` : `-${body}`
  }
  if (ages.length <= limit) return ages.map((ageSec) => ({ ageSec, text: label(ageSec) }))
  const keep = new Set<number>([0, ages.length - 1])
  const room = Math.max(0, limit - 2)
  for (let i = 1; i <= room; i++) keep.add(Math.round((i * (ages.length - 1)) / (room + 1)))
  return ages.filter((_, index) => keep.has(index)).map((ageSec) => ({ ageSec, text: label(ageSec) }))
}

export function formatSpectralReadout(hz: number, db: number, ageSec: number): string[] {
  const freq = formatHoverFreq(hz)
  const level = `${db.toFixed(1)} dB`
  const time = ageSec <= 0.05 ? 'NOW' : `-${ageSec.toFixed(1)} s`
  return [freq, level, time]
}

export type SpectralHit = {
  x: number
  y: number
  hz: number
  db: number
  ageSec: number
}

export function nearestSpectralHit(
  hits: readonly SpectralHit[],
  x: number,
  y: number,
  radius: number,
): SpectralHit | null {
  const r2 = radius * radius
  let best: SpectralHit | null = null
  let bestD = r2
  for (const hit of hits) {
    const dx = hit.x - x
    const dy = hit.y - y
    const d = dx * dx + dy * dy
    if (d <= bestD) {
      bestD = d
      best = hit
    }
  }
  return best
}

/** Screen-reader summary. History length is part of the name so the axis is explicit. */
export function spectralHistoryAriaLabel(durationSec: number, frozen: boolean): string {
  const seconds = clampSpectralHistorySeconds(durationSec)
  const base = `3D spectral history showing frequency, level and the last ${seconds} seconds.`
  return frozen ? `${base} History frozen.` : base
}
