import {
  bandUsesGain,
  bandUsesWidth,
  EQ_MAX_HZ,
  EQ_MIN_HZ,
  type EqBand,
} from './eqBands'

/** Mini inspector FFT always shows this many log bands. */
export const EQ_MINI_BAND_COUNT = 48

/** Inspector EQ plot vertical range (dB). */
export const EQ_PLOT_MIN_DB = -48
export const EQ_PLOT_MAX_DB = 18

/** Large spectrum EQ curve / node vertical range (dB). */
export const SPECTRUM_EQ_MIN_DB = -18
export const SPECTRUM_EQ_MAX_DB = 18

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
