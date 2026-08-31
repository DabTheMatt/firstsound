import { describe, expect, it } from 'vitest'
import { motionValue } from './motion'

describe('motionValue', () => {
  it('returns 0 when depth is 0', () => {
    expect(motionValue(0, 1, 50, 0.5, 0.25)).toBe(0)
  })

  it('is a pure sine sweep with no jitter', () => {
    // rate 0.25 Hz at t=1s -> sin(pi/2) = 1, so value = depth (0.6)
    expect(motionValue(60, 0.25, 0, 0.5, 1)).toBeCloseTo(0.6, 6)
  })

  it('follows the random walk fully at max jitter', () => {
    expect(motionValue(80, 2, 100, -0.5, 0.13)).toBeCloseTo(0.8 * -0.5, 6)
  })

  it('stays within +/- depth', () => {
    const v = motionValue(50, 3, 60, 1, 0.37)
    expect(Math.abs(v)).toBeLessThanOrEqual(0.5 + 1e-9)
  })
})
