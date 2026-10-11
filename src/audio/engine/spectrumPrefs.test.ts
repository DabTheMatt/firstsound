import { describe, expect, it } from 'vitest'
import { defaultSpectrumPrefs, spectrumPaintColor } from './spectrumPrefs'

describe('spectrum paint color', () => {
  it('keeps EQ region color independent of the FFT color mode', () => {
    const prefs = { ...defaultSpectrumPrefs(), regionColors: true, colorMode: 'frequency' as const }
    expect(spectrumPaintColor(prefs, 'eq')).toBe('frequency')
    expect(spectrumPaintColor({ colorMode: 'off', regionColors: true }, 'eq')).toBe('frequency')
    expect(spectrumPaintColor({ colorMode: 'level', regionColors: true }, 'eq')).toBe('frequency')
    expect(spectrumPaintColor({ colorMode: 'frequency', regionColors: false }, 'eq')).toBe('solid')
  })

  it('keeps FFT color independent of EQ regions', () => {
    expect(spectrumPaintColor({ colorMode: 'level', regionColors: true }, 'fft')).toBe('level')
    expect(spectrumPaintColor({ colorMode: 'frequency', regionColors: false }, 'fft')).toBe('frequency')
    expect(spectrumPaintColor({ colorMode: 'off', regionColors: true }, 'fft')).toBe('solid')
    expect(spectrumPaintColor({ colorMode: 'off', regionColors: false }, 'fft')).toBe('solid')
  })

  it('leaves frequency landmarks off until the graph menu turns them on', () => {
    expect(defaultSpectrumPrefs().freqGuide).toBe(false)
  })
})
