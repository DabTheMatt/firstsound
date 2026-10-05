import { describe, expect, it } from 'vitest'
import { addCycleTap, emptyTapCycle, hzFromCycleTaps } from './tapCycle'

const MIN = 0.05
const MAX = 20

describe('tap cycle', () => {
  it('turns the gap between taps into a rate', () => {
    expect(hzFromCycleTaps([0, 0.5], MIN, MAX)).toBe(2)
    expect(hzFromCycleTaps([1, 1.25, 1.5], MIN, MAX)).toBe(4)
  })

  it('needs two taps and ignores intervals outside the LFO range', () => {
    expect(hzFromCycleTaps([0], MIN, MAX)).toBeNull()
    expect(hzFromCycleTaps([0, 0.01], MIN, MAX)).toBeNull()
    expect(hzFromCycleTaps([0, 30], MIN, MAX)).toBeNull()
  })

  it('resets after a long pause and ignores a double event from one press', () => {
    const first = addCycleTap(emptyTapCycle(), 10, MIN, MAX)
    const bounced = addCycleTap(first.state, 10.01, MIN, MAX)
    expect(bounced.state.times).toEqual([10])
    const cycle = addCycleTap(bounced.state, 10.5, MIN, MAX)
    expect(cycle.hz).toBe(2)
    const reset = addCycleTap(cycle.state, 20, MIN, MAX)
    expect(reset.state.times).toEqual([20])
    expect(reset.hz).toBeNull()
  })
})
