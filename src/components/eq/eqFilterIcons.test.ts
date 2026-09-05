import { describe, expect, it } from 'vitest'
import { FILTER_ICON_PATH } from './eqFilterIcons'

describe('EQ filter icons', () => {
  it('draws low shelf and high shelf as inverted plateaus', () => {
    expect(FILTER_ICON_PATH.lowshelf).not.toBe(FILTER_ICON_PATH.highshelf)
    expect(FILTER_ICON_PATH.lowshelf).toBe('M1 5 H13 L16 12 H23')
    expect(FILTER_ICON_PATH.highshelf).toBe('M1 12 H8 L11 5 H23')
  })

  it('draws a peaking bell as a centre bump, not a zigzag', () => {
    expect(FILTER_ICON_PATH.peaking).toContain('Q')
    expect(FILTER_ICON_PATH.peaking).not.toBe(FILTER_ICON_PATH.lowshelf)
    expect(FILTER_ICON_PATH.peaking).not.toBe(FILTER_ICON_PATH.bandpass)
  })
})
