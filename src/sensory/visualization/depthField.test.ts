import { describe, expect, it } from 'vitest'
import {
  advanceDepthClock,
  approachMotionGain,
  depthTravelers,
  energyFromFrequency,
  MOTION_IDLE,
  motionTarget,
  perspectiveFrame,
  stillDepthTravelers,
  transientAmount,
} from './depthField'

describe('approachMotionGain', () => {
  it('eases down on pause instead of freezing at once', () => {
    let gain = 1
    for (let i = 0; i < 4; i++) gain = approachMotionGain(gain, false, 50, false)
    expect(gain).toBeGreaterThan(0.55)
    expect(gain).toBeLessThan(0.95)
    for (let i = 0; i < 40; i++) gain = approachMotionGain(gain, false, 50, false)
    expect(gain).toBeLessThan(0.12)
    expect(gain).toBeGreaterThan(MOTION_IDLE * 0.5)
  })

  it('eases up on resume instead of jumping to full speed', () => {
    let gain = MOTION_IDLE
    for (let i = 0; i < 3; i++) gain = approachMotionGain(gain, true, 40, false)
    expect(gain).toBeGreaterThan(MOTION_IDLE)
    expect(gain).toBeLessThan(0.55)
    for (let i = 0; i < 40; i++) gain = approachMotionGain(gain, true, 40, false)
    expect(gain).toBeGreaterThan(0.85)
  })

  it('slows without freezing when motion is reduced', () => {
    expect(motionTarget(true, true)).toBeGreaterThan(0.04)
    expect(motionTarget(true, true)).toBeLessThan(0.3)
    let gain = 0.8
    for (let i = 0; i < 40; i++) gain = approachMotionGain(gain, true, 80, true)
    expect(gain).toBeLessThan(0.28)
    expect(gain).toBeGreaterThan(0.04)
  })
})

describe('depthTravelers', () => {
  it('keeps distant strings smaller than ones approaching the viewer', () => {
    const far = depthTravelers(0.02, 1)[0]
    const mid = depthTravelers(0.48, 1).find((row) => row.phase > 0.4 && row.phase < 0.7)
    expect(far).toBeTruthy()
    expect(mid).toBeTruthy()
    expect(mid!.scale).toBeGreaterThan(far!.scale)
    expect(mid!.lift).toBeLessThan(far!.lift)
  })

  it('fades strings as they pass', () => {
    let passing: { alpha: number } | null = null
    let body: { alpha: number } | null = null
    for (let clock = 0; clock < 3; clock += 0.02) {
      for (const row of depthTravelers(clock, 1)) {
        if (row.phase > 0.9) passing = row
        if (row.phase > 0.4 && row.phase < 0.55) body = row
      }
    }
    expect(passing).toBeTruthy()
    expect(body).toBeTruthy()
    expect(passing!.alpha).toBeLessThan(body!.alpha)
  })

  it('draws several layers and quiets them when playback energy is gone', () => {
    const moving = depthTravelers(0.2, 1)
    const idle = depthTravelers(0.2, MOTION_IDLE)
    expect(moving.length).toBeGreaterThan(2)
    expect(idle[0]!.alpha).toBeLessThan(moving[0]!.alpha)
  })

  it('holds still layers without a clock when motion is reduced', () => {
    const a = stillDepthTravelers()
    const b = stillDepthTravelers()
    expect(a.map((row) => row.phase)).toEqual(b.map((row) => row.phase))
    expect(a.length).toBeGreaterThan(1)
    const far = a.find((row) => row.z < 0.2)
    const near = a.find((row) => row.z > 0.65)
    expect(far).toBeTruthy()
    expect(near).toBeTruthy()
    expect(near!.span).toBeGreaterThan(far!.span * 2)
  })

  it('keeps far, mid, and near structures in view together', () => {
    const rows = depthTravelers(0.12, 1)
    const far = rows.find((row) => row.z < 0.22)
    const mid = rows.find((row) => row.z > 0.4 && row.z < 0.62)
    const near = rows.find((row) => row.z > 0.7)
    expect(far).toBeTruthy()
    expect(mid).toBeTruthy()
    expect(near).toBeTruthy()
    expect(near!.span).toBeGreaterThan(far!.span * 2.4)
    expect(near!.scale).toBeGreaterThan(far!.scale * 3)
    expect(mid!.span).toBeGreaterThan(far!.span)
    expect(mid!.span).toBeLessThan(near!.span)
    expect(Math.max(...rows.map((row) => Math.abs(row.parallax)))).toBeGreaterThan(0.01)
  })

  it('shrinks parallax when motion is reduced', () => {
    const full = depthTravelers(0.2, 1, undefined, undefined, false)
    const calm = depthTravelers(0.2, 1, undefined, undefined, true)
    const peak = (list: { parallax: number }[]) => Math.max(...list.map((row) => Math.abs(row.parallax)))
    expect(peak(calm)).toBeLessThan(peak(full))
  })
})

