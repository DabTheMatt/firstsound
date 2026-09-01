export type ZeroCrossingHint = {
  index: number
  score: number
}

/**
 * Pick a zero crossing near `index` that is quiet on both channels and does
 * not jump — never the first sign change blindly.
 */
export function findZeroCrossing(
  channels: readonly Float32Array[],
  index: number,
  searchRadius: number,
): number {
  if (channels.length === 0) return index
  const len = channels[0]?.length ?? 0
  if (len <= 2) return 0
  const center = Math.min(Math.max(Math.round(index), 1), len - 2)
  const radius = Math.max(1, Math.round(searchRadius))
  const from = Math.max(1, center - radius)
  const to = Math.min(len - 1, center + radius)

  let best: ZeroCrossingHint | null = null
  for (let i = from; i < to; i++) {
    if (!isCrossing(channels, i)) continue
    const amp = combinedAbs(channels, i)
    const jump = combinedAbsDelta(channels, i)
    const dist = Math.abs(i - center) / radius
    const score = amp * 4 + jump * 2 + dist
    if (!best || score < best.score) best = { index: i, score }
  }
  return best?.index ?? center
}

function isCrossing(channels: readonly Float32Array[], i: number): boolean {
  let any = false
  for (const ch of channels) {
    const a = ch[i - 1] ?? 0
    const b = ch[i] ?? 0
    if (a === 0 || b === 0 || a * b < 0) any = true
    else return false
  }
  return any
}

function combinedAbs(channels: readonly Float32Array[], i: number): number {
  let sum = 0
  for (const ch of channels) sum += Math.abs(ch[i] ?? 0)
  return sum / channels.length
}

function combinedAbsDelta(channels: readonly Float32Array[], i: number): number {
  let sum = 0
  for (const ch of channels) {
    sum += Math.abs((ch[i] ?? 0) - (ch[i - 1] ?? 0))
  }
  return sum / channels.length
}

export function secondsToIndex(time: number, sampleRate: number, length: number): number {
  return Math.min(length - 1, Math.max(0, Math.round(time * sampleRate)))
}

export function indexToSeconds(index: number, sampleRate: number): number {
  return sampleRate > 0 ? index / sampleRate : 0
}
