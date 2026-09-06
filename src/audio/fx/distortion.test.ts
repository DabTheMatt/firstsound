import { describe, expect, it } from 'vitest'
import {
  bitReduceSample,
  distortionDryWet,
  makeDistortionCurve,
  makeTanhCurve,
  processDistortionBuffer,
  saturationDryWet,
  shapeSample,
  defaultDistortionProcState,
} from './distortion'
import { allDistortionTypes, distortionTypeColorPatch } from './distortionProfiles'
import { DISTORTION_TYPES, parseDistortionType } from './types'

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

describe('distortion types', () => {
  it('parses known types and lists every recipe', () => {
    expect(parseDistortionType('tube')).toBe('tube')
    expect(parseDistortionType('phaser')).toBeNull()
    expect(allDistortionTypes()).toEqual(DISTORTION_TYPES.map((t) => t.value))
  })

  it('tube is asymmetric while saturation is odd', () => {
    const pos = shapeSample(0.25, 'tube', 0.55, 0.5)
    const neg = shapeSample(-0.25, 'tube', 0.55, 0.5)
    expect(Math.abs(pos)).not.toBeCloseTo(Math.abs(neg), 3)
    const satPos = shapeSample(0.4, 'saturation', 0.8, 0.5)
    const satNeg = shapeSample(-0.4, 'saturation', 0.8, 0.5)
    expect(satPos).toBeCloseTo(-satNeg, 5)
  })

  it('bitcrush type color drops bits without touching mix', () => {
    const patch = distortionTypeColorPatch('bitcrush')
    expect(patch.distortionBits).toBe(8)
    expect(patch.saturation).toBeUndefined()
    expect(patch.saturationMix).toBeUndefined()
  })

  it('noise mix engages even with drive off', () => {
    expect(distortionDryWet('noise', 0, 100, 16, 1, 40).wet).toBe(1)
    expect(distortionDryWet('saturation', 0, 100, 16, 1, 0).wet).toBe(0)
  })
})

describe('bitReduceSample', () => {
  it('passes 16-bit audio through', () => {
    expect(bitReduceSample(0.33, 16)).toBeCloseTo(0.33)
  })

  it('snaps 2-bit audio to coarse levels', () => {
    expect(bitReduceSample(0.9, 2)).toBe(1)
    expect(bitReduceSample(0.2, 2)).toBe(0)
    expect(bitReduceSample(-0.9, 2)).toBe(-1)
  })
})

describe('processDistortionBuffer', () => {
  it('holds samples when rate is 4', () => {
    const input = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8])
    const outL = new Float32Array(8)
    const outR = new Float32Array(8)
    const state = defaultDistortionProcState()
    state.hold = 4
    processDistortionBuffer(input, input, outL, outR, state)
    expect(outL[0]).toBeCloseTo(0.1)
    expect(outL[3]).toBeCloseTo(0.1)
    expect(outL[4]).toBeCloseTo(0.5)
    expect(outL[7]).toBeCloseTo(0.5)
  })
})

describe('makeDistortionCurve', () => {
  it('hard-clips digital drive', () => {
    const curve = makeDistortionCurve('clip', 1, 0.5)
    expect(curve[0]).toBeCloseTo(-1)
    expect(curve[curve.length - 1]).toBeCloseTo(1)
    const loud = curve[Math.round(0.9 * (curve.length - 1))] ?? 0
    expect(Math.abs(loud)).toBeCloseTo(1)
  })
})
