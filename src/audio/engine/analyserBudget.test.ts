import { describe, expect, it } from 'vitest'
import {
  ANALYSER_FFT_MAX,
  SPECTRUM_CAPTURE_FFT,
  SPECTRUM_RESOLUTION_CHOICES,
  SPECTRUM_RESOLUTION_DEFAULT,
  clampAnalyserFftSize,
  clampSpectrumResolution,
  spectrumAnalyserFftSize,
  spectrumFftSizeForBands,
} from './analyserBudget'

describe('spectrumFftSizeForBands', () => {
  it('keeps one capture size for every display band count', () => {
    expect(SPECTRUM_CAPTURE_FFT).toBe(8192)
    expect(SPECTRUM_CAPTURE_FFT).toBeLessThanOrEqual(ANALYSER_FFT_MAX)
    for (const bands of [8, 32, 128, 256, 512, 1024]) {
      expect(spectrumFftSizeForBands(bands)).toBe(SPECTRUM_CAPTURE_FFT)
    }
  })
})

describe('clampAnalyserFftSize', () => {
  it('snaps to a legal power of two', () => {
    expect(clampAnalyserFftSize(5000)).toBe(4096)
    expect(clampAnalyserFftSize(12000)).toBe(8192)
    expect(clampAnalyserFftSize(1024)).toBe(1024)
  })
})

describe('analyzer resolution', () => {
  it('exposes 1024 through 8192 and keeps columns from selecting the FFT', () => {
    expect(SPECTRUM_RESOLUTION_CHOICES).toEqual([1024, 2048, 4096, 8192])
    expect(SPECTRUM_RESOLUTION_DEFAULT).toBe(2048)
    expect(clampSpectrumResolution(3000)).toBe(2048)
    expect(clampSpectrumResolution(7000)).toBe(8192)
    expect(clampSpectrumResolution('nope')).toBe(2048)
    expect(spectrumAnalyserFftSize(1024)).toBeLessThan(spectrumAnalyserFftSize(8192))
    expect(spectrumFftSizeForBands(32)).toBe(spectrumFftSizeForBands(1024))
    expect(spectrumAnalyserFftSize(4096)).not.toBe(spectrumFftSizeForBands(4096))
  })
})
