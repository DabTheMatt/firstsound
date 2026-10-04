import type { SpaceBucket } from './analyze'

/** The space bucket closest to a time. Playback uses this so the head follows the sample. */
export function nearestSpaceBucket(buckets: readonly SpaceBucket[], time: number | null): SpaceBucket | null {
  if (buckets.length === 0 || time === null || !Number.isFinite(time)) return null
  let best = buckets[0]
  if (!best) return null
  let bestDist = Math.abs(best.time - time)
  for (let index = 1; index < buckets.length; index += 1) {
    const bucket = buckets[index]
    if (!bucket) continue
    const dist = Math.abs(bucket.time - time)
    if (dist < bestDist) {
      best = bucket
      bestDist = dist
    }
  }
  return best
}

export function balanceLabel(balance: number): string {
  if (Math.abs(balance) < 0.03) return 'CENTER'
  return `${balance > 0 ? 'R' : 'L'} ${Math.round(Math.abs(balance) * 100)}%`
}
