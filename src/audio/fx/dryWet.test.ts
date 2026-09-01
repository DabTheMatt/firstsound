import { describe, expect, it } from 'vitest'
import { equalPowerDryWet, safeFeedbackGain } from './dryWet'

describe('equalPowerDryWet', () => {
  it('keeps near-unity power at 50%', () => {
    const { dry, wet } = equalPowerDryWet(0.5)
    expect(dry ** 2 + wet ** 2).toBeCloseTo(1, 6)
    expect(dry).toBeCloseTo(Math.SQRT1_2, 6)
  })

  it('is fully dry or wet at the ends', () => {
    expect(equalPowerDryWet(0)).toEqual({ dry: 1, wet: 0 })
    expect(equalPowerDryWet(1).wet).toBeCloseTo(1)
    expect(equalPowerDryWet(1).dry).toBeCloseTo(0)
  })
})

describe('safeFeedbackGain', () => {
  it('passes through 0–100%', () => {
    expect(safeFeedbackGain(0)).toBe(0)
    expect(safeFeedbackGain(80)).toBeCloseTo(0.8)
  })

  it('compresses runaway values above 100%', () => {
    expect(safeFeedbackGain(120)).toBeLessThan(1.2)
    expect(safeFeedbackGain(120)).toBeGreaterThan(1)
  })
})
