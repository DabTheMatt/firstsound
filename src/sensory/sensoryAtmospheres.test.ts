import { describe, expect, it } from 'vitest'
import { SENSORY_ATMOSPHERES, resolveSensoryAtmosphere } from './sensoryAtmospheres'

describe('SENSORY_ATMOSPHERES', () => {
  it('includes Bloom on the dusk theme and range scene', () => {
    const bloom = SENSORY_ATMOSPHERES.find((a) => a.id === 'bloom')
    expect(bloom).toMatchObject({ theme: 'dusk', scene: 'range', label: 'Bloom' })
  })

  it('does not treat Bloom as active unless dusk is the color theme', () => {
    const loose = resolveSensoryAtmosphere('range', 'studio-dark')
    expect(loose.id).not.toBe('bloom')
    expect(loose.label).toBe('Studio Dark')
    expect(resolveSensoryAtmosphere('range', 'dusk').id).toBe('bloom')
  })
})
