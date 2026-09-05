import { describe, expect, it } from 'vitest'
import { sensoryReverbType } from './applySensory'

describe('sensoryReverbType', () => {
  it('uses a cathedral IR once space is audible', () => {
    expect(sensoryReverbType(0)).toBe('hall')
    expect(sensoryReverbType(0.2)).toBe('cathedral')
    expect(sensoryReverbType(1)).toBe('cathedral')
  })
})
