/**
 * Canvas 2D projection of spectral history.
 * Called from the spectrum view's existing animation frame. No second scheduler.
 */

import {
  followBandsOverTime,
  SPECTRUM_AXIS_MIN_HZ,
  spectrumDisplayFloorDb,
  spectrumFallBallistics,
  spectrumMaxHz,
  type SpectrumFallMode,
  type SpectrumRangeDb,
  type SpectrumReleaseHold,
} from '../../audio/engine/spectrumBands'
import { logSpectrumHz, sampleLogSpectrumDb } from '../../audio/engine/spectrumEnvelope'
import { formatFreqTick } from '../../audio/engine/pitchScale'
import { hzToX, type FreqScaleKind } from '../../audio/engine/freqScale'
import { measureSpectrumDb, type SpectrumFftScratch } from '../../audio/engine/spectrumFft'
import {
  clampSpectralCamera,
  dbToSpectralLevel,
  defaultSpectralCamera,
  interpolateSpectralFrame,
  projectSpectralPoint,
  selectSpectralSlices,
  spectralAgeOpacity,
  spectralAgeWidth,
  spectralCameraEases,
  spectralCaptureInterval,
  spectralDbGuides,
  spectralFreqTicks,
  spectralHistorySession,
  spectralLevelColor,
  spectralPeakHold,
  spectralPointCount,
  spectralScrollAge,
  spectralSliceTarget,
  spectralTimeLabels,
  spectralVisibleFreqTicks,
  SpectralFrameBuffer,
  SpectralHistoryClock,
  type SpectralCamera,
  type SpectralCameraPreset,
  type SpectralDensity,
  type SpectralDrawStyle,
  type SpectralHistorySeconds,
} from '../../audio/engine/spectralHistory'
import type { SpectrumLayer } from '../../audio/engine/spectrumPrefs'
import { colorWithAlpha } from '../../theme/cssColor'
import type { ThemeColors } from '../../theme/theme'

export type AnalyserScratch = {
  bins: Float32Array | null
  time: Float32Array | null
  fft: SpectrumFftScratch
}

export function readAnalyserSpectrumBins(analyser: AnalyserNode | null, scratch: AnalyserScratch): Float32Array | null {
  if (!analyser) return null
  const fftSize = analyser.fftSize
  const binCount = fftSize >> 1
  if (binCount < 2) return null
  if (!scratch.time || scratch.time.length !== fftSize) scratch.time = new Float32Array(fftSize)
  if (!scratch.bins || scratch.bins.length !== binCount) scratch.bins = new Float32Array(binCount)
  analyser.getFloatTimeDomainData(scratch.time as Float32Array<ArrayBuffer>)
  measureSpectrumDb(scratch.time, scratch.bins, scratch.fft)
  return scratch.bins
}

export function readTimeDomainSpectrumBins(time: Float32Array, scratch: AnalyserScratch): Float32Array | null {
  const fftSize = time.length
  const binCount = fftSize >> 1
  if (binCount < 2 || (fftSize & (fftSize - 1)) !== 0) return null
  if (!scratch.bins || scratch.bins.length !== binCount) scratch.bins = new Float32Array(binCount)
  measureSpectrumDb(time, scratch.bins, scratch.fft)
  return scratch.bins
}

type SmoothSlot = {
  line: Float32Array | null
  elapsed: Float32Array | null
}

export type SpectralHistoryRuntime = {
  pre: SpectralFrameBuffer
  post: SpectralFrameBuffer
  clock: SpectralHistoryClock
  preSmooth: SmoothSlot
  postSmooth: SmoothSlot
  log: Float32Array
  preLive: Float32Array
  postLive: Float32Array
  column: Float32Array
  hz: Float32Array
  times: Float64Array
  peak: Float32Array
  camera: SpectralCamera
  displayYaw: number
  displayPitch: number
  displayZoom: number
  quality: number
  calmFrames: number
  seenClear: number
  seenReset: number
  /** Packed x, y, hz, db, ageSec in canvas pixels. */
  hits: Float32Array
  hitCount: number
  trace: Float32Array
  floorXY: Float32Array
  levels: Float32Array
  lastDrawMs: number
}

