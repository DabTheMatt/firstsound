import { describe, expect, it } from 'vitest'
import {
  caretFraction,
  correctSourceHead,
  initialSourceHead,
  loopCopyCount,
  loopProjectSpan,
  markerFraction,
  meterChannelCount,
  resolveLoop,
  sampleAtLaneFraction,
  sourcePositionAt,
  type SourceClock,
} from './sourcePosition'

function clock(patch: Partial<SourceClock> = {}): SourceClock {
  return {
    sourceDuration: 8,
    speed: 1,
    direction: 'forward',
    loop: false,
    loopStart: 0,
    loopEnd: 8,
    ...patch,
  }
}

describe('source position', () => {
  it('maps project time through speed', () => {
    expect(sourcePositionAt(2, clock({ speed: 0.5 }))).toBeCloseTo(1)
    expect(sourcePositionAt(2, clock({ speed: 1 }))).toBeCloseTo(2)
    expect(sourcePositionAt(2, clock({ speed: 2 }))).toBeCloseTo(4)
  })

  it('places those positions at different lane fractions before loop', () => {
    const project = 8
    const a = caretFraction(2, sourcePositionAt(2, clock({ speed: 0.5 })), clock({ speed: 0.5 }), project)
    const b = caretFraction(2, sourcePositionAt(2, clock({ speed: 1 })), clock({ speed: 1 }), project)
    const c = caretFraction(2, sourcePositionAt(2, clock({ speed: 2 })), clock({ speed: 2 }), project)
    expect(a).toBeCloseTo(1 / 8)
    expect(b).toBeCloseTo(2 / 8)
    expect(c).toBeCloseTo(4 / 8)
    expect(a).not.toBeCloseTo(b)
    expect(b).not.toBeCloseTo(c)
  })

  it('plays the file once, then repeats the custom region', () => {
    const region = clock({ sourceDuration: 8, loop: true, loopStart: 2, loopEnd: 6 })
    expect(sourcePositionAt(1, region)).toBeCloseTo(1)
    expect(sourcePositionAt(5, region)).toBeCloseTo(5)
    expect(sourcePositionAt(6, region)).toBeCloseTo(2)
    expect(sourcePositionAt(7, region)).toBeCloseTo(3)
    expect(sourcePositionAt(9, region)).toBeCloseTo(5)
  })

  it('wraps a full-file loop without a gap', () => {
    const loop = clock({ sourceDuration: 3, loop: true, loopStart: 0, loopEnd: 3 })
    expect(sourcePositionAt(0, loop)).toBeCloseTo(0)
    expect(sourcePositionAt(3, loop)).toBeCloseTo(0)
    expect(sourcePositionAt(4, loop)).toBeCloseTo(1)
  })

  it('reverses from the end and wraps inside the loop', () => {
    const reverse = clock({ sourceDuration: 8, direction: 'reverse', loop: true, loopStart: 2, loopEnd: 6 })
    expect(sourcePositionAt(0, reverse)).toBeCloseTo(6)
    expect(sourcePositionAt(1, reverse)).toBeCloseTo(5)
    expect(sourcePositionAt(4, reverse)).toBeCloseTo(6)
  })

  it('ping-pongs across the source instead of looping forward', () => {
    const pp = clock({ sourceDuration: 4, direction: 'pingpong', loop: true, loopStart: 0, loopEnd: 4 })
    expect(sourcePositionAt(1, pp)).toBeCloseTo(1)
    expect(sourcePositionAt(4, pp)).toBeCloseTo(4)
    expect(sourcePositionAt(5, pp)).toBeCloseTo(3)
    expect(sourcePositionAt(8, pp)).toBeCloseTo(0)
  })

  it('scales loop width by speed on the project axis', () => {
    const slow = clock({ sourceDuration: 8, loop: true, loopStart: 0, loopEnd: 4, speed: 0.5 })
    const fast = clock({ sourceDuration: 8, loop: true, loopStart: 0, loopEnd: 4, speed: 2 })
    expect(loopProjectSpan(slow)).toBeCloseTo(8)
    expect(loopProjectSpan(fast)).toBeCloseTo(2)
  })

  it('keeps a partial final copy inside the project', () => {
    const loop = clock({ sourceDuration: 3, loop: true, loopStart: 0, loopEnd: 3, speed: 1 })
    expect(loopCopyCount(loop, 11)).toBe(4)
    const atEnd = sampleAtLaneFraction(1, loop, 11)
    expect(atEnd).toBeGreaterThanOrEqual(0)
    expect(atEnd).toBeLessThanOrEqual(3)
    expect(sampleAtLaneFraction(0.5, loop, 12)).toBeCloseTo(sourcePositionAt(6, loop))
  })

  it('repeats the custom slice after the first boundary', () => {
    const region = clock({ sourceDuration: 8, loop: true, loopStart: 2, loopEnd: 6, speed: 1 })
    const project = 16
    const after = sampleAtLaneFraction(7 / project, region, project)
    expect(after).toBeGreaterThanOrEqual(2)
    expect(after).toBeLessThanOrEqual(6)
  })

  it('steps the same path the closed form describes', () => {
    const region = clock({ sourceDuration: 8, loop: true, loopStart: 2, loopEnd: 6, speed: 2 })
    let state = initialSourceHead(0, region)
    for (let step = 1; step <= 100; step++) {
      const t = step / 20
      state = {
        ...state,
        head: state.head + (1 / 20) * 2 * state.dir,
      }
      const next = correctSourceHead(state, region)
      expect(next).not.toBeNull()
      state = next!
      const expected = sourcePositionAt(t, region)
      const delta = Math.abs(state.head - expected)
      const span = 4
      expect(Math.min(delta, Math.abs(delta - span))).toBeLessThan(0.051)
    }
  })

  it('rejects a crossed or empty loop', () => {
    expect(resolveLoop(clock({ sourceDuration: 8, loopStart: 6, loopEnd: 2 }))).toEqual({
      loopStart: 6,
      loopEnd: 6.05,
    })
    expect(resolveLoop(clock({ sourceDuration: 8, loopStart: -4, loopEnd: 99 })).loopStart).toBe(0)
    expect(resolveLoop(clock({ sourceDuration: 8, loopStart: -4, loopEnd: 99 })).loopEnd).toBe(8)
  })

  it('marks the source end and the loop edges in time, not pixels', () => {
    const region = clock({ sourceDuration: 8, loop: true, loopStart: 2, loopEnd: 6, speed: 2 })
    expect(markerFraction(8, region, 12)).toBeCloseTo((8 / 2) / 12)
    expect(markerFraction(2, region, 12)).toBeCloseTo(1 / 12)
    expect(markerFraction(6, region, 12)).toBeCloseTo(3 / 12)
  })
})

describe('meter channel model', () => {
  it('uses one bar for mono and two for stereo', () => {
    expect(meterChannelCount(1)).toBe(1)
    expect(meterChannelCount(0)).toBe(1)
    expect(meterChannelCount(2)).toBe(2)
  })
})
