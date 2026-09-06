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

export function strokeEqMagnitude(
  ctx: CanvasRenderingContext2D,
  bands: EqBand[],
  freqs: number[],
  sampleRate: number,
  xAt: (index: number) => number,
  yAt: (db: number) => number,
): void {
  ctx.beginPath()
  for (let i = 0; i < freqs.length; i++) {
    const y = yAt(eqMagnitudeDb(bands, freqs[i] ?? EQ_MIN_HZ, sampleRate))
    const x = xAt(i)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()
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

/** Node Y on the spectrum overlay: actual chain magnitude at the handle frequency. */
export function eqNodePlotDb(bands: EqBand[], hz: number, sampleRate: number): number {
  return clampEqOverlayDb(eqMagnitudeDb(bands, hz, sampleRate))
}

export function spectrumEqOverlayY(
  db: number,
  top: number,
  bottom: number,
  minDb = SPECTRUM_EQ_MIN_DB,
  maxDb = SPECTRUM_EQ_MAX_DB,
): number {
  const span = maxDb - minDb
  const y = top + ((maxDb - db) / span) * (bottom - top)
  return Math.min(bottom, Math.max(top, y))
}

export function freqToX(hz: number, width: number, maxHz = EQ_MAX_HZ, minHz = EQ_MIN_HZ): number {
  const hi = Math.max(maxHz, minHz * 1.01)
  const t = Math.log(Math.min(hi, Math.max(minHz, hz)) / minHz) / Math.log(hi / minHz)
  return t * width
}

export function xToFreq(x: number, width: number, maxHz = EQ_MAX_HZ, minHz = EQ_MIN_HZ): number {
  const hi = Math.max(maxHz, minHz * 1.01)
  const t = Math.min(1, Math.max(0, x / Math.max(1, width)))
  return minHz * (hi / minHz) ** t
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
