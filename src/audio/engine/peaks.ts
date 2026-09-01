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

export type PeakMip = { hop: number; min: Float32Array; max: Float32Array }

const MIP_HOPS = [32, 256, 2048, 16384]

/** Multi-resolution min/max so long field recordings are not scanned sample-by-sample. */
export function buildPeakMips(channel: Float32Array, hops = MIP_HOPS): PeakMip[] {
  const out: PeakMip[] = []
  for (const hop of hops) {
    if (hop * 4 >= channel.length) continue
    const n = Math.ceil(channel.length / hop)
    const min = new Float32Array(n)
    const max = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const from = i * hop
      const to = Math.min(channel.length, from + hop)
      let mn = channel[from] ?? 0
      let mx = mn
      for (let j = from + 1; j < to; j++) {
        const v = channel[j] ?? 0
        if (v < mn) mn = v
        if (v > mx) mx = v
      }
      min[i] = mn
      max[i] = mx
    }
    out.push({ hop, min, max })
  }
  return out
}

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

/** Use a mip level when each pixel covers many samples; fall back to raw near 1:1 zoom. */
export function computeMinMaxCached(
  channel: Float32Array,
  mips: PeakMip[],
  startIdx: number,
  endIdx: number,
  buckets: number,
): MinMax {
  const span = Math.max(1, endIdx - startIdx)
  const spp = span / Math.max(1, buckets)
  if (spp < 8 || mips.length === 0) return computeMinMax(channel, startIdx, endIdx, buckets)
  let mip = mips[0]!
  for (const candidate of mips) {
    if (candidate.hop <= spp) mip = candidate
  }
  const n = Math.max(1, Math.floor(buckets))
  const min = new Float32Array(n)
  const max = new Float32Array(n)
  const s = Math.max(0, Math.min(startIdx, channel.length))
  const e = Math.max(s, Math.min(endIdx, channel.length))
  let peak = 0
  const bucketWidth = (e - s) / n
  for (let i = 0; i < n; i++) {
    const from = s + Math.floor(i * bucketWidth)
    const to = Math.min(e, s + Math.floor((i + 1) * bucketWidth) || from + 1)
    const bin0 = Math.max(0, Math.floor(from / mip.hop))
    const bin1 = Math.min(mip.min.length - 1, Math.floor((to - 1) / mip.hop))
    let mn = mip.min[bin0] ?? 0
    let mx = mip.max[bin0] ?? 0
    for (let b = bin0 + 1; b <= bin1; b++) {
      const lo = mip.min[b] ?? mn
      const hi = mip.max[b] ?? mx
      if (lo < mn) mn = lo
      if (hi > mx) mx = hi
    }
    min[i] = mn
    max[i] = mx
    const a = Math.max(Math.abs(mn), Math.abs(mx))
    if (a > peak) peak = a
  }
  return { min, max, peak }
}

export function samplesPerPixel(startIdx: number, endIdx: number, width: number): number {
  return Math.max(1, endIdx - startIdx) / Math.max(1, width)
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