describe('perspectiveFrame', () => {
  it('puts the foreground at full size and the horizon much smaller', () => {
    const near = perspectiveFrame(0)
    const far = perspectiveFrame(0.92)
    expect(near.span).toBeGreaterThan(0.95)
    expect(near.horizon).toBeLessThan(0.05)
    expect(far.span).toBeLessThan(0.4)
    expect(far.amplitude).toBeLessThan(near.amplitude * 0.4)
    expect(far.horizon).toBeGreaterThan(0.6)
  })
})

describe('advanceDepthClock', () => {
  it('stops when motion is zero and nudges forward on a transient', () => {
    expect(advanceDepthClock(1.2, 0.5, 0)).toBeCloseTo(1.2)
    const calm = advanceDepthClock(0, 0.2, 1, { bass: 0, high: 0, transient: 0 })
    const hit = advanceDepthClock(0, 0.2, 1, { bass: 0, high: 0, transient: 1 })
    const bass = advanceDepthClock(0, 0.5, 1, { bass: 1, high: 0, transient: 0 })
    const open = advanceDepthClock(0, 0.5, 1, { bass: 0, high: 0, transient: 0 })
    expect(hit).toBeGreaterThan(calm)
    expect(bass).toBeLessThan(open)
    const quiet = advanceDepthClock(0, 0.4, 1, { bass: 0, high: 0, transient: 0, level: 0 })
    const loud = advanceDepthClock(0, 0.4, 1, { bass: 0, high: 0, transient: 0, level: 1 })
    const dark = advanceDepthClock(0, 0.5, 1, { bass: 0, high: 0, transient: 0 }, { light: -1, space: 0.85 })
    const lit = advanceDepthClock(0, 0.5, 1, { bass: 0, high: 0, transient: 0 }, { light: 1, space: 0.15 })
    expect(loud).toBeGreaterThan(quiet)
    expect(lit).toBeGreaterThan(dark)
  })
})

describe('energyFromFrequency', () => {
  it('reads bass and highs from separate bands', () => {
    const bins = new Uint8Array(512)
    const rate = 48000
    const fft = 1024
    const binHz = rate / fft
    for (let i = 0; i < bins.length; i++) {
      const hz = i * binHz
      if (hz < 120) bins[i] = 220
      if (hz > 6000 && hz < 10000) bins[i] = 40
    }
    const low = energyFromFrequency(bins, rate, fft)
    expect(low.bass).toBeGreaterThan(low.high)
    bins.fill(0)
    for (let i = 0; i < bins.length; i++) {
      const hz = i * binHz
      if (hz > 6000 && hz < 10000) bins[i] = 230
    }
    const bright = energyFromFrequency(bins, rate, fft)
    expect(bright.high).toBeGreaterThan(bright.bass)
    expect(bright.high).toBeGreaterThan(low.high)
  })

  it('treats a level jump as a transient and ignores a fall', () => {
    expect(transientAmount(0.1, 0.4)).toBeGreaterThan(0.5)
    expect(transientAmount(0.4, 0.1)).toBe(0)
  })
})