export function createSpectralHistoryRuntime(): SpectralHistoryRuntime {
  return {
    pre: new SpectralFrameBuffer(),
    post: new SpectralFrameBuffer(),
    clock: new SpectralHistoryClock(),
    preSmooth: { line: null, elapsed: null },
    postSmooth: { line: null, elapsed: null },
    log: blankSpectrum(320),
    preLive: blankSpectrum(320),
    postLive: blankSpectrum(320),
    column: blankSpectrum(320),
    hz: new Float32Array(320),
    times: new Float64Array(240),
    peak: new Float32Array(320),
    camera: defaultSpectralCamera('angled'),
    displayYaw: 0,
    displayPitch: 0,
    displayZoom: 1,
    quality: 1,
    calmFrames: 0,
    seenClear: 0,
    seenReset: 0,
    hits: new Float32Array(24_000 * 5),
    hitCount: 0,
    trace: new Float32Array(320 * 2),
    floorXY: new Float32Array(320 * 2),
    levels: new Float32Array(320),
    lastDrawMs: 0,
  }
}

export type SpectralPaintInput = {
  dt: number
  dpr: number
  cssWidth: number
  cssHeight: number
  playing: boolean
  sampleRate: number
  preBins: Float32Array | null
  postBins: Float32Array | null
  showPre: boolean
  showPost: boolean
  historySec: SpectralHistorySeconds
  density: SpectralDensity
  drawStyle: SpectralDrawStyle
  levelColor: boolean
  peakTrails: boolean
  cameraPreset: SpectralCameraPreset
  fall: SpectrumFallMode
  range: SpectrumRangeDb
  scale: FreqScaleKind
  colors: ThemeColors
  mobile: boolean
  reducedMotion: boolean
  layer: SpectrumLayer
}

function blankSpectrum(points: number): Float32Array {
  const values = new Float32Array(points)
  values.fill(Number.NaN)
  return values
}

function hasSpectrum(values: Float32Array): boolean {
  for (let i = 0; i < values.length; i += 4) {
    if (Number.isFinite(values[i] ?? Number.NaN)) return true
  }
  return false
}

function ensureLog(runtime: SpectralHistoryRuntime, points: number): void {
  if (runtime.log.length !== points) runtime.log = blankSpectrum(points)
  if (runtime.preLive.length !== points) runtime.preLive = blankSpectrum(points)
  if (runtime.postLive.length !== points) runtime.postLive = blankSpectrum(points)
  if (runtime.column.length !== points) runtime.column = blankSpectrum(points)
  if (runtime.hz.length !== points) runtime.hz = new Float32Array(points)
  if (runtime.peak.length !== points) runtime.peak = new Float32Array(points)
  if (runtime.trace.length < points * 2) runtime.trace = new Float32Array(points * 2)
  if (runtime.floorXY.length < points * 2) runtime.floorXY = new Float32Array(points * 2)
  if (runtime.levels.length < points) runtime.levels = new Float32Array(points)
  if (runtime.pre.points !== points) runtime.pre.resize(points)
  if (runtime.post.points !== points) runtime.post.resize(points)
}

function smoothInto(
  slot: SmoothSlot,
  bins: Float32Array,
  fall: SpectrumFallMode,
  dt: number,
): Float32Array {
  const rates = spectrumFallBallistics(fall).peak
  if (!slot.line || slot.line.length !== bins.length) {
    slot.line = new Float32Array(bins.length)
    slot.line.set(bins)
    slot.elapsed = new Float32Array(bins.length)
    return slot.line
  }
  if (!slot.elapsed || slot.elapsed.length !== bins.length) slot.elapsed = new Float32Array(bins.length)
  const hold: SpectrumReleaseHold = { holdSec: rates.holdSec, settleDb: rates.settleDb, elapsed: slot.elapsed }
  followBandsOverTime(slot.line, bins, rates.attack, rates.release, dt, hold)
  return slot.line
}

function writeHz(runtime: SpectralHistoryRuntime, minHz: number, maxHz: number, scale: FreqScaleKind): void {
  const slots = runtime.hz.length
  for (let i = 0; i < slots; i++) runtime.hz[i] = logSpectrumHz(i, slots, minHz, maxHz, scale)
}

function capture(
  runtime: SpectralHistoryRuntime,
  bins: Float32Array | null,
  slot: SmoothSlot,
  buffer: SpectralFrameBuffer,
  input: SpectralPaintInput,
  minHz: number,
  maxHz: number,
  live: Float32Array,
  follow: boolean,
  store: boolean,
): void {
  if (!bins || !input.playing || !follow) return
  const smoothed = smoothInto(slot, bins, input.fall, input.dt)
  sampleLogSpectrumDb(smoothed, input.sampleRate, minHz, maxHz, runtime.log, input.scale)
  live.set(runtime.log)
  if (!store) return
  buffer.push(runtime.log, runtime.clock.now)
}

