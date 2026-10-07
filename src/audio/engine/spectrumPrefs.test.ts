import { describe, expect, it } from 'vitest'
import { defaultSpectrumPrefs, spectrumPaintColor } from './spectrumPrefs'

describe('spectrum paint color', () => {
  it('keeps a focus plot on the theme color', () => {
    const prefs = { ...defaultSpectrumPrefs(), regionColors: true, colorMode: 'frequency' as const }
    expect(spectrumPaintColor(prefs, true)).toBe('solid')
  })

  it('uses frequency colors from the region switch or the color mode', () => {
    expect(spectrumPaintColor({ colorMode: 'off', regionColors: true }, false)).toBe('frequency')
    expect(spectrumPaintColor({ colorMode: 'frequency', regionColors: false }, false)).toBe('frequency')
  })

  it('lets level color replace the region palette', () => {
    expect(spectrumPaintColor({ colorMode: 'level', regionColors: true }, false)).toBe('level')
  })

  it('stays solid when color and regions are off', () => {
    expect(spectrumPaintColor({ colorMode: 'off', regionColors: false }, false)).toBe('solid')
  })
})
