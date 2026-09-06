import { describe, expect, it } from 'vitest'
import { SENSORY_ATMOSPHERES } from './sensoryAtmospheres'

describe('SENSORY_ATMOSPHERES', () => {
  it('includes Bloom on the dusk theme and range scene', () => {
    const bloom = SENSORY_ATMOSPHERES.find((a) => a.id === 'bloom')
    expect(bloom).toMatchObject({ theme: 'dusk', scene: 'range', label: 'Bloom' })
  })
})
