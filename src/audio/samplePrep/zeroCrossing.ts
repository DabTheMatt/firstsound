export type ZeroCrossingHit = {
  index: number
  seconds: number
  distanceSec: number
  far: boolean
  score: number
}

function ampAt(channels: Float32Array[], i: number): number {
  let sum = 0
  for (const ch of channels) sum += Math.abs(ch[i] ?? 0)
  return sum / Math.max(1, channels.length)
}

function jumpAt(channels: Float32Array[], i: number): number {
  if (i <= 0) return 1
  let sum = 0
  for (const ch of channels) {
    sum += Math.abs((ch[i] ?? 0) - (ch[i - 1] ?? 0))
  }
  return sum / Math.max(1, channels.length)
}

function isCrossing(channels: Float32Array[], i: number): boolean {
  if (i <= 0) return false
  let anySign = false
  let allNear = true
  for (const ch of channels) {
    const a = ch[i - 1] ?? 0
    const b = ch[i] ?? 0
    const signChange = (a > 0 && b <= 0) || (a < 0 && b >= 0)
    if (signChange) anySign = true
    if (Math.abs(a) > 0.08 && Math.abs(b) > 0.08) allNear = false
  }
  return anySign && allNear
}

/**
 * Search a small window around `index` for a quiet, low-jump zero crossing
 * on all channels. Prefers proximity; refuses huge leaps (caller should warn).
 */
export function findZeroCrossing(
  channels: Float32Array[],
  sampleRate: number,
  seconds: number,
  searchSec = 0.08,
  warnSec = 0.04,
): ZeroCrossingHit | null {
  if (!channels.length || sampleRate <= 0) return null
  const len = channels[0]?.length ?? 0
  if (len < 3) return null
  const center = Math.min(len - 1, Math.max(1, Math.round(seconds * sampleRate)))
  const radius = Math.max(2, Math.floor(searchSec * sampleRate))
  const from = Math.max(1, center - radius)
  const to = Math.min(len - 1, center + radius)

  let best: ZeroCrossingHit | null = null
  for (let i = from; i <= to; i++) {
    if (!isCrossing(channels, i)) continue
    const amp = ampAt(channels, i)
    const jump = jumpAt(channels, i)
    const dist = Math.abs(i - center) / sampleRate
    // Lower is better: quiet, smooth, close.
    const score = amp * 8 + jump * 12 + dist * 4
    if (!best || score < best.score) {
      best = {
        index: i,
        seconds: i / sampleRate,
        distanceSec: dist,
        far: dist > warnSec,
        score,
      }
    }
  }
  return best
}

export function snapSeconds(
  channels: Float32Array[],
  sampleRate: number,
  seconds: number,
  searchSec?: number,
  warnSec?: number,
): number {
  const hit = findZeroCrossing(channels, sampleRate, seconds, searchSec, warnSec)
  if (!hit || hit.far) return seconds
  return hit.seconds
}
