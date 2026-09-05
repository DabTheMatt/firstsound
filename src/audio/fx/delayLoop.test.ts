import { describe, expect, it } from 'vitest'
import {
  DELAY_FB_CEILING,
  delayFeedbackGains,
  delayInputTapGains,
  delayLoopFilters,
  delayLoopGain,
  delayModSeconds,
  successiveRepeatGains,
} from './delayLoop'

describe('delayLoopGain', () => {
  it('stays strictly below unity so repeats fade', () => {
    expect(delayLoopGain(0)).toBe(0)
    expect(delayLoopGain(35)).toBeCloseTo(0.35)
    expect(delayLoopGain(50)).toBeCloseTo(0.5)
    expect(delayLoopGain(95)).toBeLessThan(1)
    expect(delayLoopGain(95)).toBe(DELAY_FB_CEILING)
    expect(delayLoopGain(200)).toBe(DELAY_FB_CEILING)
  })
})

describe('delayFeedbackGains', () => {
  it('uses independent self-feedback for digital / stereo', () => {
    const g = delayFeedbackGains(40, 'digital', false)
    expect(g.fbL).toBeCloseTo(0.4)
    expect(g.fbR).toBeCloseTo(0.4)
    expect(g.pingToL).toBe(0)
    expect(g.pingToR).toBe(0)
    expect(g.fbL + g.pingToR).toBeCloseTo(0.4)
  })

  it('ping-pong crosses channels without doubling loop energy', () => {
    const g = delayFeedbackGains(48, 'pingPong', false)
    expect(g.fbL).toBe(0)
    expect(g.fbR).toBe(0)
    expect(g.pingToL).toBeCloseTo(0.48)
    expect(g.pingToR).toBeCloseTo(0.48)
    expect(g.pingToL + g.fbL).toBeLessThan(1)
  })

  it('keeps freeze regenerative but decaying', () => {
    const g = delayFeedbackGains(80, 'digital', true)
    expect(g.fbL).toBeGreaterThan(0.9)
    expect(g.fbL).toBeLessThan(1)
  })

  it('splits pitch into the loop instead of adding a second path', () => {
    const g = delayFeedbackGains(50, 'pitch', false, 12)
    expect(g.pitchMix).toBeGreaterThan(0)
    expect(g.fbL + g.pitchMix).toBeCloseTo(0.5)
    expect(g.fbL + g.pitchMix).toBeLessThan(1)
  })
})

describe('successiveRepeatGains', () => {
  it('each echo is quieter than the previous', () => {
    const taps = successiveRepeatGains(35, 8)
    for (let i = 1; i < taps.length; i++) {
      expect(taps[i]!).toBeLessThan(taps[i - 1]!)
    }
    expect(taps[0]!).toBeCloseTo(0.35)
    expect(taps[7]!).toBeLessThan(0.03)
  })
})

describe('delayLoopFilters', () => {
  it('darkens the loop as feedback rises', () => {
    const low = delayLoopFilters(20, 20000, 10, 'digital')
    const high = delayLoopFilters(20, 20000, 80, 'digital')
    expect(high.lp).toBeLessThan(low.lp)
    expect(low.lp).toBeLessThanOrEqual(14000)
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
    expect(delayModSeconds(0.3, 1)).toBeLessThanOrEqual(0.007)
    expect(delayModSeconds(0.3, 0)).toBe(0)
  })
})
