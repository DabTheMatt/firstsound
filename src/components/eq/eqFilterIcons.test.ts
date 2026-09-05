import { describe, expect, it } from 'vitest'
import { FILTER_ICON_PATH } from './eqFilterIcons'

describe('EQ filter icons', () => {
  it('draws low shelf and high shelf as inverted plateaus', () => {
    expect(FILTER_ICON_PATH.lowshelf).not.toBe(FILTER_ICON_PATH.highshelf)
    expect(FILTER_ICON_PATH.lowshelf).toBe('M2 5 H10 L14 12 H22')
    expect(FILTER_ICON_PATH.highshelf).toBe('M2 12 H10 L14 5 H22')
  })

  it('draws a peaking bell as a centre bump, not a zigzag', () => {
    expect(FILTER_ICON_PATH.peaking).toContain('C')
    expect(FILTER_ICON_PATH.peaking).not.toBe(FILTER_ICON_PATH.lowshelf)
    expect(FILTER_ICON_PATH.peaking).not.toBe(FILTER_ICON_PATH.bandpass)
  })
})
