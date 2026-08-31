/** Mix to mono peaks for a static waveform canvas. */
export function computePeaks(
  channel: Float32Array,
  buckets: number,
): Float32Array {
  const peaks = new Float32Array(Math.max(1, buckets))
  const len = channel.length
  if (len === 0) return peaks
  const bucketWidth = len / peaks.length
  for (let i = 0; i < peaks.length; i++) {
    const start = Math.floor(i * bucketWidth)
    const end = Math.min(len, Math.floor((i + 1) * bucketWidth) || start + 1)
    let peak = 0
    for (let s = start; s < end; s++) {
      const a = Math.abs(channel[s] ?? 0)
      if (a > peak) peak = a
    }
    peaks[i] = peak
  }
  return peaks
}

export type MinMax = { min: Float32Array; max: Float32Array; peak: number }

/**
 * Per-bucket min/max envelope over the sample range [startIdx, endIdx). Rendering
 * from aggregated min/max keeps long recordings fast (guideline: never draw every
 * sample) and looks better than an abs-only envelope. `peak` is the max abs value,
 * used by Normalize View.
 */
export function computeMinMax(
  channel: Float32Array,
  startIdx: number,
  endIdx: number,
  buckets: number,
): MinMax {
  const n = Math.max(1, Math.floor(buckets))
  const min = new Float32Array(n)
  const max = new Float32Array(n)
  const s = Math.max(0, Math.min(startIdx, channel.length))
  const e = Math.max(s, Math.min(endIdx, channel.length))
  const len = e - s
  let peak = 0
  if (len <= 0) return { min, max, peak }
  const bucketWidth = len / n
  for (let i = 0; i < n; i++) {
    const from = s + Math.floor(i * bucketWidth)
    const to = Math.min(e, s + Math.floor((i + 1) * bucketWidth))
    const end = to > from ? to : Math.min(e, from + 1)
    let mn = channel[from] ?? 0
    let mx = mn
    for (let j = from + 1; j < end; j++) {
      const v = channel[j] ?? 0
      if (v < mn) mn = v
      if (v > mx) mx = v
    }
    min[i] = mn
    max[i] = mx
    const a = Math.max(Math.abs(mn), Math.abs(mx))
    if (a > peak) peak = a
  }
  return { min, max, peak }
}

export function mixToMono(buffer: {
  numberOfChannels: number
  length: number
  getChannelData: (channel: number) => Float32Array
}): Float32Array {
  const ch0 = buffer.getChannelData(0)
  if (buffer.numberOfChannels === 1) return ch0
  const mixed = new Float32Array(buffer.length)
  const n = buffer.numberOfChannels
  for (let c = 0; c < n; c++) {
    const data = buffer.getChannelData(c)
    for (let i = 0; i < mixed.length; i++) {
      mixed[i] += data[i] ?? 0
    }
  }
  for (let i = 0; i < mixed.length; i++) mixed[i] /= n
  return mixed
}
