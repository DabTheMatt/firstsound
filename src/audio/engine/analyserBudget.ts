/**
 * FFT sizes for spectrum taps.
 * Band count is display aggregation only — it must not change this capture size,
 * or the same audio would gain and lose bins when the user picks 32 vs 1024 bands.
 * 8192 samples (~186 ms at 44.1 kHz) is long enough to hop a shorter analysis
 * window across the block so a click is not left on the Blackman edge.
 */

export const ANALYSER_FFT_IDLE = 4096
export const ANALYSER_FFT_MAX = 16384
/** Time-domain block read from each spectrum AnalyserNode while the plot is open. */
export const SPECTRUM_CAPTURE_FFT = 8192

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

/** Display bands do not select the FFT. Every band count captures the same audio block. */
export function spectrumFftSizeForBands(_bands: number): number {
  return SPECTRUM_CAPTURE_FFT
}
