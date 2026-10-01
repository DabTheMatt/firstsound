import { describe, expect, it } from 'vitest'
import type { ModuleType } from '../audio/chain/chain'
import { PARAMS } from '../audio/parameters/definitions'
import { defaultParamValues } from '../audio/parameters/definitions'
import { MOBILE_PARAM_PRIORITY, mobilePriority, primarySummary } from './mobilePriority'

const TYPES = Object.keys(MOBILE_PARAM_PRIORITY) as ModuleType[]

describe('mobile parameter priority', () => {
  it('keeps at most four primary parameters and does not repeat an id', () => {
    for (const type of TYPES) {
      const group = mobilePriority(type)
      expect(group.primary.length).toBeLessThanOrEqual(4)
      const all = [...group.primary, ...group.secondary, ...group.advanced]
      expect(new Set(all).size).toBe(all.length)
      for (const id of all) expect(PARAMS[id]).toBeTruthy()
    }
  })

  it('opens reverb on size, decay, and wet', () => {
    expect(mobilePriority('reverb').primary).toEqual(['reverbSize', 'reverbDecay', 'reverbWet'])
    expect(mobilePriority('reverb').primary).not.toContain('reverbWidth')
    expect(mobilePriority('reverb').secondary).toContain('reverbPredelay')
  })

  it('opens input on gain, speed, and pitch', () => {
    expect(mobilePriority('gain').primary).toEqual(['gain', 'speed', 'pitch'])
    expect(mobilePriority('gain').primary).not.toContain('pan')
    expect(mobilePriority('gain').secondary).toContain('stretchInterp')
  })

  it('summarises the primary values without listing advanced controls', () => {
    const text = primarySummary('reverb', defaultParamValues())
    expect(text).toContain('Size')
    expect(text).toContain('Decay')
    expect(text).toContain('Wet')
    expect(text).not.toContain('Width')
  })
})
