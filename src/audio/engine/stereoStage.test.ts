import { describe, expect, it } from 'vitest'
import { panNorm, stereoRouteGains } from './stereoStage'

describe('stereoRouteGains', () => {
  it('keeps channels separate in stereo', () => {
    expect(stereoRouteGains(false)).toEqual({
      leftToL: 1,
      leftToR: 0,
      rightToL: 0,
      rightToR: 1,
    })
  })

  it('sums equally when making mono', () => {
    expect(stereoRouteGains(true)).toEqual({
      leftToL: 0.5,
      leftToR: 0.5,
      rightToL: 0.5,
      rightToR: 0.5,
    })
  })
})

describe('panNorm', () => {
  it('maps percent to StereoPanner range', () => {
    expect(panNorm(0)).toBe(0)
    expect(panNorm(-100)).toBe(-1)
    expect(panNorm(50)).toBe(0.5)
    expect(panNorm(200)).toBe(1)
  })
})
