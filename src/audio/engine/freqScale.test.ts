import { describe, expect, it } from 'vitest'
import { hzToUnit, hzToX, parseFreqScale } from './freqScale'

describe('freq scale', () => {
  it('puts octaves at even log steps', () => {
    const a = hzToX(100, 20, 20000, 0, 100, 'log')
    const b = hzToX(200, 20, 20000, 0, 100, 'log')
    const c = hzToX(400, 20, 20000, 0, 100, 'log')
    expect(b - a).toBeCloseTo(c - b, 5)
  })

  it('spreads linear Hertz evenly', () => {
    expect(hzToX(10000, 0, 20000, 0, 100, 'linear')).toBeCloseTo(50)
  })

  it('keeps the mel axis monotonic and distinct from linear', () => {
    const a = hzToX(200, 20, 20000, 0, 100, 'mel')
    const b = hzToX(2000, 20, 20000, 0, 100, 'mel')
    expect(b).toBeGreaterThan(a)
    expect(hzToX(10000, 20, 20000, 0, 100, 'mel')).not.toBeCloseTo(
      hzToX(10000, 20, 20000, 0, 100, 'linear'),
    )
    expect(hzToUnit(700, 'mel')).toBeGreaterThan(0)
  })

  it('parses stored scale ids', () => {
    expect(parseFreqScale('mel')).toBe('mel')
    expect(parseFreqScale('nope')).toBe('log')
  })
})
