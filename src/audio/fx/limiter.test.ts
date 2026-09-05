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
  limiterBrickwallSettings,
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

describe('limiterBrickwallSettings', () => {
  it('maps the limiter to a hard brickwall at the ceiling', () => {
    const s = limiterBrickwallSettings(defaultParamValues())
    expect(s.ceiling).toBeCloseTo(-0.3)
    expect(s.threshold).toBeCloseTo(s.ceiling)
    expect(s.knee).toBe(0)
    expect(s.ratio).toBe(20)
    expect(s.makeupGain).toBe(1)
    expect(s.attack).toBeCloseTo(0.003)
    expect(s.release).toBeCloseTo(0.12)
    expect(s.inputGain).toBeCloseTo(1)
  })

  it('ignores legacy compressor-style limiter params', () => {
    const params = defaultParamValues()
    params.limiterThreshold = -24
    params.limiterRatio = 4
    params.limiterKnee = 12
    params.limiterMakeup = 12
    params.limiterAutoMakeup = 1
    params.limiterCeiling = -1
    const s = limiterSettings(params)
    expect(s.threshold).toBeCloseTo(-1)
    expect(s.ceiling).toBeCloseTo(-1)
    expect(s.knee).toBe(0)
    expect(s.ratio).toBe(20)
    expect(s.makeupGain).toBe(1)
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
  it('follows unity below the brickwall and clamps at the ceiling', () => {
    const s = limiterBrickwallSettings(defaultParamValues())
    expect(limiterOutputDb(-24, s)).toBeCloseTo(-24, 3)
    expect(limiterOutputDb(0, s)).toBeCloseTo(s.ceiling, 5)
  })

  it('never exceeds the ceiling', () => {
    const params = defaultParamValues()
    params.limiterCeiling = -1
    params.limiterInput = 12
    const s = limiterBrickwallSettings(params)
    expect(limiterOutputDb(0, s)).toBeCloseTo(s.ceiling, 5)
  })

  it('converts amplitude to dB', () => {
    expect(amplitudeToDb(1)).toBeCloseTo(0)
    expect(amplitudeToDb(0.5)).toBeCloseTo(-6.02, 1)
  })
})

describe('limitSample', () => {
  it('passes quiet samples and caps hot ones at the ceiling', () => {
    const s = limiterBrickwallSettings(defaultParamValues())
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
    const s = limiterBrickwallSettings(defaultParamValues())
    s.ceiling = -12
    s.threshold = -12
    const preview = buildLimiterWavePreview(mono, rate, 0, LIMITER_PREVIEW_SECONDS, 8, s, true)
    expect(preview.durationSec).toBeCloseTo(10, 5)
    expect(peakAmplitude(preview.inMax)).toBeGreaterThan(0.9)
    expect(peakAmplitude(preview.outMax)).toBeLessThan(peakAmplitude(preview.inMax))
  })

  it('shortens near EOF and leaves Out equal to In when not applying', () => {
    const mono = new Float32Array([0.2, -0.4, 0.6, -0.8])
    const s = limiterBrickwallSettings(defaultParamValues())
    const preview = buildLimiterWavePreview(mono, 2, 1, 10, 2, s, false)
    expect(preview.durationSec).toBeCloseTo(1, 5)
    expect(preview.outMax[0]).toBe(preview.inMax[0])
    expect(preview.outMin[1]).toBe(preview.inMin[1])
  })
})

describe('makeLimiterTransferCurve', () => {
  it('matches limitSample so the live path crushes like the preview', () => {
    const s = limiterBrickwallSettings(defaultParamValues())
    s.ceiling = -18
    s.threshold = -18
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
