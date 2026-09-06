import { describe, expect, it } from 'vitest'
import { ANALYSER_FFT_IDLE, ANALYSER_FFT_MAX, clampAnalyserFftSize, spectrumFftSizeForBands } from './analyserBudget'

describe('spectrumFftSizeForBands', () => {
  it('keeps the idle FFT for typical band counts', () => {
    expect(spectrumFftSizeForBands(32)).toBe(ANALYSER_FFT_IDLE)
    expect(spectrumFftSizeForBands(128)).toBe(ANALYSER_FFT_IDLE)
  })

  it('steps up only when the plot asks for hundreds of bands', () => {
    expect(spectrumFftSizeForBands(256)).toBe(8192)
    expect(spectrumFftSizeForBands(1024)).toBe(ANALYSER_FFT_MAX)
  })
})

describe('clampAnalyserFftSize', () => {
  it('snaps to a legal power of two', () => {
    expect(clampAnalyserFftSize(5000)).toBe(4096)
    expect(clampAnalyserFftSize(12000)).toBe(8192)
  })
})
