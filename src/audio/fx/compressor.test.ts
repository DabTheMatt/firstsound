import { describe, expect, it } from 'vitest'
import { defaultParamValues } from '../parameters/definitions'
import { compressorSettings } from './compressor'
import { autoMakeupDb } from './limiter'

describe('compressorSettings', () => {
  it('maps defaults onto compressor-friendly units with no brickwall', () => {
    const s = compressorSettings(defaultParamValues())
    expect(s.threshold).toBe(-6)
    expect(s.ceiling).toBe(0)
    expect(s.ratio).toBe(12)
    expect(s.knee).toBe(6)
    expect(s.attack).toBeCloseTo(0.003)
    expect(s.release).toBeCloseTo(0.12)
    expect(s.inputGain).toBeCloseTo(1)
    expect(s.makeupGain).toBeCloseTo(1)
  })

  it('uses auto makeup when the toggle is on', () => {
    const params = defaultParamValues()
    params.compressorAutoMakeup = 1
    params.compressorThreshold = -12
    params.compressorRatio = 20
    params.compressorMakeup = 0
    const s = compressorSettings(params)
    expect(s.makeupGain).toBeGreaterThan(1)
    expect(autoMakeupDb(-12, 20)).toBeGreaterThan(0)
  })

  it('ignores legacy limiter compressor params', () => {
    const params = defaultParamValues()
    params.limiterThreshold = -24
    params.limiterRatio = 2
    params.compressorThreshold = -9
    params.compressorRatio = 8
    const s = compressorSettings(params)
    expect(s.threshold).toBe(-9)
    expect(s.ratio).toBe(8)
  })
})
