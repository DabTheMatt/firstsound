import { describe, expect, it } from 'vitest'
import { defaultParamValues } from '../parameters/definitions'
import { autoMakeupDb, limiterSettings } from './limiter'

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
