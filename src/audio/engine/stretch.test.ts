import { describe, expect, it } from 'vitest'
import {
  WINDOW_FOLLOW_TAU,
  advanceStretchControl,
  glideTowardLog,
  hannCurve,
  scaledHannCurve,
  smoothTowardLinear,
  smoothTowardLog,
  speedSmoothTau,
  stretchLookahead,
  stretchSchedule,
  stretchSlew,
  stretchWindow,
  type StretchControl,
} from './stretch'

describe('stretchWindow', () => {
  it('uses denser hops at high interpolation', () => {
    const sparse = stretchWindow(0)
    const dense = stretchWindow(100)
    expect(dense.hopSec).toBeLessThan(sparse.hopSec)
    expect(dense.grainSec).toBeLessThan(sparse.grainSec)
    expect(dense.hopSec / dense.grainSec).toBeLessThan(sparse.hopSec / sparse.grainSec)
  })

  it('keeps hops shorter than the grain', () => {
    for (const interp of [0, 35, 62, 100]) {
      const w = stretchWindow(interp)
      expect(w.hopSec).toBeLessThan(w.grainSec)
      expect(w.peak).toBeGreaterThan(0)
      expect(w.peak).toBeLessThanOrEqual(0.62)
    }
  })

  it('lengthens grains when pitching down or slowing so bass can pass', () => {
    const unity = stretchWindow(62, 1, 1)
    const down = stretchWindow(62, 1, 0.5)
    const slow = stretchWindow(62, 0.5, 1)
    expect(down.grainSec).toBeGreaterThan(unity.grainSec * 1.4)
    expect(slow.grainSec).toBeGreaterThan(unity.grainSec * 1.4)
    expect(stretchWindow(62, 2, 2).grainSec).toBeCloseTo(unity.grainSec)
  })
})

describe('stretch smoothing', () => {
  it('eases log speed without overshoot', () => {
    const next = smoothTowardLog(1, 4, 0.25)
    expect(next).toBeGreaterThan(1)
    expect(next).toBeLessThan(4)
  })

  it('eases pitch linearly', () => {
    expect(smoothTowardLinear(0, 12, 0.5)).toBeCloseTo(6)
  })

  it('slows the slew as interpolation densifies', () => {
    expect(stretchSlew(0.01, 100)).toBeLessThan(stretchSlew(0.01, 0))
  })

  it('keeps lookahead at least a couple of hops', () => {
    const hop = stretchWindow(80).hopSec
    expect(stretchLookahead(hop)).toBeGreaterThan(hop * 2)
  })

  it('uses a longer window follow than the speed glide', () => {
    expect(WINDOW_FOLLOW_TAU).toBeGreaterThan(speedSmoothTau(100))
    expect(speedSmoothTau(100)).toBeGreaterThan(speedSmoothTau(0))
  })
})

describe('stretchSchedule', () => {
  it('matches the unity window so 1× playback is unchanged', () => {
    for (const interp of [0, 35, 62, 100]) {
      const unity = stretchWindow(interp, 1, 1)
      const plan = stretchSchedule(interp, 1, 0, 1, 1)
      expect(plan.hopSec).toBeCloseTo(unity.hopSec)
      expect(plan.grainSec).toBeCloseTo(unity.grainSec)
      expect(plan.peak).toBeCloseTo(unity.peak)
    }
  })

  it('keeps the long window once a slow speed has settled', () => {
    const unity = stretchSchedule(62, 1, 0, 1, 1)
    const slow = stretchSchedule(62, 0.05, 0, 0.05, 0.05)
    const down = stretchSchedule(62, 1, -24, 1, 1)
    expect(slow.hopSec).toBeGreaterThan(unity.hopSec * 4)
    expect(slow.grainSec).toBeGreaterThan(unity.grainSec * 4)
    expect(down.grainSec).toBeGreaterThan(unity.grainSec * 2)
    expect(slow.hopSec / slow.grainSec).toBeCloseTo(unity.hopSec / unity.grainSec, 2)
  })

  it('tightens hop and grain together while speed is chasing', () => {
    const settled = stretchSchedule(62, 0.05, 0, 0.05, 0.05)
    const chasing = stretchSchedule(62, 0.05, 0, 1, 0.05)
    expect(chasing.hopSec).toBeLessThan(settled.hopSec * 0.5)
    expect(chasing.hopSec / chasing.grainSec).toBeCloseTo(settled.hopSec / settled.grainSec, 2)
    expect(chasing.peak).toBeCloseTo(settled.peak)
  })
})

