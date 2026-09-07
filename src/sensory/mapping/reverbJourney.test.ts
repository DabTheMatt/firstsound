import { describe, expect, it } from 'vitest'
import { defaultSensoryValues, patchSensoryValue } from '../sensoryState'
import { sensoryReverbJourney, spaceReverbPath } from './reverbJourney'

describe('spaceReverbPath', () => {
  it('starts dry ambience and ends in a cathedral', () => {
    const rest = spaceReverbPath(0)
    const far = spaceReverbPath(1)
    expect(rest.type).toBe('ambience')
    expect(rest.params.reverbWet).toBe(0)
    expect(far.type).toBe('cathedral')
    expect(far.params.reverbDecay ?? 0).toBeGreaterThan(rest.params.reverbDecay ?? 0)
  })

  it('interpolates size between neighboring presets', () => {
    const a = spaceReverbPath(0.14)
    const b = spaceReverbPath(0.28)
    const c = spaceReverbPath(0.42)
    expect(b.params.reverbSize ?? 0).toBeGreaterThan(a.params.reverbSize ?? 0)
    expect(c.params.reverbSize ?? 0).toBeGreaterThan(b.params.reverbSize ?? 0)
  })
})

describe('sensoryReverbJourney', () => {
  it('keeps a dry hall when nothing is open', () => {
    const rest = sensoryReverbJourney(defaultSensoryValues())
    expect(rest.type).toBe('hall')
    expect(rest.params.reverbWet).toBe(0)
  })

  it('lets bloom pull the path to a bloom IR', () => {
    const bloom = sensoryReverbJourney(patchSensoryValue(defaultSensoryValues(), 'bloom', 1))
    expect(bloom.type).toBe('bloom')
    expect(bloom.params.reverbWet ?? 0).toBeGreaterThan(10)
  })
})
