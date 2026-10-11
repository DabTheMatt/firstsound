import { describe, expect, it, vi } from 'vitest'
import { defaultSpectrumPrefs, patchSurfaceDisplay, spectrumPaintColor } from './spectrumPrefs'

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

  it('keeps EQ and FFT display choices apart', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value)
      },
    })
    patchSurfaceDisplay('eq', { scale: 'mel', range: 60, layer: 'pre' })
    patchSurfaceDisplay('fft', { scale: 'linear', range: 120, layer: 'post' })
    const prefs = patchSurfaceDisplay('eq', { grid: 6 })
    expect(prefs.surfaces.eq.scale).toBe('mel')
    expect(prefs.surfaces.eq.range).toBe(60)
    expect(prefs.surfaces.eq.layer).toBe('pre')
    expect(prefs.surfaces.eq.grid).toBe(6)
    expect(prefs.surfaces.fft.scale).toBe('linear')
    expect(prefs.surfaces.fft.range).toBe(120)
    expect(prefs.surfaces.fft.layer).toBe('post')
    expect(prefs.layer).toBe('post')
    expect(prefs.surfaces.fft.grid).not.toBe(6)
    vi.unstubAllGlobals()
  })
})
