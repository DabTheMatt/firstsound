/**
 * FFT sizes for spectrum taps.
 * Display columns (the Bands control) do not select this size.
 * Analyzer resolution does: a longer transform resolves lower frequencies and
 * the analyser window itself is that long, so it also reacts more slowly.
 */

export const ANALYSER_FFT_IDLE = 4096
export const ANALYSER_FFT_MAX = 16384
/**
 * Upper capture used when a caller asks for "the" block without a resolution.
 * The open spectrum plot uses `spectrumAnalyserFftSize` instead.
 */
export const SPECTRUM_CAPTURE_FFT = 8192

/** FFT lengths exposed as analyzer resolution. Not display column counts. */
export const SPECTRUM_RESOLUTION_CHOICES = [1024, 2048, 4096, 8192] as const

export type SpectrumResolution = (typeof SPECTRUM_RESOLUTION_CHOICES)[number]

export const SPECTRUM_RESOLUTION_DEFAULT: SpectrumResolution = 2048

const FFT_SIZES = [1024, 2048, 4096, 8192, 16384] as const

export function clampAnalyserFftSize(size: number): (typeof FFT_SIZES)[number] {
  let best: (typeof FFT_SIZES)[number] = 4096
  let dist = Infinity
  for (const n of FFT_SIZES) {
    const d = Math.abs(n - size)
    if (d < dist) {
      dist = d
      best = n
    }
  }
  return best
}

/** Display columns do not select the FFT. Every column count captures the same audio block. */
export function spectrumFftSizeForBands(_bands: number): number {
  return SPECTRUM_CAPTURE_FFT
}

export function clampSpectrumResolution(value: unknown): SpectrumResolution {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return SPECTRUM_RESOLUTION_DEFAULT
  let best: SpectrumResolution = SPECTRUM_RESOLUTION_DEFAULT
  let dist = Infinity
  for (const size of SPECTRUM_RESOLUTION_CHOICES) {
    const d = Math.abs(size - n)
    if (d < dist) {
      dist = d
      best = size
    }
  }
  return best
}

/**
 * AnalyserNode window for a resolution.
 * The transform length and the time aperture are the same buffer, so 8192
 * resolves finer low-frequency bins and updates more slowly than 1024.
 */
export function spectrumAnalyserFftSize(resolution: SpectrumResolution): number {
  return resolution
}
