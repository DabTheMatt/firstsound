import { describe, expect, it } from 'vitest'
import { lfoAddTone, lfoNumberTone } from './lfoSlots'

describe('lfo slot tones', () => {
  it('marks only existing unselected numbers as idle and the rest empty', () => {
    expect(lfoNumberTone(0, 1, 0)).toBe('active')
    expect(lfoNumberTone(1, 1, 0)).toBe('empty')
    expect(lfoNumberTone(2, 1, 0)).toBe('empty')
    expect(lfoAddTone(1, 3)).toBe('idle')
  })

  it('keeps the add cell when every numbered slot exists', () => {
    expect([0, 1, 2].map((index) => lfoNumberTone(index, 3, 1))).toEqual(['idle', 'active', 'idle'])
    expect(lfoAddTone(3, 3)).toBe('empty')
  })

  it('does not treat selection as a size change — tone is presentation only', () => {
    const tones = [0, 1, 2].map((selected) =>
      [0, 1, 2].map((index) => lfoNumberTone(index, 3, selected)),
    )
    for (const row of tones) expect(row).toHaveLength(3)
    expect(new Set(tones.flat())).toEqual(new Set(['active', 'idle']))
  })
})
