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
