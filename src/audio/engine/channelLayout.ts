function allocF32(n: number): Float32Array<ArrayBuffer> {
  return new Float32Array(new ArrayBuffer(Math.max(0, n) * Float32Array.BYTES_PER_ELEMENT))
}

/** Mix every channel equally into one buffer. */
export function mixChannelsToMono(channels: ArrayLike<ArrayLike<number>>): Float32Array<ArrayBuffer> {
  const first = channels[0]
  const n = first?.length ?? 0
  const out = allocF32(n)
  const count = channels.length
  if (count <= 0 || n <= 0) return out
  for (let c = 0; c < count; c++) {
    const data = channels[c]
    if (!data) continue
    const len = Math.min(n, data.length)
    for (let i = 0; i < len; i++) out[i]! += data[i] ?? 0
  }
  const g = 1 / count
  for (let i = 0; i < n; i++) out[i]! *= g
  return out
}

/** Duplicate a mono lane onto left and right. */
export function duplicateMonoToStereo(mono: ArrayLike<number>): {
  left: Float32Array<ArrayBuffer>
  right: Float32Array<ArrayBuffer>
} {
  const n = mono.length
  const left = allocF32(n)
  const right = allocF32(n)
  for (let i = 0; i < n; i++) {
    const s = mono[i] ?? 0
    left[i] = s
    right[i] = s
  }
  return { left, right }
}

export function copyChannel(src: ArrayLike<number>): Float32Array<ArrayBuffer> {
  const n = src.length
  const out = allocF32(n)
  for (let i = 0; i < n; i++) out[i] = src[i] ?? 0
  return out
}

export type ChannelLayoutMode = 'original' | 'mono' | 'stereo'

export function nextChannelLayout(
  current: ChannelLayoutMode,
  action: 'mono' | 'stereo' | 'original',
): ChannelLayoutMode {
  if (action === 'original') return 'original'
  if (action === current) return 'original'
  return action
}
