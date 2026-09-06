import { describe, expect, it } from 'vitest'
import { makeTanhCurve, saturationDryWet } from './saturation'

describe('makeTanhCurve', () => {
  it('is linear when drive is off', () => {
    const curve = makeTanhCurve(0)
    expect(curve[0]).toBeCloseTo(-1)
    expect(curve[curve.length - 1]).toBeCloseTo(1)
    const mid = curve[Math.floor(curve.length / 2)] ?? 0
    expect(mid).toBeCloseTo(0, 2)
  })

  it('does not boost small signals when drive increases', () => {
    const quiet = 0.05
    const at = (amount: number) => {
      const curve = makeTanhCurve(amount)
      const i = Math.round(((quiet + 1) / 2) * (curve.length - 1))
      return curve[i] ?? 0
    }
    expect(Math.abs(at(1))).toBeLessThanOrEqual(Math.abs(at(0)) + 0.002)
  })
})

describe('saturationDryWet', () => {
  it('stays dry until drive is on, then follows mix', () => {
    expect(saturationDryWet(0, 100)).toEqual({ dry: 1, wet: 0 })
    expect(saturationDryWet(40, 0)).toEqual({ dry: 1, wet: 0 })
    expect(saturationDryWet(40, 100)).toEqual({ dry: 0, wet: 1 })
    const mid = saturationDryWet(40, 50)
    expect(mid.dry).toBeCloseTo(Math.SQRT1_2, 3)
    expect(mid.wet).toBeCloseTo(Math.SQRT1_2, 3)
  })
})
