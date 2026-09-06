import { describe, expect, it } from 'vitest'
import type { EqBand } from './eqBands'
import {
  clampEqOverlayDb,
  dbToY,
  eqBandDragPatch,
  eqNodePlotDb,
  eqResponseCurveStyle,
  EQ_LIVE_CURVE_ALPHA_SCALE,
  EQ_LIVE_CURVE_WIDTH_SCALE,
  EQ_MINI_BAND_COUNT,
  freqToX,
  nodeDisplayDb,
  SPECTRUM_EQ_MAX_DB,
  SPECTRUM_EQ_MIN_DB,
  spectrumEqOverlayY,
  xToFreq,
  yToDb,
} from './eqPlot'

const peak = (over: Partial<EqBand> = {}): EqBand => ({
  type: 'peaking',
  frequency: 1000,
  gain: 6,
  q: 1,
  slope: 12,
  ...over,
})

describe('eq plot mapping', () => {
  it('round-trips log frequency across the plot width', () => {
    const width = 400
    const hz = 2500
    expect(xToFreq(freqToX(hz, width), width)).toBeCloseTo(hz, 4)
  })

  it('round-trips dB across the plot height', () => {
    const height = 200
    expect(yToDb(dbToY(6, height), height)).toBeCloseTo(6, 5)
    expect(yToDb(dbToY(-18, height), height)).toBeCloseTo(-18, 5)
  })

  it('places a gain node at the band gain and a width node from Q', () => {
    expect(nodeDisplayDb(peak({ gain: -4 }))).toBe(-4)
    expect(nodeDisplayDb({ type: 'lowpass', frequency: 800, gain: 0, q: 0.7, slope: 12 })).toBe(0)
    expect(nodeDisplayDb({ type: 'notch', frequency: 400, gain: 0, q: 0.7, slope: 12 })).toBeCloseTo(0, 5)
  })

  it('sits a highpass handle on the magnitude at cutoff, not at 0 dBFS', () => {
    const hp: EqBand = { type: 'highpass', frequency: 120, gain: 0, q: Math.SQRT1_2, slope: 12 }
    expect(eqNodePlotDb([hp], hp.frequency, 48000)).toBeCloseTo(-3, 0)
    expect(eqNodePlotDb([hp], hp.frequency, 48000)).toBeLessThan(0)
  })

  it('clamps a high-shelf stopband into the FFT overlay range', () => {
    const hs: EqBand = { type: 'highshelf', frequency: 400, gain: -18, q: 0.7, slope: 12 }
    const far = eqNodePlotDb([hs], 20000, 48000)
    expect(far).toBeGreaterThanOrEqual(SPECTRUM_EQ_MIN_DB)
    expect(clampEqOverlayDb(-80)).toBe(SPECTRUM_EQ_MIN_DB)
    expect(spectrumEqOverlayY(-80, 10, 110)).toBe(110)
    expect(spectrumEqOverlayY(0, 10, 110)).toBeCloseTo(60)
  })

  it('drags peaking bands in frequency and gain', () => {
    const patch = eqBandDragPatch(peak(), 880, 9, 1, 0)
    expect(patch.frequency).toBe(880)
    expect(patch.gain).toBe(9)
    expect(patch.q).toBeUndefined()
  })

  it('clamps spectrum gain to ±18 dB', () => {
    expect(eqBandDragPatch(peak(), 1000, 40, 1, 0).gain).toBe(SPECTRUM_EQ_MAX_DB)
    expect(eqBandDragPatch(peak(), 1000, -40, 1, 0).gain).toBe(SPECTRUM_EQ_MIN_DB)
  })

  it('uses 48 bands on the mini FFT', () => {
    expect(EQ_MINI_BAND_COUNT).toBe(48)
  })

  it('draws the live LFO curve at half width and lower alpha', () => {
    const stored = eqResponseCurveStyle('stored', false, 1)
    const live = eqResponseCurveStyle('live', false, 1)
    expect(EQ_LIVE_CURVE_WIDTH_SCALE).toBe(0.5)
    expect(live.width).toBeCloseTo(stored.width * EQ_LIVE_CURVE_WIDTH_SCALE)
    expect(live.alpha).toBeCloseTo(stored.alpha * EQ_LIVE_CURVE_ALPHA_SCALE)
  })
})
