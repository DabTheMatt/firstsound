import { describe, expect, it } from 'vitest'
import {
  angleToTime,
  regionArcDash,
  timeToFraction,
  wheelToNormalized,
  wheelToTimeDelta,
} from './scrub'

describe('scrub ring', () => {
  it('maps 12 o\'clock to the start of the sample and a full turn to the end', () => {
    expect(angleToTime(0, 10)).toBe(0)
    expect(angleToTime(Math.PI, 10)).toBeCloseTo(5)
    expect(angleToTime(Math.PI * 2, 10)).toBeCloseTo(10)
  })

  it('maps playhead time onto the full recording', () => {
    expect(timeToFraction(0, 8)).toBe(0)
    expect(timeToFraction(2, 8)).toBe(0.25)
    expect(timeToFraction(8, 8)).toBe(1)
    expect(timeToFraction(12, 8)).toBe(1)
  })

  it('draws the selection as an arc over the full-sample ring', () => {
    const circ = 100
    const dash = regionArcDash(2, 6, 10, circ)
    expect(dash.dashArray).toBe('40 100')
    expect(dash.dashOffset).toBe(-20)
  })

  it('increases on wheel-up and moves faster with Shift', () => {
    const normal = wheelToNormalized(100, false)
    const fast = wheelToNormalized(100, true)
    expect(normal).toBeLessThan(0)
    expect(fast).toBeLessThan(normal)
    expect(wheelToTimeDelta(-100, false, 10)).toBeGreaterThan(0)
    expect(wheelToTimeDelta(-100, true, 10)).toBeGreaterThan(
      wheelToTimeDelta(-100, false, 10),
    )
  })
})