function plotRect(width: number, height: number, dpr: number, mobile: boolean) {
  const cssH = height / dpr
  const tight = mobile || cssH < 168
  const left = (tight ? 36 : 56) * dpr
  const rightPad = (tight ? 10 : 16) * dpr
  const top = (tight ? 16 : 22) * dpr
  const bottomPad = (tight ? 18 : 28) * dpr
  return {
    left,
    top,
    right: Math.max(left + 8, width - rightPad),
    bottom: Math.max(top + 8, height - bottomPad),
  }
}

function pushHit(runtime: SpectralHistoryRuntime, x: number, y: number, hz: number, db: number, ageSec: number): void {
  const offset = runtime.hitCount * 5
  if (offset + 5 > runtime.hits.length) return
  runtime.hits[offset] = x
  runtime.hits[offset + 1] = y
  runtime.hits[offset + 2] = hz
  runtime.hits[offset + 3] = db
  runtime.hits[offset + 4] = ageSec
  runtime.hitCount += 1
}

function ridgeColor(input: SpectralPaintInput, fallback: string, level: number): string {
  if (!input.levelColor) return fallback
  return spectralLevelColor(input.colors.ridgeCool, input.colors.ridgeMid, input.colors.ridgeWarm, level)
}

function strokeSeries(
  ctx: CanvasRenderingContext2D,
  runtime: SpectralHistoryRuntime,
  values: Float32Array,
  age01: number,
  ageSec: number,
  color: string,
  floorDb: number,
  plot: { left: number; top: number; right: number; bottom: number },
  camera: SpectralCamera,
  input: SpectralPaintInput,
  dashed: boolean,
  recordHits: boolean,
): void {
  const points = values.length
  const stride = input.mobile || runtime.quality < 0.72 ? 2 : 1
  const alpha = spectralAgeOpacity(age01) * (dashed ? 0.72 : 1)
  const width = Math.max(input.dpr * 0.85, spectralAgeWidth(age01) * input.dpr * (dashed ? 0.85 : 1) * (input.levelColor ? 1.35 : 1))
  const surface = input.drawStyle === 'surface'
  const fillAlpha = alpha * (0.1 + 0.42 * (1 - age01) ** 1.35)
  ctx.lineWidth = width
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.setLineDash(dashed ? [4 * input.dpr, 3 * input.dpr] : [])

  const xs = runtime.trace
  const floors = runtime.floorXY
  const levels = runtime.levels
  let n = 0
  let prevX = 0
  let prevY = 0
  let prevFx = 0
  let prevFy = 0
  let prevLevel = 0
  let hasPrev = false
  const flushLine = () => {
    if (n < 1) return
    if (surface && n >= 2 && !input.levelColor) {
      ctx.fillStyle = colorWithAlpha(color, fillAlpha)
      ctx.beginPath()
      ctx.moveTo(xs[0] ?? 0, xs[1] ?? 0)
      for (let p = 1; p < n; p++) ctx.lineTo(xs[p * 2] ?? 0, xs[p * 2 + 1] ?? 0)
      ctx.lineTo(floors[(n - 1) * 2] ?? 0, floors[(n - 1) * 2 + 1] ?? 0)
      ctx.lineTo(floors[0] ?? 0, floors[1] ?? 0)
      ctx.closePath()
      ctx.fill()
    }
    if (!input.levelColor) {
      ctx.strokeStyle = colorWithAlpha(color, alpha)
      ctx.beginPath()
      ctx.moveTo(xs[0] ?? 0, xs[1] ?? 0)
      for (let p = 1; p < n; p++) ctx.lineTo(xs[p * 2] ?? 0, xs[p * 2 + 1] ?? 0)
      ctx.stroke()
    } else {
      for (let p = 1; p < n; p++) {
        const level = ((levels[p - 1] ?? 0) + (levels[p] ?? 0)) * 0.5
        ctx.strokeStyle = colorWithAlpha(ridgeColor(input, color, level), alpha)
        ctx.beginPath()
        ctx.moveTo(xs[(p - 1) * 2] ?? 0, xs[(p - 1) * 2 + 1] ?? 0)
        ctx.lineTo(xs[p * 2] ?? 0, xs[p * 2 + 1] ?? 0)
        ctx.stroke()
      }
    }
    n = 0
    hasPrev = false
  }

  for (let i = 0; i < points; i += stride) {
    const db = values[i] ?? Number.NaN
    if (!Number.isFinite(db)) {
      flushLine()
      continue
    }
    const level = dbToSpectralLevel(db, floorDb)
    const freq = points <= 1 ? 0 : i / (points - 1)
    const projected = projectSpectralPoint(freq, level, age01, plot, camera)
    const floor = projectSpectralPoint(freq, 0, age01, plot, camera)
    if (recordHits) {
      const hz = runtime.hz[i] ?? 0
      if (hz > 0) pushHit(runtime, projected.x, projected.y, hz, db, ageSec)
    }
    if (surface && input.levelColor && hasPrev) {
      ctx.fillStyle = colorWithAlpha(ridgeColor(input, color, (prevLevel + level) * 0.5), fillAlpha)
      ctx.beginPath()
      ctx.moveTo(prevX, prevY)
      ctx.lineTo(projected.x, projected.y)
      ctx.lineTo(floor.x, floor.y)
      ctx.lineTo(prevFx, prevFy)
      ctx.closePath()
      ctx.fill()
    }
    if (n * 2 + 1 < xs.length) {
      xs[n * 2] = projected.x
      xs[n * 2 + 1] = projected.y
      floors[n * 2] = floor.x
      floors[n * 2 + 1] = floor.y
      levels[n] = level
      n += 1
    }
    prevX = projected.x
    prevY = projected.y
    prevFx = floor.x
    prevFy = floor.y
    prevLevel = level
    hasPrev = true
  }
  flushLine()
  ctx.setLineDash([])
}

