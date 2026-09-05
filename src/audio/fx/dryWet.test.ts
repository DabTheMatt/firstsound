import { describe, expect, it } from 'vitest'
import { defaultParamValues } from '../parameters/definitions'
import { equalPowerDryWet, fxSendLevels, makeAbsCurve, safeFeedbackGain, sideGainFromWidth, stereoInputMix } from './dryWet'
import { wetDryFor } from './graphs'

describe('equalPowerDryWet', () => {
  it('keeps near-unity power at 50%', () => {
    const { dry, wet } = equalPowerDryWet(0.5)
    expect(dry ** 2 + wet ** 2).toBeCloseTo(1, 6)
    expect(dry).toBeCloseTo(Math.SQRT1_2, 6)
  })

  it('is fully dry or wet at the ends', () => {
    expect(equalPowerDryWet(0)).toEqual({ dry: 1, wet: 0 })
    expect(equalPowerDryWet(0.001)).toEqual({ dry: 1, wet: 0 })
    expect(equalPowerDryWet(1).wet).toBe(1)
    expect(equalPowerDryWet(1).dry).toBe(0)
  })
})

describe('fxSendLevels', () => {
  it('keeps dry at unity while wet is added', () => {
    const { dry, wet, out } = fxSendLevels(100, 40, 100)
    expect(dry).toBe(1)
    expect(wet).toBeCloseTo(0.4)
    expect(out).toBe(1)
  })

  it('can mute dry without touching wet', () => {
    const { dry, wet } = fxSendLevels(0, 80, 100)
    expect(dry).toBe(0)
    expect(wet).toBeCloseTo(0.8)
  })
})

describe('wetDryFor', () => {
  it('uses equal-power Mix so dry falls as wet rises', () => {
    const p = defaultParamValues()
    p.delayWet = 50
    const delay = wetDryFor('delay', p)
    expect(delay.dry).toBeCloseTo(Math.SQRT1_2, 5)
    expect(delay.wet).toBeCloseTo(Math.SQRT1_2, 5)
    expect(delay.out).toBe(1)
  })
})

describe('safeFeedbackGain', () => {
  it('passes through 0–95% and never exceeds unity', () => {
    expect(safeFeedbackGain(0)).toBe(0)
    expect(safeFeedbackGain(80)).toBeCloseTo(0.8)
    expect(safeFeedbackGain(95)).toBeCloseTo(0.95)
    expect(safeFeedbackGain(120)).toBeLessThanOrEqual(0.95)
  })
})

describe('sideGainFromWidth', () => {
  it('maps 0/100/200% to mono, natural, double side', () => {
    expect(sideGainFromWidth(0)).toBe(0)
    expect(sideGainFromWidth(100)).toBe(1)
    expect(sideGainFromWidth(200)).toBe(2)
  })
})

describe('stereoInputMix', () => {
  it('sums to mono at 0% and keeps channels at 100%', () => {
    const mono = stereoInputMix(0)
    expect(mono.keep).toBeCloseTo(0.5)
    expect(mono.cross).toBeCloseTo(0.5)
    const stereo = stereoInputMix(100)
    expect(stereo.keep).toBeCloseTo(1)
    expect(stereo.cross).toBeCloseTo(0)
  })
})

describe('makeAbsCurve', () => {
  it('rectifies bipolar samples', () => {
    const c = makeAbsCurve(5)
    expect(c[0]).toBeCloseTo(1)
    expect(c[2]).toBeCloseTo(0)
    expect(c[4]).toBeCloseTo(1)
  })
})
