import { describe, expect, it } from 'vitest'
import { parseCssColor } from '../theme/cssColor'
import { DEFAULT_A11Y_SETTINGS } from './settings'

/** WCAG relative luminance contrast. Used for the theme pairs High Visibility strokes with. */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const parsed = parseCssColor(hex)
    if (!parsed) throw new Error(hex)
    const channel = (value: number) => {
      const v = value / 255
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * channel(parsed.r) + 0.7152 * channel(parsed.g) + 0.0722 * channel(parsed.b)
  }
  const hi = Math.max(lum(a), lum(b))
  const lo = Math.min(lum(a), lum(b))
  return (hi + 0.05) / (lo + 0.05)
}

/** Text color on the app canvas. High Visibility edges use these, not a second palette. */
const THEME_PAIRS = [
  { theme: 'studio-dark', ink: '#e8e6df', canvas: '#151616' },
  { theme: 'soft-slate', ink: '#e6edf3', canvas: '#0d1117' },
  { theme: 'warm-paper', ink: '#2a261f', canvas: '#f4efe6' },
  { theme: 'dusk', ink: '#ebe6e1', canvas: '#241e28' },
] as const

describe('high visibility tokens', () => {
  it('stays off until the user turns it on', () => {
    expect(DEFAULT_A11Y_SETTINGS.highVisibility).toBe(false)
  })

  it('keeps theme text against the canvas at the non-text contrast floor', () => {
    for (const pair of THEME_PAIRS) {
      expect(contrast(pair.ink, pair.canvas), pair.theme).toBeGreaterThanOrEqual(3)
      expect(contrast(pair.ink, pair.canvas), pair.theme).toBeGreaterThanOrEqual(4.5)
    }
  })
})
