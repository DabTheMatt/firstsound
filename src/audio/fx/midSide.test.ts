import { describe, expect, it } from 'vitest'
import { PARAMS } from '../parameters/definitions'
import type { ParamId } from '../parameters/types'
import {
  MS_EQ_LOW_HZ,
  msBalanceGains,
  msCrossfeedMix,
  msEqGainDb,
  msEqHz,
  msEqQ,
  msHaasDelayLeft,
  msLevelGain,
  msRotateMatrix,
  msSideHpfHz,
  msSoloGains,
  msTiltGains,
  msWidthGain,
  stereoCorrelation,
} from './midSide'
import { randomizeMidSide, resetMidSidePatch } from './midSidePresets'

describe('mid/side math', () => {
  it('maps width 0/100/200 onto side gain', () => {
    expect(msWidthGain(0)).toBe(0)
    expect(msWidthGain(100)).toBe(1)
    expect(msWidthGain(200)).toBe(2)
  })

  it('reaches mid-only and side-only at the balance extremes', () => {
    expect(msBalanceGains(0)).toEqual({ mid: 1, side: 1 })
    expect(msBalanceGains(-100)).toEqual({ mid: 1, side: 0 })
    expect(msBalanceGains(100)).toEqual({ mid: 0, side: 1 })
  })

  it('mutes mid/side gain at the floor', () => {
    expect(msLevelGain(PARAMS.msMidGain.min)).toBe(0)
    expect(msLevelGain(0)).toBeCloseTo(1)
    expect(msLevelGain(6)).toBeCloseTo(10 ** (6 / 20))
  })

  it('treats side HPF below 20 Hz as off', () => {
    expect(msSideHpfHz(0)).toBeNull()
    expect(msSideHpfHz(19)).toBeNull()
    expect(msSideHpfHz(20)).toBe(20)
    expect(msSideHpfHz(400)).toBe(400)
  })

  it('tilts dark left and bright right', () => {
    expect(msTiltGains(-100).lowDb).toBeGreaterThan(0)
    expect(msTiltGains(-100).highDb).toBeLessThan(0)
    expect(msTiltGains(100).lowDb).toBeLessThan(0)
    expect(msTiltGains(0).lowDb).toBeCloseTo(0)
    expect(msTiltGains(0).highDb).toBeCloseTo(0)
  })

  it('rotates 90 degrees into a channel swap with polarity', () => {
    const r = msRotateMatrix(100)
    expect(r.ll).toBeCloseTo(0)
    expect(r.lr).toBeCloseTo(-1)
    expect(r.rl).toBeCloseTo(1)
    expect(r.rr).toBeCloseTo(0)
    const z = msRotateMatrix(0)
    expect(z.ll).toBeCloseTo(1)
    expect(z.lr).toBeCloseTo(0)
    expect(z.rl).toBeCloseTo(0)
    expect(z.rr).toBeCloseTo(1)
  })

  it('folds to equal mix at full crossfeed', () => {
    expect(msCrossfeedMix(0)).toEqual({ keep: 1, cross: 0 })
    expect(msCrossfeedMix(100)).toEqual({ keep: 0.5, cross: 0.5 })
  })

  it('solos mid or side independently', () => {
    expect(msSoloGains(1, 0)).toEqual({ mid: 1, side: 0 })
    expect(msSoloGains(0, 1)).toEqual({ mid: 0, side: 1 })
    expect(msSoloGains(0, 0)).toEqual({ mid: 1, side: 1 })
  })

  it('treats delaying the left channel when direction is L', () => {
    expect(msHaasDelayLeft(0)).toBe(true)
    expect(msHaasDelayLeft(1)).toBe(false)
  })

  it('reports correlation of mono as +1 and anti-phase as -1', () => {
    const a = [0.2, -0.1, 0.4, -0.3]
    expect(stereoCorrelation(a, a)).toBeCloseTo(1)
    expect(stereoCorrelation(a, a.map((v) => -v))).toBeCloseTo(-1)
    expect(stereoCorrelation([1, 0, 1, 0], [0, 1, 0, 1])).toBeCloseTo(0)
  })

  it('clamps mid/side EQ gain, frequency, and Q', () => {
    expect(msEqGainDb(3)).toBe(3)
    expect(msEqGainDb(40)).toBe(18)
    expect(msEqGainDb(-40)).toBe(-18)
    expect(msEqHz(120, MS_EQ_LOW_HZ)).toBe(120)
    expect(msEqHz(10, MS_EQ_LOW_HZ)).toBe(20)
    expect(msEqQ(0.1)).toBe(0.3)
    expect(msEqQ(12)).toBe(8)
  })
})

describe('mid/side randomize', () => {
  it('keeps randomized values inside parameter ranges', () => {
    const { params } = randomizeMidSide(0.42)
    for (const [id, value] of Object.entries(params)) {
      const def = PARAMS[id as ParamId]
      expect(value).toBeGreaterThanOrEqual(def.min)
      expect(value).toBeLessThanOrEqual(def.max)
    }
  })

  it('resets every mid/side control to defaults', () => {
    const patch = resetMidSidePatch()
    expect(patch.msWidth).toBe(100)
    expect(patch.msBalance).toBe(0)
    expect(patch.msHaasAmount).toBe(0)
    expect(patch.msMono).toBe(0)
    expect(patch.msMidLowGain).toBe(0)
    expect(patch.msSideHpf).toBe(0)
  })
})
