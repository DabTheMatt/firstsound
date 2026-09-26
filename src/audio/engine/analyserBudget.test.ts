import { describe, expect, it } from 'vitest'
import { ANALYSER_FFT_MAX, SPECTRUM_CAPTURE_FFT, clampAnalyserFftSize, spectrumFftSizeForBands } from './analyserBudget'

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
  })
})
