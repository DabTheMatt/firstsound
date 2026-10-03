import { describe, expect, it } from 'vitest'
import { frequencyGuideHz, frequencyGuideLabelEvery, parseFreqGridDensity } from './freqGrid'

describe('frequency grid density', () => {
  it('spaces guides evenly in log frequency', () => {
    for (const density of [6, 12, 24] as const) {
      const guides = frequencyGuideHz(20, 20000, density)
      expect(guides).toHaveLength(density)
      expect(guides[0]).toBeCloseTo(20)
      expect(guides.at(-1)).toBeCloseTo(20000)
      const steps = guides.slice(1).map((hz, index) => Math.log(hz) - Math.log(guides[index]!))
      for (const step of steps) expect(step).toBeCloseTo(steps[0]!, 6)
    }
    expect(frequencyGuideHz(20, 20000, 24).length).toBeGreaterThan(frequencyGuideHz(20, 20000, 12).length)
    expect(frequencyGuideLabelEvery(6)).toBe(1)
    expect(frequencyGuideLabelEvery(12)).toBe(2)
    expect(frequencyGuideLabelEvery(24)).toBe(4)
    expect(parseFreqGridDensity('nope')).toBe(12)
  })
})
