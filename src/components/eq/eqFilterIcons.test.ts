import { describe, expect, it } from 'vitest'
import { FILTER_ICON_PATH } from './eqFilterIcons'

describe('EQ filter icons', () => {
  it('draws low shelf and high shelf as mirrored square plateaus', () => {
    expect(FILTER_ICON_PATH.lowshelf).not.toBe(FILTER_ICON_PATH.highshelf)
    expect(FILTER_ICON_PATH.lowshelf).toBe('M1 3.5 H13 V12.5 H23')
    expect(FILTER_ICON_PATH.highshelf).toBe('M1 12.5 H11 V3.5 H23')
  })

  it('draws a peaking bell with a baseline and a centre bump', () => {
    expect(FILTER_ICON_PATH.peaking).toContain('C')
    expect(FILTER_ICON_PATH.peaking).toMatch(/H6/)
    expect(FILTER_ICON_PATH.peaking).not.toBe(FILTER_ICON_PATH.bandpass)
    expect(FILTER_ICON_PATH.peaking).not.toBe(FILTER_ICON_PATH.lowshelf)
  })
})
