import { describe, expect, it } from 'vitest'
import { defaultParamValues, PARAMS } from '../parameters/definitions'
import { toNormalized } from '../parameters/mapping'
import {
  applyFxLfos,
  defaultFxLfos,
  defaultLfoHold,
  isFxLfoTarget,
  lfoPhase,
  lfoRangeNormalized,
  lfoWave,
  modulateParam,
  parseFxLfos,
} from './lfo'

describe('lfoWave', () => {
  it('hits sine peaks at quarter cycle', () => {
    expect(lfoWave(0, 'sine')).toBeCloseTo(0)
    expect(lfoWave(0.25, 'sine')).toBeCloseTo(1)
    expect(lfoWave(0.5, 'sine')).toBeCloseTo(0)
    expect(lfoWave(0.75, 'sine')).toBeCloseTo(-1)
  })

  it('covers triangle, square, and saw extrema', () => {
    expect(lfoWave(0, 'triangle')).toBeCloseTo(-1)
    expect(lfoWave(0.25, 'triangle')).toBeCloseTo(0)
    expect(lfoWave(0.5, 'triangle')).toBeCloseTo(1)
    expect(lfoWave(0, 'square')).toBe(1)
    expect(lfoWave(0.5, 'square')).toBe(-1)
    expect(lfoWave(0, 'saw')).toBeCloseTo(-1)
    expect(lfoWave(0.5, 'saw')).toBeCloseTo(0)
    expect(lfoWave(1, 'saw')).toBeCloseTo(-1)
  })

  it('returns the hold sample for S&H', () => {
    expect(lfoWave(0.3, 'snh', 0.4)).toBeCloseTo(0.4)
  })
})

describe('modulateParam', () => {
  it('leaves the value alone at zero depth', () => {
    expect(modulateParam(40, 'delayWet', 1, 0)).toBe(40)
  })

  it('swings a linear percent param around the stored value', () => {
    const up = modulateParam(50, 'delayWet', 1, 100)
    const down = modulateParam(50, 'delayWet', -1, 100)
    expect(up).toBe(100)
    expect(down).toBe(0)
  })

  it('treats depth as plus/minus percent of the full range', () => {
    expect(modulateParam(50, 'delayWet', 1, 20)).toBe(70)
    expect(modulateParam(50, 'delayWet', -1, 20)).toBe(30)
    expect(modulateParam(45, 'saturation', 1, 20)).toBe(65)
    expect(modulateParam(45, 'saturation', -1, 20)).toBe(25)
  })

  it('clamps past the parameter range', () => {
    expect(modulateParam(90, 'delayWet', 1, 100)).toBe(100)
  })

  it('uses normalized space so log params stay in range', () => {
    const mid = PARAMS.delayTime.defaultValue
    const up = modulateParam(mid, 'delayTime', 1, 100)
    expect(toNormalized(up, PARAMS.delayTime)).toBeGreaterThan(toNormalized(mid, PARAMS.delayTime))
    expect(up).toBeLessThanOrEqual(PARAMS.delayTime.max)
    expect(up).toBeGreaterThanOrEqual(PARAMS.delayTime.min)
  })
})

describe('applyFxLfos', () => {
  it('modulates only the connected effect parameter', () => {
    const params = defaultParamValues()
    params.delayWet = 50
    params.reverbWet = 20
    const lfos = defaultFxLfos()
    lfos.delay.target = 'delayWet'
    lfos.delay.depth = 100
    lfos.delay.rateHz = 1
    const hold = defaultLfoHold()
    const t = 0.25
    expect(lfoPhase(t, 1)).toBeCloseTo(0.25)
    const next = applyFxLfos(params, lfos, t, hold)
    expect(next.delayWet).toBe(100)
    expect(next.reverbWet).toBe(20)
  })

  it('advances sample-and-hold when the hold index changes', () => {
    const params = defaultParamValues()
    params.delayWet = 50
    const lfos = defaultFxLfos()
    lfos.delay.target = 'delayWet'
    lfos.delay.shape = 'snh'
    lfos.delay.depth = 100
    lfos.delay.rateHz = 1
    const hold = defaultLfoHold()
    let n = 0
    const rand = () => {
      n += 1
      return n === 1 ? 1 : 0
    }
    const a = applyFxLfos(params, lfos, 0.1, hold, rand)
    const b = applyFxLfos(params, lfos, 0.2, hold, rand)
    const c = applyFxLfos(params, lfos, 1.1, hold, rand)
    expect(a.delayWet).toBe(b.delayWet)
    expect(c.delayWet).not.toBe(a.delayWet)
  })
})

describe('parseFxLfos', () => {
  it('keeps defaults for missing or invalid payload', () => {
    const parsed = parseFxLfos({ delay: { rateHz: 4, shape: 'square', depth: 80, target: 'delayTime' } })
    expect(parsed.delay.rateHz).toBe(4)
    expect(parsed.delay.shape).toBe('square')
    expect(parsed.delay.target).toBe('delayTime')
    expect(parsed.reverb.target).toBeNull()
    expect(parseFxLfos({ delay: { target: 'gain' } }).delay.target).toBeNull()
  })
})

describe('lfoRangeNormalized', () => {
  it('spans plus/minus depth around the stored zero', () => {
    expect(lfoRangeNormalized(0.45, 20)).toEqual({ min: 0.25, max: 0.65 })
  })

  it('clamps to the knob range', () => {
    expect(lfoRangeNormalized(0.05, 20)).toEqual({ min: 0, max: 0.25 })
  })
})

describe('targets', () => {
  it('does not allow assigning a delay LFO to a reverb knob', () => {
    expect(isFxLfoTarget('delay', 'reverbWet')).toBe(false)
    expect(isFxLfoTarget('delay', 'delayWet')).toBe(true)
    expect(isFxLfoTarget('saturation', 'saturation')).toBe(true)
  })
})
