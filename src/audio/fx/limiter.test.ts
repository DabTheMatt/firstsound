import { describe, expect, it } from 'vitest'
import { defaultParamValues } from '../parameters/definitions'
import {
  amplitudeToDb,
  autoMakeupDb,
  buildLimiterWavePreview,
  compressorGainDb,
  compressorKneeRange,
  crushSample,
  LIMITER_PLOT_MAX_DB,
  LIMITER_PLOT_MIN_DB,
  LIMITER_PREVIEW_SECONDS,
  limitSample,
  limiterOutputDb,
  limiterPlotT,
  limiterSettings,
  makeLimiterTransferCurve,
  peakAmplitude,
} from './limiter'

describe('autoMakeupDb', () => {
  it('is zero at 0 dB threshold', () => {
    expect(autoMakeupDb(0, 12)).toBe(0)
  })

  it('restores more makeup at a lower threshold and higher ratio', () => {
    expect(autoMakeupDb(-6, 20)).toBeGreaterThan(autoMakeupDb(-6, 2))
    expect(autoMakeupDb(-12, 20)).toBeGreaterThan(autoMakeupDb(-6, 20))
  })
})

describe('limiterSettings', () => {
  it('maps defaults onto compressor-friendly units', () => {
    const s = limiterSettings(defaultParamValues())
    expect(s.threshold).toBe(-6)
    expect(s.ceiling).toBeCloseTo(-0.3)
    expect(s.ratio).toBe(12)
    expect(s.attack).toBeCloseTo(0.003)
    expect(s.release).toBeCloseTo(0.12)
    expect(s.inputGain).toBeCloseTo(1)
    expect(s.makeupGain).toBeCloseTo(1)
  })

  it('uses auto makeup when the toggle is on', () => {
    const params = defaultParamValues()
    params.limiterAutoMakeup = 1
    params.limiterThreshold = -12
    params.limiterRatio = 20
    params.limiterMakeup = 0
    const s = limiterSettings(params)
    expect(s.makeupGain).toBeGreaterThan(1)
  })
})

describe('compressorGainDb', () => {
  it('is transparent below the knee', () => {
    expect(compressorGainDb(-24, -6, 12, 0)).toBe(0)
    expect(compressorGainDb(-12, -6, 20, 6)).toBe(0)
  })

  it('reduces more as the ratio and overshoot grow', () => {
    const soft = compressorGainDb(0, -6, 4, 0)
    const hard = compressorGainDb(0, -6, 20, 0)
    expect(hard).toBeLessThan(soft)
    expect(soft).toBeLessThan(0)
  })
})

describe('compressorKneeRange', () => {
  it('centers the soft-knee band on threshold', () => {
    expect(compressorKneeRange(-6, 6)).toEqual({ lo: -9, hi: -3, width: 6 })
    expect(compressorKneeRange(-12, 0)).toEqual({ lo: -12, hi: -12, width: 0 })
  })
})

describe('limiterPlotT', () => {
  it('maps the plot edges to 0 and 1', () => {
    expect(limiterPlotT(LIMITER_PLOT_MIN_DB)).toBe(0)
    expect(limiterPlotT(LIMITER_PLOT_MAX_DB)).toBe(1)
    expect(limiterPlotT((LIMITER_PLOT_MIN_DB + LIMITER_PLOT_MAX_DB) / 2)).toBeCloseTo(0.5)
  })
})

describe('limiterOutputDb', () => {
  it('follows unity below threshold and compresses above it', () => {
    const s = limiterSettings(defaultParamValues())
    expect(limiterOutputDb(-24, s)).toBeCloseTo(-24, 3)
    expect(limiterOutputDb(0, s)).toBeLessThan(-1)
  })

  it('never exceeds the ceiling after makeup', () => {
    const params = defaultParamValues()
    params.limiterThreshold = -24
    params.limiterRatio = 20
    params.limiterMakeup = 24
    const s = limiterSettings(params)
    expect(limiterOutputDb(0, s)).toBeCloseTo(s.ceiling, 5)
  })

  it('converts amplitude to dB', () => {
    expect(amplitudeToDb(1)).toBeCloseTo(0)
    expect(amplitudeToDb(0.5)).toBeCloseTo(-6.02, 1)
  })
})

describe('limitSample', () => {
  it('passes quiet samples and reduces hot ones toward the ceiling', () => {
    const s = limiterSettings(defaultParamValues())
    expect(Math.abs(limitSample(0.05, s))).toBeCloseTo(0.05, 3)
    expect(Math.abs(limitSample(0.99, s))).toBeLessThan(0.99)
    expect(Math.abs(limitSample(-0.99, s))).toBeLessThan(0.99)
  })
})

describe('buildLimiterWavePreview', () => {
  it('covers up to the preview window and crushes hot peaks in Out', () => {
    const rate = 100
    const mono = new Float32Array(rate * 12)
    for (let i = 0; i < mono.length; i++) mono[i] = i % 2 === 0 ? 0.95 : -0.95
    const s = limiterSettings(defaultParamValues())
    s.threshold = -12
    s.ratio = 20
    s.makeupGain = 1
    const preview = buildLimiterWavePreview(mono, rate, 0, LIMITER_PREVIEW_SECONDS, 8, s, true)
    expect(preview.durationSec).toBeCloseTo(10, 5)
    expect(peakAmplitude(preview.inMax)).toBeGreaterThan(0.9)
    expect(peakAmplitude(preview.outMax)).toBeLessThan(peakAmplitude(preview.inMax))
  })

  it('shortens near EOF and leaves Out equal to In when not applying', () => {
    const mono = new Float32Array([0.2, -0.4, 0.6, -0.8])
    const s = limiterSettings(defaultParamValues())
    const preview = buildLimiterWavePreview(mono, 2, 1, 10, 2, s, false)
    expect(preview.durationSec).toBeCloseTo(1, 5)
    expect(preview.outMax[0]).toBe(preview.inMax[0])
    expect(preview.outMin[1]).toBe(preview.inMin[1])
  })
})

describe('makeLimiterTransferCurve', () => {
  it('matches limitSample so the live path crushes like the preview', () => {
    const s = limiterSettings(defaultParamValues())
    s.threshold = -18
    s.ratio = 20
    s.makeupGain = 1
    const curve = makeLimiterTransferCurve(s, 5)
    expect(curve).toHaveLength(5)
    expect(curve[2]).toBeCloseTo(0, 5)
    expect(curve[4]).toBeCloseTo(limitSample(1, s), 5)
    expect(curve[0]).toBeCloseTo(limitSample(-1, s), 5)
    expect(Math.abs(curve[4] ?? 0)).toBeLessThan(0.2)
  })
})

describe('crushSample', () => {
  it('passes through below threshold and flattens above it', () => {
    expect(crushSample(0.1, 0.3, 12)).toBeCloseTo(0.1)
    expect(Math.abs(crushSample(0.9, 0.3, 20))).toBeLessThan(0.4)
    expect(Math.abs(crushSample(-0.9, 0.3, 20))).toBeLessThan(0.4)
  })
})
