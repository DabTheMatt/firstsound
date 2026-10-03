import { describe, expect, it } from 'vitest'
import { hzToX } from './freqScale'
import { frequencyGuideHz, frequencyGuideLabelEvery, parseFreqGridDensity } from './freqGrid'

describe('frequency grid density', () => {
  it('uses the common 1-2-5 frequencies on a log axis', () => {
    expect(frequencyGuideHz(20, 20000, 12)).toEqual([20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000])
    expect(frequencyGuideHz(20, 20000, 6)).toEqual([20, 100, 1000, 10000, 20000])
    const dense = frequencyGuideHz(20, 20000, 24)
    expect(dense).toEqual([
      20, 30, 40, 50, 60, 80, 100, 200, 300, 400, 500, 800, 1000, 2000, 3000, 4000, 6000, 8000, 10000, 20000,
    ])
    expect(dense.every((hz) => Number.isInteger(hz))).toBe(true)
    for (let i = 1; i < dense.length; i++) expect(dense[i]).toBeGreaterThan(dense[i - 1]!)
    expect(frequencyGuideLabelEvery(6)).toBe(1)
    expect(frequencyGuideLabelEvery(12)).toBe(1)
    expect(frequencyGuideLabelEvery(24)).toBe(1)
    expect(parseFreqGridDensity('nope')).toBe(12)
  })

  it('keeps mel guides on the same round Hertz and spaces linear guides evenly', () => {
    expect(frequencyGuideHz(20, 20000, 12, 'mel')).toEqual(frequencyGuideHz(20, 20000, 12, 'log'))
    const linear = frequencyGuideHz(20, 20000, 6, 'linear')
    expect(linear[0]).toBe(20)
    expect(linear.at(-1)).toBe(20000)
    expect(linear.every((hz) => Number.isInteger(hz))).toBe(true)
    expect(linear.length).toBeGreaterThan(2)
  })

  it('spaces log guides by octaves, not by equal pixels', () => {
    const guides = frequencyGuideHz(20, 20000, 24, 'log')
    const xs = guides.map((hz) => hzToX(hz, 20, 20000, 0, 1000, 'log'))
    const firstGap = xs[1]! - xs[0]!
    const lastGap = xs.at(-1)! - xs.at(-2)!
    expect(lastGap).toBeGreaterThan(firstGap * 1.5)
  })
})
