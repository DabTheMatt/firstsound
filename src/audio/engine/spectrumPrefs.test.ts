import { describe, expect, it } from 'vitest'
import { defaultSpectrumPrefs, spectrumPaintColor } from './spectrumPrefs'

describe('spectrum paint color', () => {
  it('uses frequency colors from the region switch or the color mode', () => {
    const prefs = { ...defaultSpectrumPrefs(), regionColors: true, colorMode: 'frequency' as const }
    expect(spectrumPaintColor(prefs)).toBe('frequency')
    expect(spectrumPaintColor({ colorMode: 'off', regionColors: true })).toBe('frequency')
    expect(spectrumPaintColor({ colorMode: 'frequency', regionColors: false })).toBe('frequency')
  })

  it('lets level color replace the region palette', () => {
    expect(spectrumPaintColor({ colorMode: 'level', regionColors: true })).toBe('level')
  })

  it('stays solid when color and regions are off', () => {
    expect(spectrumPaintColor({ colorMode: 'off', regionColors: false })).toBe('solid')
  })

  it('leaves frequency landmarks off until the graph menu turns them on', () => {
    expect(defaultSpectrumPrefs().freqGuide).toBe(false)
  })
})
