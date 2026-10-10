import { describe, expect, it } from 'vitest'
import {
  GRAIN_OVERLAP_DEFAULT,
  GRAIN_OVERLAP_MAX,
  GRAIN_OVERLAP_MIN,
  WINDOW_FOLLOW_TAU,
  advanceStretchControl,
  glideTowardLog,
  grainHopRatio,
  hannCurve,
  scaledHannCurve,
  smoothTowardLinear,
  smoothTowardLog,
  speedSmoothTau,
  audibleStretchTime,
  containStretchTime,
  stretchLookahead,
  stretchSchedule,
  stretchSlew,
  stretchWindow,
  type StretchControl,
} from './stretch'

describe('stretchWindow', () => {
  it('uses denser hops at high grain overlap', () => {
    const sparse = stretchWindow(GRAIN_OVERLAP_MIN)
    const dense = stretchWindow(GRAIN_OVERLAP_MAX)
    expect(dense.hopSec).toBeLessThan(sparse.hopSec)
    expect(dense.grainSec).toBeLessThan(sparse.grainSec)
    expect(dense.hopSec / dense.grainSec).toBeLessThan(sparse.hopSec / sparse.grainSec)
  })

  it('keeps every overlap above a half grain so the windows do not gap', () => {
    for (const overlap of [GRAIN_OVERLAP_MIN, 64, GRAIN_OVERLAP_DEFAULT, GRAIN_OVERLAP_MAX]) {
      const w = stretchWindow(overlap)
      expect(w.hopSec / w.grainSec).toBeCloseTo(grainHopRatio(overlap), 3)
      expect(w.hopSec).toBeLessThan(w.grainSec * 0.5)
      expect(w.peak).toBeGreaterThan(0)
      expect(w.peak).toBeLessThanOrEqual(0.62)
    }
  })

  it('lengthens grains when pitching down or slowing so bass can pass', () => {
    const unity = stretchWindow(GRAIN_OVERLAP_DEFAULT, 1, 1)
    const down = stretchWindow(GRAIN_OVERLAP_DEFAULT, 1, 0.5)
    const slow = stretchWindow(GRAIN_OVERLAP_DEFAULT, 0.5, 1)
    expect(down.grainSec).toBeGreaterThan(unity.grainSec * 1.4)
    expect(slow.grainSec).toBeGreaterThan(unity.grainSec * 1.4)
    expect(stretchWindow(GRAIN_OVERLAP_DEFAULT, 2, 2).grainSec).toBeCloseTo(unity.grainSec)
    expect(slow.hopSec / slow.grainSec).toBeCloseTo(unity.hopSec / unity.grainSec, 3)
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

  it('slows the slew as grain overlap densifies', () => {
    expect(stretchSlew(0.01, GRAIN_OVERLAP_MAX)).toBeLessThan(stretchSlew(0.01, GRAIN_OVERLAP_MIN))
  })

  it('keeps lookahead at least a couple of hops', () => {
    const hop = stretchWindow(GRAIN_OVERLAP_DEFAULT).hopSec
    expect(stretchLookahead(hop)).toBeGreaterThan(hop * 2)
  })

  it('uses a longer window follow than the speed glide', () => {
    expect(WINDOW_FOLLOW_TAU).toBeGreaterThan(speedSmoothTau(GRAIN_OVERLAP_MAX))
    expect(speedSmoothTau(GRAIN_OVERLAP_MAX)).toBeGreaterThan(speedSmoothTau(GRAIN_OVERLAP_MIN))
  })
})

describe('stretchSchedule', () => {
  it('matches the unity window so 1× playback is unchanged', () => {
    for (const overlap of [GRAIN_OVERLAP_MIN, 64, GRAIN_OVERLAP_DEFAULT, GRAIN_OVERLAP_MAX]) {
      const unity = stretchWindow(overlap, 1, 1)
      const plan = stretchSchedule(overlap, 1, 0, 1, 1)
      expect(plan.hopSec).toBeCloseTo(unity.hopSec)
      expect(plan.grainSec).toBeCloseTo(unity.grainSec)
      expect(plan.peak).toBeCloseTo(unity.peak)
    }
  })

  it('keeps the long window once a slow speed has settled', () => {
    const unity = stretchSchedule(GRAIN_OVERLAP_DEFAULT, 1, 0, 1, 1)
    const slow = stretchSchedule(GRAIN_OVERLAP_DEFAULT, 0.05, 0, 0.05, 0.05)
    const down = stretchSchedule(GRAIN_OVERLAP_DEFAULT, 1, -24, 1, 1)
    expect(slow.hopSec).toBeGreaterThan(unity.hopSec * 4)
    expect(slow.grainSec).toBeGreaterThan(unity.grainSec * 4)
    expect(down.grainSec).toBeGreaterThan(unity.grainSec * 2)
    expect(slow.hopSec / slow.grainSec).toBeCloseTo(unity.hopSec / unity.grainSec, 2)
  })

  it('tightens hop and grain together while pitch is chasing', () => {
    const settled = stretchSchedule(GRAIN_OVERLAP_DEFAULT, 1, 0, 1, 1, 0, 0)
    const chasing = stretchSchedule(GRAIN_OVERLAP_DEFAULT, 1, 0, 1, 1, 0, 18)
    expect(chasing.hopSec).toBeLessThan(settled.hopSec * 0.75)
    expect(chasing.hopSec / chasing.grainSec).toBeCloseTo(settled.hopSec / settled.grainSec, 2)
    expect(chasing.peak).toBeCloseTo(settled.peak)
  })

  it('tightens hop and grain together while speed is chasing', () => {
    const settled = stretchSchedule(GRAIN_OVERLAP_DEFAULT, 0.05, 0, 0.05, 0.05)
    const chasing = stretchSchedule(GRAIN_OVERLAP_DEFAULT, 0.05, 0, 1, 0.05)
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
      const step = advanceStretchControl(state, 8, 0, GRAIN_OVERLAP_DEFAULT)
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
    // A pitch/speed chase uses 8 ms hops, so the same glide needs more steps.
    for (let i = 0; i < 80 && state.speed < 3.6; i++) {
      const step = advanceStretchControl(state, 4, 0, GRAIN_OVERLAP_DEFAULT)
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
      const step = advanceStretchControl(state, target, 0, 64)
      if (target > state.speed) expect(step.speed).toBeLessThanOrEqual(target + 1e-9)
      else expect(step.speed).toBeGreaterThanOrEqual(target - 1e-9)
      state = step
    }
  })

  it('holds a constant speed so source advance stays hop × speed', () => {
    const step = advanceStretchControl({ ...rest, speed: 2, windowSpeed: 2 }, 2, 0, GRAIN_OVERLAP_DEFAULT)
    expect(step.speed).toBeCloseTo(2)
    expect(step.sourceAdvance).toBeCloseTo(step.hopSec * 2, 5)
    expect(step.readPitch).toBeCloseTo(1, 5)
  })

  it('keeps pitch independent of a speed ramp', () => {
    let state = { ...rest, pitch: 7, windowPitch: 7 }
    const step = advanceStretchControl(state, 0.5, 7, GRAIN_OVERLAP_DEFAULT)
    expect(step.readPitch).toBeCloseTo(2 ** (7 / 12), 2)
    expect(step.speed).toBeLessThan(1)
    state = step
    const pitched = advanceStretchControl(state, 0.5, 0, GRAIN_OVERLAP_DEFAULT)
    expect(pitched.pitch).toBeLessThan(7)
    expect(pitched.pitch).toBeGreaterThan(0)
  })

  it('lets the window lag the read-head speed', () => {
    let state = { ...rest }
    for (let i = 0; i < 6; i++) state = advanceStretchControl(state, 0.2, 0, GRAIN_OVERLAP_DEFAULT)
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

describe('audibleStretchTime', () => {
  const grain = (
    startWhen: number,
    origin: number,
    grainSec = 0.08,
    speed = 1,
    dir = 1,
  ) => ({ startWhen, grainSec, origin, speed, dir })

  it('stays on the peaking grain when lookahead has already wrapped the loop', () => {
    const now = 0.05
    const grains = [
      grain(0, 1.92),
      grain(0.02, 1.94),
      grain(0.04, 1.96),
      grain(0.06, 0.0),
      grain(0.08, 0.02),
    ]
    expect(audibleStretchTime(grains, now, 0)).toBeCloseTo(1.96)
  })

  it('ignores a grain that has started but has not peaked yet', () => {
    const grains = [grain(0, 1.9), grain(0.02, 0.0)]
    expect(audibleStretchTime(grains, 0.03, 9)).toBeCloseTo(1.93)
  })

  it('uses the earliest started grain before any window has peaked', () => {
    const grains = [grain(0, 0.4), grain(0.02, 0.42), grain(0.08, 0.5)]
    expect(audibleStretchTime(grains, 0.01, 9)).toBeCloseTo(0.41)
  })

  it('falls back when every grain is still in the future', () => {
    expect(audibleStretchTime([grain(0.1, 0.2)], 0.0, 0.4)).toBeCloseTo(0.4)
  })

  it('contains a loop wrap without leaving the region', () => {
    expect(containStretchTime(2.02, 0, 2, true, false)).toBeCloseTo(0.02)
    expect(containStretchTime(1.96, 0, 2, true, false)).toBeCloseTo(1.96)
    expect(containStretchTime(2.02, 0, 2, false, false)).toBeCloseTo(2)
  })
})
