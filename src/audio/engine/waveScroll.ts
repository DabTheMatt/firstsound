/** Visible time window for the limiter inspector oscilloscope. */
export const LIMITER_VIZ_SECONDS = 0.12

export function samplesToAppend(dtSec: number, width: number, windowSec = LIMITER_VIZ_SECONDS): number {
  if (!(width > 0) || !(windowSec > 0)) return 0
  const dt = Math.min(0.08, Math.max(0, dtSec))
  return Math.max(1, Math.round((dt / windowSec) * width))
}

/** Decimate a time-domain snapshot into `count` signed display samples. */
export function decimateWave(samples: Float32Array, count: number, out: Float32Array): void {
  const n = Math.max(0, Math.min(count, out.length))
  if (n === 0) return
  if (samples.length === 0) {
    out.fill(0, 0, n)
    return
  }
  const last = samples.length - 1
  for (let i = 0; i < n; i++) {
    const idx = n === 1 ? last : Math.round((i / (n - 1)) * last)
    out[i] = samples[idx] ?? 0
  }
  if (out.length > n) out.fill(0, n)
}

/** Shift `history` left and append `incoming` on the right. */
export function scrollWave(history: Float32Array, incoming: Float32Array): void {
  const n = incoming.length
  if (n <= 0) return
  if (n >= history.length) {
    history.set(incoming.subarray(incoming.length - history.length))
    return
  }
  history.copyWithin(0, n)
  history.set(incoming, history.length - n)
}
