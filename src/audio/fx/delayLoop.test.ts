import { describe, expect, it } from 'vitest'
import {
  DELAY_FB_CEILING,
  delayFeedbackGains,
  delayInputTapGains,
  delayLoopFilters,
  delayLoopGain,
  delayModSeconds,
  loopHopEnergy,
  successiveRepeatGains,
} from './delayLoop'
import { allDelayTypes, delayTypeColorPatch, delayTypeProfile } from './delayProfiles'
import { DELAY_TYPES } from './types'

describe('delayLoopGain', () => {
  it('stays strictly below unity so repeats fade', () => {
    expect(delayLoopGain(0)).toBe(0)
    expect(delayLoopGain(35, 'digital')).toBeLessThan(0.35)
    expect(delayLoopGain(50, 'digital')).toBeLessThan(0.45)
    expect(delayLoopGain(95, 'digital')).toBeLessThan(1)
    expect(delayLoopGain(95, 'digital')).toBeLessThanOrEqual(DELAY_FB_CEILING)
    expect(delayLoopGain(200, 'analog')).toBe(DELAY_FB_CEILING)
  })
})

describe('delayFeedbackGains', () => {
  it('lets L and R use different feedback', () => {
    const g = delayFeedbackGains(20, 'digital', false, 0, 60)
    expect(g.fbR).toBeGreaterThan(g.fbL)
    expect(g.fbL + g.pitchMix).toBeLessThan(1)
    expect(g.fbR + g.pitchMix).toBeLessThan(1)
  })

  it('uses independent self-feedback for digital / stereo', () => {
    const g = delayFeedbackGains(40, 'digital', false)
    expect(g.fbL).toBeGreaterThan(0)
    expect(g.fbR).toBe(g.fbL)
    expect(g.pingToL).toBe(0)
    expect(g.pingToR).toBe(0)
    expect(g.fbL + g.pingToR).toBeLessThan(1)
  })

  it('ping-pong crosses channels without doubling loop energy', () => {
    const g = delayFeedbackGains(48, 'pingPong', false)
    expect(g.fbL).toBe(0)
    expect(g.fbR).toBe(0)
    expect(g.pingToL).toBeGreaterThan(0)
    expect(g.pingToR).toBe(g.pingToL)
    expect(g.pingToL + g.fbL).toBeLessThan(1)
  })

  it('keeps freeze regenerative but decaying', () => {
    const g = delayFeedbackGains(80, 'digital', true)
    expect(g.fbL).toBeGreaterThan(0.7)
    expect(g.fbL).toBeLessThan(1)
  })

  it('splits pitch into the loop instead of adding a second path', () => {
    const g = delayFeedbackGains(50, 'pitch', false, 12)
    expect(g.pitchMix).toBeGreaterThan(0)
    expect(g.fbL + g.pitchMix).toBeLessThan(1)
    expect(g.fbL + g.pitchMix).toBeCloseTo(delayLoopGain(50, 'pitch'))
  })
})

describe('all delay types stay stable', () => {
  it('never lets a hop exceed unity, including analog / tape / digital', () => {
    for (const type of allDelayTypes()) {
      for (const fb of [0, 28, 35, 50, 80, 95]) {
        const energy = loopHopEnergy(fb, type)
        expect(energy, `${type} @ ${fb}%`).toBeLessThan(1)
        expect(energy, `${type} @ ${fb}%`).toBeLessThanOrEqual(DELAY_FB_CEILING + 1e-9)
      }
    }
  })

  it('uses non-resonant loop filters', () => {
    for (const type of allDelayTypes()) {
      const loop = delayLoopFilters(20, 20000, 40, type)
      expect(loop.q, type).toBeLessThanOrEqual(0.5)
      expect(loop.lp, type).toBeLessThanOrEqual(delayTypeProfile(type).loopLpMax)
      expect(loop.hp, type).toBeGreaterThanOrEqual(delayTypeProfile(type).loopHpMin)
    }
  })

  it('covers every UI delay type with a color recipe', () => {
    expect(allDelayTypes()).toEqual(DELAY_TYPES.map((t) => t.value))
    for (const type of allDelayTypes()) {
      const patch = delayTypeColorPatch(type)
      expect(patch.delayLp).toBeLessThanOrEqual(10000)
      expect(patch.delayDrive).toBeLessThan(20)
    }
    expect(delayTypeColorPatch('digital').delayDrive).toBe(0)
    expect(delayTypeColorPatch('analog').delayLp).toBeLessThan(5000)
    expect(delayTypeColorPatch('tape').delayWow).toBeGreaterThan(0)
  })
})

describe('successiveRepeatGains', () => {
  it('each echo is quieter than the previous', () => {
    for (const type of ['digital', 'analog', 'tape'] as const) {
      const taps = successiveRepeatGains(35, 8, type)
      for (let i = 1; i < taps.length; i++) {
        expect(taps[i]!).toBeLessThan(taps[i - 1]!)
      }
      expect(taps[0]!).toBeLessThan(0.32)
      expect(taps[7]!).toBeLessThan(0.02)
    }
  })
})

describe('delayLoopFilters', () => {
  it('darkens the loop as feedback rises', () => {
    const low = delayLoopFilters(20, 20000, 10, 'digital')
    const high = delayLoopFilters(20, 20000, 80, 'digital')
    expect(high.lp).toBeLessThan(low.lp)
    expect(low.lp).toBeLessThanOrEqual(10000)
  })

  it('keeps analog delays darker than digital', () => {
    const analog = delayLoopFilters(20, 20000, 40, 'analog')
    const digital = delayLoopFilters(20, 20000, 40, 'digital')
    expect(analog.lp).toBeLessThan(digital.lp)
    expect(analog.hp).toBeGreaterThan(digital.hp)
  })
})

describe('delayInputTapGains', () => {
  it('only adds extra taps for multi-tap and diffuse', () => {
    expect(delayInputTapGains('digital')).toEqual({ tapA: 0, tapB: 0 })
    expect(delayInputTapGains('multiTap').tapA).toBeGreaterThan(0)
    expect(delayInputTapGains('multiTap').tapA).toBeLessThan(0.5)
  })
})

describe('delayModSeconds', () => {
  it('stays in a chorus-sized window even at 100% depth', () => {
    expect(delayModSeconds(0.3, 1)).toBeLessThanOrEqual(0.005)
    expect(delayModSeconds(0.3, 0)).toBe(0)
  })
})
