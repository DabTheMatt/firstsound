import { describe, expect, it } from 'vitest'
import { defaultEqBandAt } from './eqBands'
import { cloneEqBands, eqBandsForChannel, eqPoolSize } from './eqGraph'

describe('eqBandsForChannel', () => {
  it('uses the shared curve until a side has its own bands', () => {
    const shared = [defaultEqBandAt(0)]
    const left = [defaultEqBandAt(1)]
    expect(eqBandsForChannel('shared', 'left', shared, [], []).length).toBe(1)
    expect(eqBandsForChannel('left', 'left', shared, left, [])[0]?.frequency).toBe(left[0]?.frequency)
    expect(eqBandsForChannel('right', 'right', shared, left, [])[0]?.frequency).toBe(shared[0]?.frequency)
  })

  it('grows the biquad pool past the default 8 bands', () => {
    expect(eqPoolSize(12)).toBeGreaterThan(eqPoolSize(8))
    expect(cloneEqBands([defaultEqBandAt(0)])[0]).not.toBe(defaultEqBandAt(0))
  })
})
