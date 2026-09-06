import { describe, expect, it } from 'vitest'
import { AXIS_LFOS, axisLfoActive, resolvedAxisLfo } from './axisLfos'

describe('axisLfos', () => {
  it('patches effect modules without colliding on the same bank slot', () => {
    const keys = AXIS_LFOS.map((b) => `${b.kind}:${b.slot}`)
    expect(new Set(keys).size).toBe(AXIS_LFOS.length)
    expect(AXIS_LFOS.some((b) => b.axis === 'pan' && b.target === 'pan')).toBe(true)
    expect(AXIS_LFOS.some((b) => b.kind === 'reverb' && b.target === 'reverbWet')).toBe(true)
    expect(AXIS_LFOS.some((b) => b.kind === 'delay' && b.target === 'delayFeedback')).toBe(true)
    expect(AXIS_LFOS.some((b) => b.kind === 'delay' && b.target === 'delayPan')).toBe(true)
  })

  it('stays silent at rest and opens depth with the axis', () => {
    const bind = AXIS_LFOS.find((b) => b.axis === 'space')!
    expect(axisLfoActive(0)).toBe(false)
    expect(resolvedAxisLfo(bind, 0)).toBeNull()
    const low = resolvedAxisLfo(bind, 0.2)!
    const high = resolvedAxisLfo(bind, 1)!
    expect(low.depth).toBeGreaterThan(0)
    expect(high.depth).toBeGreaterThan(low.depth)
    expect(high.rateHz).toBeGreaterThan(low.rateHz)
  })
})
