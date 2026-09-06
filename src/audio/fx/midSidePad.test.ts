import { describe, expect, it } from 'vitest'
import { PARAMS } from '../parameters/definitions'
import { midSideFromPad, padFromMidSide } from './midSidePad'

describe('mid/side stereo pad', () => {
  it('puts default width and balance in the center', () => {
    expect(padFromMidSide(PARAMS.msWidth.defaultValue, PARAMS.msBalance.defaultValue)).toEqual({
      x: 0.5,
      y: 0.5,
    })
  })

  it('maps width onto the horizontal axis, matching Side on the goniometer', () => {
    expect(padFromMidSide(0, 0).x).toBe(0)
    expect(padFromMidSide(200, 0).x).toBe(1)
  })

  it('maps mid-only balance to the top and side-only to the bottom', () => {
    expect(padFromMidSide(100, -100).y).toBe(1)
    expect(padFromMidSide(100, 100).y).toBe(0)
  })

  it('round-trips pad coordinates into width and balance', () => {
    expect(midSideFromPad(0, 0.5)).toEqual({ msWidth: 0, msBalance: 0 })
    expect(midSideFromPad(1, 1).msWidth).toBe(200)
    expect(midSideFromPad(0.5, 1).msBalance).toBe(-100)
    expect(midSideFromPad(0.5, 0).msBalance).toBe(100)
  })
})
