/** FFT sizes for spectrum / lens analysers. Idle stays small; 1024-band plots scale up. */

export const ANALYSER_FFT_IDLE = 4096
export const ANALYSER_FFT_MAX = 16384

const FFT_SIZES = [2048, 4096, 8192, 16384] as const

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

export function spectrumFftSizeForBands(bands: number): number {
  const n = Math.max(1, bands)
  if (n <= 128) return ANALYSER_FFT_IDLE
  if (n <= 256) return 8192
  return ANALYSER_FFT_MAX
}
