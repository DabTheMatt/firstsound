import { describe, expect, it } from 'vitest'
import { FILTER_ICON_PATH } from './eqFilterIcons'

describe('EQ filter icons', () => {
  it('draws LP and HP as smooth knees, not a bump or a square step', () => {
    expect(FILTER_ICON_PATH.lowpass).toContain('C')
    expect(FILTER_ICON_PATH.highpass).toContain('C')
    expect(FILTER_ICON_PATH.lowpass).not.toContain('V')
    expect(FILTER_ICON_PATH.highpass).not.toContain('V')
    expect(FILTER_ICON_PATH.lowpass).not.toBe(FILTER_ICON_PATH.highpass)
  })

  it('draws low shelf and high shelf as mirrored rounded slopes', () => {
    expect(FILTER_ICON_PATH.lowshelf).not.toBe(FILTER_ICON_PATH.highshelf)
    expect(FILTER_ICON_PATH.lowshelf).toContain('C')
    expect(FILTER_ICON_PATH.highshelf).toContain('C')
    expect(FILTER_ICON_PATH.lowshelf).not.toContain('V')
    expect(FILTER_ICON_PATH.highshelf).not.toContain('V')
  })

  it('draws a peaking bell with a baseline and a centre bump', () => {
    expect(FILTER_ICON_PATH.peaking).toContain('C')
    expect(FILTER_ICON_PATH.peaking).toMatch(/H6/)
    expect(FILTER_ICON_PATH.peaking).not.toBe(FILTER_ICON_PATH.bandpass)
    expect(FILTER_ICON_PATH.peaking).not.toBe(FILTER_ICON_PATH.lowshelf)
  })
})
