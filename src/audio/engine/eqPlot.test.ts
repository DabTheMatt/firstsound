import { describe, expect, it } from 'vitest'
import type { EqBand } from './eqBands'
import {
  bellFromPlotPoint,
  clampEqOverlayDb,
  dbToY,
  eqBandDragPatch,
  eqNodePlotDb,
  eqResponseCurveStyle,
  eqResponsesDiverge,
  EQ_LIVE_CURVE_ALPHA_SCALE,
  EQ_LIVE_CURVE_WIDTH_SCALE,
  EQ_MINI_BAND_COUNT,
  displayFrequencies,
  freqToX,
  layoutMagnitudeCurve,
  nodeDisplayDb,
  SPECTRUM_EQ_MAX_DB,
  SPECTRUM_EQ_MIN_DB,
  spectrumEqOverlayY,
  xToFreq,
  yToDb,
} from './eqPlot'
import { eqMagnitudeDb } from './eqResponse'
import type { EqFilterType } from './eqBands'

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

  it('maps a double-click through the active frequency scale into a clamped bell', () => {
    const width = 400
    const height = 200
    const hz = 3200
    const log = bellFromPlotPoint(freqToX(hz, width, 20000, 20, 'log'), 40, width, height, 20000, 20, 'log')
    const lin = bellFromPlotPoint(freqToX(hz, width, 20000, 20, 'linear'), 40, width, height, 20000, 20, 'linear')
    expect(log.type).toBe('peaking')
    expect(log.q).toBe(0.7)
    expect(log.frequency).toBeCloseTo(hz, 3)
    expect(lin.frequency).toBeCloseTo(hz, 3)
    expect(freqToX(hz, width, 20000, 20, 'log')).not.toBeCloseTo(
      freqToX(hz, width, 20000, 20, 'linear'),
      0,
    )
    const high = bellFromPlotPoint(width + 80, -40, width, height, 20000, 20, 'log')
    expect(high.frequency).toBeLessThanOrEqual(25000)
    expect(high.gain).toBe(18)
    const low = bellFromPlotPoint(-20, height + 40, width, height, 20000, 20, 'mel')
    expect(low.frequency).toBeGreaterThanOrEqual(10)
    expect(low.gain).toBe(-18)
  })

  it('uses 48 bands on the mini FFT', () => {
    expect(EQ_MINI_BAND_COUNT).toBe(48)
  })

  it('treats one bell as a single response and reports a real second contribution', () => {
    const bell = peak({ frequency: 1000, gain: 6 })
    const other = peak({ frequency: 4000, gain: -8 })
    const freqs = [100, 1000, 4000, 12000]
    expect(eqResponsesDiverge([bell], [bell], freqs, 48000)).toBe(false)
    expect(eqResponsesDiverge([bell], [bell, other], freqs, 48000)).toBe(true)
  })

  it('samples the response from 20 Hz and does not pin 0 Hz to the left edge', () => {
    const freqs = displayFrequencies(512, 20, 20000, 'log')
    expect(freqs[0]).toBeCloseTo(20, 4)
    expect(Math.min(...freqs)).toBeGreaterThan(19.99)
    expect(freqs.every((hz) => hz > 0 && Number.isFinite(hz))).toBe(true)
    const plot = { left: 0, right: 800, top: 0, bottom: 120 }
    const verts = layoutMagnitudeCurve(
      [0, 5, 20, 1000, 20000],
      (hz) => (hz < 20 ? -90 : 0),
      plot,
      20,
      20000,
      SPECTRUM_EQ_MIN_DB,
      SPECTRUM_EQ_MAX_DB,
      'log',
    )
    expect(verts[0]!.hz).toBeCloseTo(20, 4)
    expect(verts.some((point) => point.hz < 20)).toBe(false)
    expect(verts[0]!.y).toBeCloseTo(spectrumEqOverlayY(0, 0, 120), 4)
    expect(verts[0]!.y).toBeLessThan(120)
  })

  it('clips a steep high-pass on the bottom without a vertical wall at 20 Hz', () => {
    const shapes: { type: EqFilterType; gain: number; q: number; slope: 12 | 48 }[] = [
      { type: 'highpass', gain: 0, q: 0.707, slope: 48 },
      { type: 'lowpass', gain: 0, q: 0.707, slope: 48 },
      { type: 'peaking', gain: 8, q: 1.2, slope: 12 },
      { type: 'notch', gain: 0, q: 4, slope: 12 },
      { type: 'lowshelf', gain: -6, q: 0.7, slope: 12 },
      { type: 'highshelf', gain: 6, q: 0.7, slope: 12 },
    ]
    const plot = { left: 0, right: 900, top: 0, bottom: 140 }
    for (const shape of shapes) {
      for (const cutoff of [20, 30, 50, 100, 500, 1000, 5000, 10000, 20000]) {
        const band: EqBand = { type: shape.type, frequency: cutoff, gain: shape.gain, q: shape.q, slope: shape.slope }
        const freqs = displayFrequencies(700, 20, 20000, 'log')
        const verts = layoutMagnitudeCurve(
          freqs,
          (hz) => eqMagnitudeDb([band], hz, 48000),
          plot,
          20,
          20000,
          SPECTRUM_EQ_MIN_DB,
          SPECTRUM_EQ_MAX_DB,
          'log',
        )
        expect(verts.length).toBeGreaterThan(100)
        expect(verts[0]!.hz).toBeCloseTo(20, 3)
        expect(verts[0]!.x).toBeCloseTo(0, 3)
        for (let i = 0; i < verts.length; i++) {
          const point = verts[i]!
          expect(Number.isFinite(point.db)).toBe(true)
          expect(Number.isFinite(point.x)).toBe(true)
          expect(Number.isFinite(point.y)).toBe(true)
          expect(point.y).toBeGreaterThanOrEqual(plot.top - 0.01)
          expect(point.y).toBeLessThanOrEqual(plot.bottom + 0.01)
          if (i === 0) continue
          const prev = verts[i - 1]!
          const dx = point.x - prev.x
          expect(dx).toBeGreaterThan(0.2)
          const dy = Math.abs(point.y - prev.y)
          expect(dy / dx).toBeLessThan(40)
        }
      }
    }
  })

  it('draws the live LFO curve at half width and lower alpha', () => {
    const stored = eqResponseCurveStyle('stored', false, 1)
    const live = eqResponseCurveStyle('live', false, 1)
    expect(EQ_LIVE_CURVE_WIDTH_SCALE).toBe(0.5)
    expect(live.width).toBeCloseTo(stored.width * EQ_LIVE_CURVE_WIDTH_SCALE)
    expect(live.alpha).toBeCloseTo(stored.alpha * EQ_LIVE_CURVE_ALPHA_SCALE)
  })
})
