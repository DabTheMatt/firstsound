import { describe, expect, it } from 'vitest'
import { activeFeelingId, applyFeelingAmount, feelingAmount, SENSORY_FEELINGS } from './sensoryFeelings'
import { defaultSensoryValues } from './sensoryState'

describe('sensory feelings', () => {
  it('writes wilder onto the positive wildness pole', () => {
    const wilder = SENSORY_FEELINGS.find((f) => f.id === 'wilder')!
    const next = applyFeelingAmount(defaultSensoryValues(), wilder, 0.6)
    expect(next.wildness).toBeCloseTo(0.6)
    expect(feelingAmount(next, wilder)).toBeCloseTo(0.6)
  })

  it('treats tighter as closer', () => {
    const tighter = SENSORY_FEELINGS.find((f) => f.id === 'tighter')!
    const next = applyFeelingAmount(defaultSensoryValues(), tighter, 0.7)
    expect(next.distance).toBeCloseTo(-0.7)
  })

  it('marks the strongest open feeling', () => {
    const values = { ...defaultSensoryValues(), fullness: 0.8, wildness: 0.2 }
    expect(activeFeelingId(values, null)).toBe('bigger')
    expect(activeFeelingId(values, 'echo')).toBe('echo')
  })
})
