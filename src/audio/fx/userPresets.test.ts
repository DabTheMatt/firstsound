import { describe, expect, it } from 'vitest'
import { exportUserPresetPack, parseUserPresetPack, parseUserPresets } from './userPresets'

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

  it('round-trips a library pack and a single instrument JSON', () => {
    const one = parseUserPresets([
      { id: 'a', name: 'Mine', savedAt: 1, preset: { instrument: 'field' } },
    ])
    const pack = JSON.parse(exportUserPresetPack(one)) as unknown
    expect(parseUserPresetPack(pack)).toHaveLength(1)
    expect(parseUserPresetPack({ instrument: 'field', name: 'Solo' })).toHaveLength(1)
  })
})
