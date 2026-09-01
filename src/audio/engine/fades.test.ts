import { describe, expect, it } from 'vitest'
import { applyFades, fadeGain } from './fades'

describe('fadeGain', () => {
  it('starts at 0 and ends at 1 for fade-in', () => {
    for (const curve of ['linear', 'equalPower', 'exponential', 'sCurve'] as const) {
      expect(fadeGain(0, curve)).toBeCloseTo(0)
      expect(fadeGain(1, curve)).toBeCloseTo(1)
    }
  })

  it('equal-power is 1/sqrt(2) at the midpoint', () => {
    expect(fadeGain(0.5, 'equalPower')).toBeCloseTo(Math.SQRT1_2, 5)
  })
})

describe('applyFades', () => {
  it('silences the first and last samples of a 1s block with 10ms fades', () => {
    const sr = 1000
    const data = new Float32Array(sr)
    data.fill(1)
    applyFades(data, sr, 0.01, 0.01, 'linear')
    expect(data[0]).toBeCloseTo(0)
    expect(data[9]).toBeCloseTo(1)
    expect(data[sr - 1]).toBeCloseTo(0)
    expect(data[500]).toBe(1)
  })
})
