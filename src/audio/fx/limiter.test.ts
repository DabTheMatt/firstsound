import { describe, expect, it } from 'vitest'
import { defaultParamValues } from '../parameters/definitions'
import {
  amplitudeToDb,
  autoMakeupDb,
  compressorGainDb,
  crushSample,
  downsampleScope,
  limiterOutputDb,
  limiterSettings,
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

describe('downsampleScope', () => {
  it('keeps the signed peak of each bucket', () => {
    const samples = new Float32Array([0.1, -0.9, 0.2, 0.4, -0.3, 0.05])
    const out = new Float32Array(2)
    downsampleScope(samples, 2, out)
    expect(Math.abs(out[0] ?? 0)).toBeGreaterThan(0.8)
    expect(Math.abs(out[1] ?? 0)).toBeGreaterThan(0.3)
  })
})

describe('crushSample', () => {
  it('passes through below threshold and flattens above it', () => {
    expect(crushSample(0.1, 0.3, 12)).toBeCloseTo(0.1)
    expect(Math.abs(crushSample(0.9, 0.3, 20))).toBeLessThan(0.4)
    expect(Math.abs(crushSample(-0.9, 0.3, 20))).toBeLessThan(0.4)
  })

  it('flattens a hot sine so peaks sit near the threshold', () => {
    const n = 48
    const hot = new Float32Array(n)
    const crushed = new Float32Array(n)
    const thresh = 0.2
    for (let i = 0; i < n; i++) hot[i] = 0.95 * Math.sin((i / n) * Math.PI * 4)
    for (let i = 0; i < n; i++) crushed[i] = crushSample(hot[i]!, thresh, 20)
    expect(peakAmplitude(hot)).toBeGreaterThan(thresh * 2)
    expect(peakAmplitude(crushed)).toBeLessThan(thresh * 1.2)
    expect(peakAmplitude(crushed)).toBeGreaterThan(thresh * 0.9)
  })
})