describe('speed glide', () => {
  const rest: StretchControl = { speed: 1, pitch: 0, windowSpeed: 1, windowPitch: 0 }

  it('ramps a large jump without overshoot or a one-hop snap', () => {
    let state = { ...rest }
    let prev = state.speed
    const ratios: number[] = []
    for (let i = 0; i < 8; i++) {
      const step = advanceStretchControl(state, 8, 0, 62)
      ratios.push(step.speed / prev)
      expect(step.speed).toBeGreaterThan(prev)
      expect(step.speed).toBeLessThan(8)
      expect(step.sourceAdvance).toBeGreaterThan(0)
      prev = step.speed
      state = step
    }
    expect(Math.max(...ratios)).toBeLessThan(1.55)
  })

  it('reaches a jumped target within a few hundred milliseconds', () => {
    let state = { ...rest, speed: 0.25, windowSpeed: 0.25 }
    let elapsed = 0
    for (let i = 0; i < 40 && state.speed < 3.6; i++) {
      const step = advanceStretchControl(state, 4, 0, 62)
      elapsed += step.hopSec
      state = step
    }
    expect(state.speed).toBeGreaterThan(3.6)
    expect(elapsed).toBeLessThan(0.45)
    expect(elapsed).toBeGreaterThan(0.08)
  })

  it('tracks a moving target from both sides without crossing it', () => {
    let state = { ...rest }
    for (let i = 0; i < 30; i++) {
      const target = 1 + Math.sin(i / 3) * 0.4
      const step = advanceStretchControl(state, target, 0, 40)
      if (target > state.speed) expect(step.speed).toBeLessThanOrEqual(target + 1e-9)
      else expect(step.speed).toBeGreaterThanOrEqual(target - 1e-9)
      state = step
    }
  })

  it('holds a constant speed so source advance stays hop × speed', () => {
    const step = advanceStretchControl({ ...rest, speed: 2, windowSpeed: 2 }, 2, 0, 62)
    expect(step.speed).toBeCloseTo(2)
    expect(step.sourceAdvance).toBeCloseTo(step.hopSec * 2, 5)
    expect(step.readPitch).toBeCloseTo(1, 5)
  })

  it('keeps pitch independent of a speed ramp', () => {
    let state = { ...rest, pitch: 7, windowPitch: 7 }
    const step = advanceStretchControl(state, 0.5, 7, 62)
    expect(step.readPitch).toBeCloseTo(2 ** (7 / 12), 2)
    expect(step.speed).toBeLessThan(1)
    state = step
    const pitched = advanceStretchControl(state, 0.5, 0, 62)
    expect(pitched.pitch).toBeLessThan(7)
    expect(pitched.pitch).toBeGreaterThan(0)
  })

  it('lets the window lag the read-head speed', () => {
    let state = { ...rest }
    for (let i = 0; i < 6; i++) state = advanceStretchControl(state, 0.2, 0, 62)
    expect(state.speed).toBeLessThan(state.windowSpeed)
    expect(state.windowSpeed).toBeLessThan(1)
  })

  it('integrates a log glide between the endpoints', () => {
    const glide = glideTowardLog(1, 4, 0.05, 0.1)
    expect(glide.next).toBeGreaterThan(1)
    expect(glide.next).toBeLessThan(4)
    expect(glide.mean).toBeGreaterThan(1)
    expect(glide.mean).toBeLessThan(glide.next)
  })
})

describe('hannCurve', () => {
  it('starts and ends near silence', () => {
    const curve = hannCurve(32)
    expect(curve[0]).toBeCloseTo(0)
    expect(curve[curve.length - 1]).toBeCloseTo(0)
    expect(Math.max(...curve)).toBeCloseTo(1)
  })

  it('scales peak gain', () => {
    const curve = scaledHannCurve(0.4, 16)
    expect(Math.max(...curve)).toBeCloseTo(0.4)
  })
})