export function paintSpectralHistory(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  runtime: SpectralHistoryRuntime,
  input: SpectralPaintInput,
): void {
  const started = performance.now()
  const session = spectralHistorySession()
  if (runtime.seenClear !== session.clearGen) {
    runtime.seenClear = session.clearGen
    runtime.pre.clear()
    runtime.post.clear()
    runtime.clock.reset()
  }
  if (runtime.seenReset !== session.resetGen) {
    runtime.seenReset = session.resetGen
    runtime.camera.yaw = 0
    runtime.camera.pitch = 0
    runtime.camera.zoom = 1
    runtime.displayYaw = 0
    runtime.displayPitch = 0
    runtime.displayZoom = 1
  }
  runtime.camera.preset = input.cameraPreset
  const camera = clampSpectralCamera(runtime.camera)
  runtime.camera = camera
  if (spectralCameraEases(input.reducedMotion)) {
    const glide = Math.min(1, Math.max(0.2, input.dt * 10))
    runtime.displayYaw += (camera.yaw - runtime.displayYaw) * glide
    runtime.displayPitch += (camera.pitch - runtime.displayPitch) * glide
    runtime.displayZoom += (camera.zoom - runtime.displayZoom) * glide
  } else {
    runtime.displayYaw = camera.yaw
    runtime.displayPitch = camera.pitch
    runtime.displayZoom = camera.zoom
  }
  const viewCamera = clampSpectralCamera({
    preset: camera.preset,
    yaw: runtime.displayYaw,
    pitch: runtime.displayPitch,
    zoom: runtime.displayZoom,
  })

  const plot = plotRect(width, height, input.dpr, input.mobile)
  const plotW = (plot.right - plot.left) / input.dpr
  const plotH = (plot.bottom - plot.top) / input.dpr
  const points = spectralPointCount(plotW, input.mobile, 1)
  ensureLog(runtime, points)
  const both = input.showPre && input.showPost
  const slices = spectralSliceTarget({
    durationSec: input.historySec,
    density: input.density,
    plotWidth: plotW,
    plotHeight: plotH,
    mobile: input.mobile,
    both,
    quality: 1,
  })
  const interval = spectralCaptureInterval(input.historySec, slices)
  const sr = input.sampleRate > 0 ? input.sampleRate : 44100
  const maxHz = spectrumMaxHz(sr)
  const minHz = SPECTRUM_AXIS_MIN_HZ
  writeHz(runtime, minHz, maxHz, input.scale)
  const store = runtime.clock.tick(input.dt, input.playing, session.frozen, interval)
  const follow = input.playing && !session.frozen
  if (input.showPre) capture(runtime, input.preBins, runtime.preSmooth, runtime.pre, input, minHz, maxHz, runtime.preLive, follow, store && follow)
  if (input.showPost) capture(runtime, input.postBins, runtime.postSmooth, runtime.post, input, minHz, maxHz, runtime.postLive, follow, store && follow)

  const floorDb = spectrumDisplayFloorDb(input.range)
  const colors = input.colors
  ctx.clearRect(0, 0, width, height)
  ctx.save()
  ctx.beginPath()
  ctx.rect(plot.left, plot.top, plot.right - plot.left, plot.bottom - plot.top)
  ctx.clip()

  const tight = input.mobile || plotH < 150
  const topView = viewCamera.preset === 'top'
  const dbMarks = spectralDbGuides(floorDb, tight || topView ? 4 : 6)
  ctx.lineWidth = input.dpr
  if (!topView) for (const db of dbMarks) {
    const level = dbToSpectralLevel(db, floorDb)
    const a = projectSpectralPoint(0, level, 0, plot, viewCamera)
    const b = projectSpectralPoint(1, level, 0, plot, viewCamera)
    const c = projectSpectralPoint(1, level, 1, plot, viewCamera)
    const d = projectSpectralPoint(0, level, 1, plot, viewCamera)
    ctx.strokeStyle = colorWithAlpha(colors.borderSubtle, db === 0 ? 0.7 : 0.4)
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    if (!tight) {
      ctx.lineTo(c.x, c.y)
      ctx.lineTo(d.x, d.y)
    }
    ctx.stroke()
  }

  const timeLabels = spectralTimeLabels(input.historySec, tight ? 3 : 5)
  ctx.strokeStyle = colorWithAlpha(colors.borderSubtle, 0.55)
  for (const mark of timeLabels) {
    const age = input.historySec <= 0 ? 0 : mark.ageSec / input.historySec
    const a = projectSpectralPoint(0, 0, age, plot, viewCamera)
    const b = projectSpectralPoint(1, 0, age, plot, viewCamera)
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
  }

  runtime.hitCount = 0
  const liveFront = input.playing && !session.frozen
  const drawBuffer = (buffer: SpectralFrameBuffer, live: Float32Array, color: string, dashed: boolean) => {
    const count = buffer.copyTimes(runtime.times)
    const historySlices = Math.max(1, slices - (liveFront ? 1 : 0))
    for (let s = historySlices - 1; s >= 0; s--) {
      const ageSec = spectralScrollAge(s, historySlices, runtime.clock.now, input.historySec)
      if (liveFront && ageSec < 1 / 120) continue
      const time = runtime.clock.now - ageSec
      if (!interpolateSpectralFrame(buffer, runtime.times, count, time, runtime.column)) continue
      const age01 = input.historySec <= 0 ? 0 : Math.min(1, ageSec / input.historySec)
      strokeSeries(
        ctx,
        runtime,
        runtime.column,
        age01,
        ageSec,
        color,
        floorDb,
        plot,
        viewCamera,
        input,
        dashed,
        s % 2 === 0,
      )
    }
    if (liveFront && hasSpectrum(live)) {
      strokeSeries(ctx, runtime, live, 0, 0, color, floorDb, plot, viewCamera, input, dashed, true)
    }
    if (input.peakTrails && count > 1) {
      const chosen = selectSpectralSlices(runtime.times, count, runtime.clock.now, input.historySec, slices)
      spectralPeakHold(buffer, chosen, runtime.peak)
      ctx.save()
      ctx.globalAlpha = 0.85
      ctx.lineWidth = input.dpr * 1.1
      ctx.setLineDash([2 * input.dpr, 3 * input.dpr])
      ctx.strokeStyle = colorWithAlpha(colors.textPrimary, 0.45)
      ctx.beginPath()
      let drawing = false
      for (let i = 0; i < points; i += 2) {
        const db = runtime.peak[i] ?? Number.NaN
        if (!Number.isFinite(db)) {
          if (drawing) {
            ctx.stroke()
            drawing = false
            ctx.beginPath()
          }
          continue
        }
        const projected = projectSpectralPoint(i / (points - 1), dbToSpectralLevel(db, floorDb), 0, plot, viewCamera)
        if (!drawing) {
          ctx.moveTo(projected.x, projected.y)
          drawing = true
        } else ctx.lineTo(projected.x, projected.y)
      }
      if (drawing) ctx.stroke()
      ctx.restore()
    }
  }

  if (input.showPre) drawBuffer(runtime.pre, runtime.preLive, colors.textMuted, both)
  if (input.showPost) drawBuffer(runtime.post, runtime.postLive, colors.spectrumLine || colors.spectrum, false)
  if (!input.showPre && !input.showPost) drawBuffer(runtime.post, runtime.postLive, colors.spectrumLine || colors.spectrum, false)

  ctx.restore()

  ctx.fillStyle = colorWithAlpha(colors.textMuted, 0.8)
  ctx.font = `${10 * input.dpr}px ui-sans-serif, system-ui, sans-serif`
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'right'
  const dbLabelY: number[] = []
  if (!tight && !topView) {
    for (const db of dbMarks) {
      const level = dbToSpectralLevel(db, floorDb)
      const at = projectSpectralPoint(0, level, 0, plot, viewCamera)
      dbLabelY.push(at.y)
      ctx.fillText(db === 0 ? '0' : String(db), plot.left - 8 * input.dpr, at.y)
    }
  }

  const freqTicks = spectralFreqTicks(minHz, maxHz).map((hz) => {
    const freq = hzToX(hz, minHz, maxHz, 0, 1, input.scale)
    const at = projectSpectralPoint(freq, 0, 0, plot, viewCamera)
    const text = formatFreqTick(hz)
    return { hz, x: at.x, y: at.y, width: ctx.measureText(text).width, text }
  })
  const visible = spectralVisibleFreqTicks(freqTicks, 8 * input.dpr)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillStyle = colorWithAlpha(colors.textPrimary, 0.78)
  for (let i = 0; i < freqTicks.length; i++) {
    if (!visible.has(i)) continue
    const tick = freqTicks[i]!
    ctx.fillText(tick.text, tick.x, Math.min(plot.bottom + 2 * input.dpr, tick.y + 4 * input.dpr))
  }

  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = colorWithAlpha(colors.textMuted, 0.9)
  ctx.font = `${9 * input.dpr}px ui-sans-serif, system-ui, sans-serif`
  ctx.lineWidth = 3 * input.dpr
  ctx.strokeStyle = colorWithAlpha(colors.bgApp || '#050505', 0.9)
  for (const mark of timeLabels) {
    const age = input.historySec <= 0 ? 0 : mark.ageSec / input.historySec
    if (mark.ageSec <= 0.001) {
      const front = projectSpectralPoint(0, 0, 0, plot, viewCamera)
      ctx.textAlign = 'left'
      ctx.strokeText('NOW', plot.left + 4 * input.dpr, front.y - 8 * input.dpr)
      ctx.fillText('NOW', plot.left + 4 * input.dpr, front.y - 8 * input.dpr)
      ctx.textAlign = 'right'
      continue
    }
    const at = projectSpectralPoint(0.98, 0, age, plot, viewCamera)
    if (dbLabelY.some((y) => Math.abs(y - at.y) < 11 * input.dpr)) continue
    ctx.strokeText(mark.text, at.x, at.y)
    ctx.fillText(mark.text, at.x, at.y)
  }

  const source =
    input.layer === 'both' ? 'Source + Output' : input.layer === 'pre' ? 'Source' : 'Output'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillStyle = colorWithAlpha(colors.textPrimary, 0.72)
  ctx.font = `${10 * input.dpr}px ui-sans-serif, system-ui, sans-serif`
  ctx.fillText(source, plot.left, plot.top)

  const elapsed = performance.now() - started
  runtime.lastDrawMs = elapsed
  if (elapsed > 11) {
    runtime.quality = Math.max(0.45, runtime.quality * 0.84)
    runtime.calmFrames = 0
  } else if (elapsed < 4.5) {
    runtime.calmFrames += 1
    if (runtime.calmFrames > 24) runtime.quality = Math.min(1, runtime.quality + 0.05)
  } else {
    runtime.calmFrames = 0
  }
}

export function inspectSpectralHistory(
  runtime: SpectralHistoryRuntime,
  x: number,
  y: number,
  radius: number,
): { x: number; y: number; hz: number; db: number; ageSec: number } | null {
  const r2 = radius * radius
  let best: { x: number; y: number; hz: number; db: number; ageSec: number } | null = null
  let bestD = r2
  const n = runtime.hitCount
  const hits = runtime.hits
  for (let i = 0; i < n; i++) {
    const offset = i * 5
    const hx = hits[offset] ?? 0
    const hy = hits[offset + 1] ?? 0
    const dx = hx - x
    const dy = hy - y
    const d = dx * dx + dy * dy
    if (d <= bestD) {
      bestD = d
      best = {
        x: hx,
        y: hy,
        hz: hits[offset + 2] ?? 0,
        db: hits[offset + 3] ?? 0,
        ageSec: hits[offset + 4] ?? 0,
      }
    }
  }
  return best
}
