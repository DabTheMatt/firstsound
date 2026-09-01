/** Linear resample. Used only at export / render — never as a live graph change. */
export function resampleChannel(
  input: Float32Array,
  fromRate: number,
  toRate: number,
): Float32Array {
  if (fromRate <= 0 || toRate <= 0) return new Float32Array(input)
  if (fromRate === toRate) return new Float32Array(input)
  const ratio = toRate / fromRate
  const outLen = Math.max(1, Math.round(input.length * ratio))
  const out = new Float32Array(outLen)
  const last = input.length - 1
  for (let i = 0; i < outLen; i++) {
    const src = i / ratio
    const i0 = Math.floor(src)
    const i1 = Math.min(last, i0 + 1)
    const t = src - i0
    out[i] = (input[i0] ?? 0) * (1 - t) + (input[i1] ?? 0) * t
  }
  return out
}

export function resampleChannels(
  channels: Float32Array[],
  fromRate: number,
  toRate: number,
): Float32Array[] {
  return channels.map((ch) => resampleChannel(ch, fromRate, toRate))
}
