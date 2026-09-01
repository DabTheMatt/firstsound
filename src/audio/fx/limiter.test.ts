import { describe, expect, it } from 'vitest'
import { defaultParamValues } from '../parameters/definitions'
import {
  amplitudeToDb,
  autoMakeupDb,
  compressorGainDb,
  limiterOutputDb,
  limiterSettings,
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
