import { describe, expect, it } from 'vitest'
import { defaultParamValues } from '../parameters/definitions'
import {
  applyDelayCorrelation,
  applyCorrelatedPair,
  complementaryPct,
  delaySendLevels,
  equalPowerDryWet,
  fxSendLevels,
  makeAbsCurve,
  reverbSendLevels,
  safeFeedbackGain,
  sideGainFromWidth,
  stereoInputMix,
} from './dryWet'
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
  it('correlates delay Dry and Wet so they sum to unity', () => {
    const p = defaultParamValues()
    p.delayCorrelate = 1
    p.delayWet = 50
    p.delayDry = 100
    const delay = wetDryFor('delay', p)
    expect(delay.dry).toBeCloseTo(0.5)
    expect(delay.wet).toBeCloseTo(0.5)
    expect(delay.out).toBe(1)
  })

  it('lets uncorrelated delay Dry and Wet stack', () => {
    const p = defaultParamValues()
    p.delayCorrelate = 0
    p.delayDry = 100
    p.delayWet = 50
    const stacked = wetDryFor('delay', p)
    expect(stacked.dry).toBe(1)
    expect(stacked.wet).toBeCloseTo(0.5)
  })

  it('correlates reverb Dry and Wet so they sum to unity', () => {
    const p = defaultParamValues()
    p.reverbCorrelate = 1
    p.reverbWet = 100
    p.reverbDry = 0
    const full = wetDryFor('reverb', p)
    expect(full.dry).toBe(0)
    expect(full.wet).toBe(1)
    p.reverbWet = 40
    p.reverbDry = 100
    const correlated = wetDryFor('reverb', p)
    expect(correlated.dry).toBeCloseTo(0.6)
    expect(correlated.wet).toBeCloseTo(0.4)
    expect(correlated.dry + correlated.wet).toBeCloseTo(1)
  })

  it('lets uncorrelated reverb Dry and Wet stack', () => {
    const p = defaultParamValues()
    p.reverbCorrelate = 0
    p.reverbDry = 100
    p.reverbWet = 50
    const stacked = wetDryFor('reverb', p)
    expect(stacked.dry).toBe(1)
    expect(stacked.wet).toBeCloseTo(0.5)
  })
})

describe('applyCorrelatedPair', () => {
  it('makes Dry and Wet complementary percentages', () => {
    expect(applyCorrelatedPair('wet', 30)).toEqual({ dry: 70, wet: 30 })
    expect(applyCorrelatedPair('dry', 80)).toEqual({ dry: 80, wet: 20 })
    expect(complementaryPct(40)).toBe(60)
  })
})

describe('applyDelayCorrelation', () => {
  it('mirrors left and right when Correlate is enabled', () => {
    const p = defaultParamValues()
    p.delayWet = 40
    p.delayWetR = 25
    p.delayDry = 100
    p.delayDryR = 100
    applyDelayCorrelation(p, 'enable')
    expect(p.delayDry).toBe(60)
    expect(p.delayWet).toBe(40)
    expect(p.delayDryR).toBe(75)
    expect(p.delayWetR).toBe(25)
  })
})

describe('delaySendLevels', () => {
  it('ignores stored Dry when Correlate is on', () => {
    const send = delaySendLevels({ delayDry: 100, delayWet: 25, delayCorrelate: 1 })
    expect(send.dry).toBeCloseTo(0.75)
    expect(send.wet).toBeCloseTo(0.25)
  })
})

describe('reverbSendLevels', () => {
  it('ignores stored Dry when Correlate is on', () => {
    const send = reverbSendLevels({ reverbDry: 100, reverbWet: 25, reverbCorrelate: 1 })
    expect(send.dry).toBeCloseTo(0.75)
    expect(send.wet).toBeCloseTo(0.25)
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
