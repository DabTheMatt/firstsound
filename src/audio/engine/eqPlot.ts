import {
  bandUsesGain,
  bandUsesWidth,
  EQ_MAX_HZ,
  EQ_MIN_HZ,
  type EqBand,
} from './eqBands'
import { eqMagnitudeDb } from './eqResponse'

/** Live (LFO) overlay vs stored band setting on EQ / FFT plots. */
export const EQ_LIVE_CURVE_WIDTH_SCALE = 0.5
export const EQ_LIVE_CURVE_ALPHA_SCALE = 0.42

export function eqResponseCurveStyle(
  kind: 'stored' | 'live',
  bypassed: boolean,
  dpr: number,
): { width: number; alpha: number } {
  const width = Math.max(1.15, dpr * (bypassed ? 0.9 : 1.1))
  const alpha = bypassed ? 0.28 : 1
  if (kind === 'stored') return { width, alpha }
  return { width: width * EQ_LIVE_CURVE_WIDTH_SCALE, alpha: alpha * EQ_LIVE_CURVE_ALPHA_SCALE }
}

/** True when two band sets would draw as separate shapes on the plot. */
export function eqResponsesDiverge(
  a: EqBand[],
  b: EqBand[],
  freqs: number[],
  sampleRate: number,
  epsilonDb = 0.35,
): boolean {
  const step = Math.max(1, Math.floor(freqs.length / 64))
  for (let i = 0; i < freqs.length; i += step) {
    const hz = freqs[i] ?? EQ_MIN_HZ
    if (Math.abs(eqMagnitudeDb(a, hz, sampleRate) - eqMagnitudeDb(b, hz, sampleRate)) > epsilonDb) {
      return true
    }
  }
  return false
}

export function strokeEqMagnitude(
  ctx: CanvasRenderingContext2D,
  bands: EqBand[],
  freqs: number[],
  sampleRate: number,
  xAt: (index: number) => number,
  yAt: (db: number) => number,
): void {
  ctx.beginPath()
  let started = false
  for (let i = 0; i < freqs.length; i++) {
    const hz = freqs[i]
    if (!(hz !== undefined && hz > 0) || !Number.isFinite(hz)) continue
    const db = eqMagnitudeDb(bands, hz, sampleRate)
    if (!Number.isFinite(db)) continue
    const x = xAt(i)
    const y = yAt(db)
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue
    if (!started) {
      ctx.moveTo(x, y)
      started = true
    } else ctx.lineTo(x, y)
  }
  if (started) ctx.stroke()
}

/** Mini inspector FFT always shows this many log bands. */
export const EQ_MINI_BAND_COUNT = 48

/** Inspector EQ plot vertical range (dB). */
export const EQ_PLOT_MIN_DB = -48
export const EQ_PLOT_MAX_DB = 18

/** Large spectrum EQ curve / node vertical range (dB). */
export const SPECTRUM_EQ_MIN_DB = -18
export const SPECTRUM_EQ_MAX_DB = 18

export function clampEqOverlayDb(
  db: number,
  minDb = SPECTRUM_EQ_MIN_DB,
  maxDb = SPECTRUM_EQ_MAX_DB,
): number {
  return Math.min(maxDb, Math.max(minDb, db))
}

/** Node Y on an EQ overlay: actual chain magnitude at the handle frequency. */
export function eqNodePlotDb(
  bands: EqBand[],
  hz: number,
  sampleRate: number,
  minDb = SPECTRUM_EQ_MIN_DB,
  maxDb = SPECTRUM_EQ_MAX_DB,
): number {
  return clampEqOverlayDb(eqMagnitudeDb(bands, hz, sampleRate), minDb, maxDb)
}

export function spectrumEqOverlayY(
  db: number,
  top: number,
  bottom: number,
  minDb = SPECTRUM_EQ_MIN_DB,
  maxDb = SPECTRUM_EQ_MAX_DB,
): number {
  const span = maxDb - minDb
  if (!(span > 0) || !Number.isFinite(db)) return bottom
  const y = top + ((maxDb - db) / span) * (bottom - top)
  return Math.min(bottom, Math.max(top, y))
}

export type MagnitudeVertex = { x: number; y: number; hz: number; db: number }

/** How many response samples a plot needs. Log axes use the same density at 20 Hz and 10 kHz. */
export function responseSampleCount(plotWidth: number): number {
  if (!(plotWidth > 1)) return 2
  return Math.max(256, Math.min(2048, Math.round(plotWidth)))
}

/** Frequencies spaced evenly in the active plot scale, starting at `minHz` (never 0). */
export function displayFrequencies(
  count: number,
  minHz: number,
  maxHz: number,
  scale: FreqScaleKind,
): number[] {
  const n = Math.max(2, Math.round(count))
  const lo = Math.max(1e-3, minHz)
  const hi = Math.max(lo * 1.001, maxHz)
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    const hz = xToHz(i / (n - 1), lo, hi, 0, 1, scale)
    if (hz > 0 && Number.isFinite(hz)) out.push(hz)
  }
  return out
}

