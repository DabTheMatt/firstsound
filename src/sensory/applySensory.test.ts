import { describe, expect, it } from 'vitest'
import { sensoryReverbType } from './applySensory'

describe('sensoryReverbType', () => {
  it('stays on a hall IR so Space cannot open a regenerative cathedral', () => {
    expect(sensoryReverbType(0)).toBe('hall')
    expect(sensoryReverbType(0.2)).toBe('hall')
    expect(sensoryReverbType(1)).toBe('hall')
  })
})
