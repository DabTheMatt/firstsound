/** Time-warp a buffer so one marker moves without changing total length. */

export const WARP_MIN_GAP_SEC = 0.012

export function neighborTimes(
  times: readonly number[],
  index: number,
  duration: number,
): { prev: number; next: number } {
  const prev = index > 0 ? (times[index - 1] ?? 0) : 0
  const next = index < times.length - 1 ? (times[index + 1] ?? duration) : duration
  return { prev, next: Math.max(next, prev) }
}

export function clampWarpTime(
  toSec: number,
  prev: number,
  next: number,
  minGap = WARP_MIN_GAP_SEC,
): number {
  const span = next - prev
  const gap = Math.min(minGap, Math.max(0.001, span / 3))
  if (!(span > gap * 2)) return (prev + next) / 2
  return Math.min(next - gap, Math.max(prev + gap, toSec))
}

/** Map every marker through a two-segment stretch around `fromSec` → `toSec`. */
export function remapWarpTimes(
  times: readonly number[],
  fromSec: number,
  toSec: number,
  prev: number,
  next: number,
): number[] {
  const leftIn = Math.max(1e-9, fromSec - prev)
  const rightIn = Math.max(1e-9, next - fromSec)
  const leftOut = Math.max(1e-9, toSec - prev)
  const rightOut = Math.max(1e-9, next - toSec)
  return times.map((t) => {
    if (t <= prev || t >= next) return t
    if (t <= fromSec) return prev + ((t - prev) / leftIn) * leftOut
    return toSec + ((t - fromSec) / rightIn) * rightOut
  })
}

export function warpChannel(
  samples: Float32Array,
  sampleRate: number,
  fromSec: number,
  toSec: number,
  prevSec: number,
  nextSec: number,
): Float32Array {
  const n = samples.length
  const idx = (sec: number) => Math.min(n, Math.max(0, Math.round(sec * sampleRate)))
  const prev = idx(prevSec)
  const from = idx(fromSec)
  const to = idx(toSec)
  const next = idx(nextSec)
  const out = new Float32Array(n)
  if (prev > 0) out.set(samples.subarray(0, prev), 0)
  if (next < n) out.set(samples.subarray(next), next)
  writeResampled(samples, prev, from, out, prev, to)
  writeResampled(samples, from, next, out, to, next)
  return out
}

function writeResampled(
  src: Float32Array,
  srcStart: number,
  srcEnd: number,
  dest: Float32Array,
  destStart: number,
  destEnd: number,
): void {
  const inLen = srcEnd - srcStart
  const outLen = destEnd - destStart
  if (outLen <= 0) return
  if (inLen <= 0) return
  if (inLen === outLen) {
    dest.set(src.subarray(srcStart, srcEnd), destStart)
    return
  }
  const last = Math.max(0, inLen - 1)
  for (let i = 0; i < outLen; i++) {
    const t = outLen === 1 ? 0 : (i * last) / (outLen - 1)
    const j = Math.floor(t)
    const f = t - j
    const a = src[srcStart + j] ?? 0
    const b = src[srcStart + Math.min(last, j + 1)] ?? 0
    dest[destStart + i] = a + (b - a) * f
  }
}
