import { describe, expect, it } from 'vitest'
import { fillPinkNoise } from './pinkNoise'

describe('fillPinkNoise', () => {
  it('writes finite samples with mixed polarity', () => {
    const data = new Float32Array(2048)
    fillPinkNoise(data, 7)
    let min = Infinity
    let max = -Infinity
    for (const x of data) {
      expect(Number.isFinite(x)).toBe(true)
      if (x < min) min = x
      if (x > max) max = x
    }
    expect(min).toBeLessThan(0)
    expect(max).toBeGreaterThan(0)
  })
})