function frequencyOnAxis(hz: number, minHz: number, maxHz: number, scale: FreqScaleKind): boolean {
  if (!(hz > 0) || !Number.isFinite(hz) || !(minHz > 0) || !(maxHz > minHz)) return false
  const lo = hzToUnit(minHz, scale)
  const hi = hzToUnit(maxHz, scale)
  const span = hi - lo
  if (!(span > 0)) return false
  const t = (hzToUnit(hz, scale) - lo) / span
  return t >= -1e-4 && t <= 1 + 1e-4
}

/**
 * Magnitude samples → plot vertices.
 * Frequencies outside the axis are omitted. They are not pinned to the left or
 * right edge, which would draw a vertical wall into the first valid point.
 * dB outside [minDb, maxDb] clips to the horizontal boundary at that frequency.
 */
export function layoutMagnitudeCurve(
  freqs: readonly number[],
  dbAt: (hz: number) => number,
  plot: { left: number; right: number; top: number; bottom: number },
  minHz: number,
  maxHz: number,
  minDb: number,
  maxDb: number,
  scale: FreqScaleKind = 'log',
): MagnitudeVertex[] {
  const out: MagnitudeVertex[] = []
  for (const hz of freqs) {
    if (!frequencyOnAxis(hz, minHz, maxHz, scale)) continue
    const db = dbAt(hz)
    if (!Number.isFinite(db)) continue
    const x = mapHzToX(hz, minHz, maxHz, plot.left, plot.right, scale)
    const y = spectrumEqOverlayY(db, plot.top, plot.bottom, minDb, maxDb)
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue
    out.push({ x, y, hz, db })
  }
  return out
}

/** Open polyline. Does not close to the floor or run down the graph edge. */
export function strokeMagnitudeVertices(
  ctx: CanvasRenderingContext2D,
  vertices: readonly { x: number; y: number }[],
): void {
  if (vertices.length < 1) return
  ctx.beginPath()
  const first = vertices[0]!
  ctx.moveTo(first.x, first.y)
  for (let i = 1; i < vertices.length; i++) {
    const point = vertices[i]!
    ctx.lineTo(point.x, point.y)
  }
  ctx.stroke()
}

import { hzToUnit, hzToX as mapHzToX, xToHz, type FreqScaleKind } from './freqScale'

export function freqToX(
  hz: number,
  width: number,
  maxHz = EQ_MAX_HZ,
  minHz = EQ_MIN_HZ,
  scale: FreqScaleKind = 'log',
): number {
  return mapHzToX(hz, minHz, Math.max(maxHz, minHz * 1.01), 0, width, scale)
}

export function xToFreq(
  x: number,
  width: number,
  maxHz = EQ_MAX_HZ,
  minHz = EQ_MIN_HZ,
  scale: FreqScaleKind = 'log',
): number {
  return xToHz(x, minHz, Math.max(maxHz, minHz * 1.01), 0, width, scale)
}

export function dbToY(
  db: number,
  height: number,
  minDb = EQ_PLOT_MIN_DB,
  maxDb = EQ_PLOT_MAX_DB,
): number {
  return ((maxDb - db) / (maxDb - minDb)) * height
}

export function yToDb(
  y: number,
  height: number,
  minDb = EQ_PLOT_MIN_DB,
  maxDb = EQ_PLOT_MAX_DB,
): number {
  return maxDb - (y / Math.max(1, height)) * (maxDb - minDb)
}

/** Bell created by double-clicking the EQ plot. Uses the active frequency scale. */
export function bellFromPlotPoint(
  x: number,
  y: number,
  width: number,
  height: number,
  maxHz: number,
  minHz = EQ_MIN_HZ,
  scale: FreqScaleKind = 'log',
): { type: 'peaking'; frequency: number; gain: number; q: number } {
  const frequency = Math.min(
    EQ_MAX_HZ,
    Math.max(EQ_MIN_HZ, xToFreq(x, width, maxHz, minHz, scale)),
  )
  const gain = Math.min(
    SPECTRUM_EQ_MAX_DB,
    Math.max(SPECTRUM_EQ_MIN_DB, yToDb(y, height, SPECTRUM_EQ_MIN_DB, SPECTRUM_EQ_MAX_DB)),
  )
  return { type: 'peaking', frequency, gain, q: 0.7 }
}

/** Vertical node placement: gain for bells/shelves, a Q-mapped dB for width filters. */
export function nodeDisplayDb(band: EqBand): number {
  if (bandUsesGain(band.type)) return band.gain
  if (bandUsesWidth(band.type)) return Math.min(12, Math.max(-12, (Math.log(band.q) - Math.log(0.7)) * 6))
  return 0
}

export function eqBandDragPatch(
  band: EqBand,
  frequency: number,
  displayDb: number,
  q0: number,
  dyPx: number,
): Partial<EqBand> {
  const patch: Partial<EqBand> = { frequency }
  if (bandUsesGain(band.type)) {
    patch.gain = Math.min(SPECTRUM_EQ_MAX_DB, Math.max(SPECTRUM_EQ_MIN_DB, displayDb))
  } else if (bandUsesWidth(band.type)) {
    patch.q = Math.min(20, Math.max(0.1, q0 * 2 ** (dyPx / 80)))
  } else {
    patch.q = Math.min(20, Math.max(0.1, q0 * 2 ** (dyPx / 90)))
  }
  return patch
}
