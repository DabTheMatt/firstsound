import { describe, expect, it } from 'vitest'
import { parseUserPresets } from './userPresets'

describe('user presets', () => {
  it('ignores malformed entries', () => {
    expect(parseUserPresets(null)).toEqual([])
    expect(
      parseUserPresets([
        { id: 'a', name: 'Mine', savedAt: 1, preset: { instrument: 'field' } },
        { id: 2 },
      ]),
    ).toHaveLength(1)
  })
})
