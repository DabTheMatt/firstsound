import { describe, expect, it } from 'vitest'
import { defaultRandomDocument } from './types'
import { defaultRandomTargets, eqBandUsesFullRandom, partitionRandomTargets } from './groups'

describe('random setup targets', () => {
  it('keeps integer targets in the mode group', () => {
    const split = partitionRandomTargets(['gain', 'eqcfTeeth', 'pitch'])
    expect(split.parameters).toEqual(['gain', 'pitch'])
    expect(split.modes).toEqual(['eqcfTeeth'])
  })

  it('uses the whole-band EQ randomizer until the target list is narrowed', () => {
    expect(eqBandUsesFullRandom(defaultRandomDocument(), 'eq1')).toBe(true)
    const narrowed = defaultRandomDocument()
    narrowed.participation.eq1 = ['eq1Freq']
    expect(eqBandUsesFullRandom(narrowed, 'eq1')).toBe(false)
    const complete = defaultRandomDocument()
    complete.participation.eq1 = defaultRandomTargets('eq1')
    expect(eqBandUsesFullRandom(complete, 'eq1')).toBe(true)
  })
})
