import { describe, expect, it } from 'vitest'
import { activeFeelingId, applyFeelingAmount, feelingAmount, restFeeling, SENSORY_FEELINGS } from './sensoryFeelings'
import { defaultSensoryValues } from './sensoryState'

describe('sensory feelings', () => {
  it('writes space onto the space axis', () => {
    const space = SENSORY_FEELINGS.find((f) => f.id === 'space')!
    const next = applyFeelingAmount(defaultSensoryValues(), space, 0.6)
    expect(next.space).toBeCloseTo(0.6)
    expect(feelingAmount(next, space)).toBeCloseTo(0.6)
  })

  it('lets character go bipolar toward tight', () => {
    const character = SENSORY_FEELINGS.find((f) => f.id === 'character')!
    const next = applyFeelingAmount(defaultSensoryValues(), character, -0.7)
    expect(next.character).toBeCloseTo(-0.7)
  })

  it('rests a single control without clearing the others', () => {
    const space = SENSORY_FEELINGS.find((f) => f.id === 'space')!
    const echo = SENSORY_FEELINGS.find((f) => f.id === 'echo')!
    const mixed = applyFeelingAmount(applyFeelingAmount(defaultSensoryValues(), space, 0.5), echo, 0.4)
    const rested = restFeeling(mixed, space)
    expect(rested.space).toBe(0)
    expect(rested.echo).toBeCloseTo(0.4)
  })

  it('marks the strongest open feeling', () => {
    const values = { ...defaultSensoryValues(), space: 0.8, grain: 0.2 }
    expect(activeFeelingId(values, null)).toBe('space')
    expect(activeFeelingId(values, 'echo')).toBe('echo')
  })

  it('includes hybrid braid feelings', () => {
    expect(SENSORY_FEELINGS.map((f) => f.id)).toEqual([
      'character',
      'space',
      'echo',
      'grain',
      'dirt',
      'tight',
      'mod',
      'drift',
      'pan',
      'veil',
      'halo',
      'well',
    ])
  })
})
