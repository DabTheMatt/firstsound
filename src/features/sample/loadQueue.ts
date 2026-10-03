/**
 * One in-flight sample read per track.
 * The newest deliberate selection wins. An older decode must not land later.
 */

const tokens = new Map<string, number>()

export function beginTrackLoad(trackId: string): number {
  const next = (tokens.get(trackId) ?? 0) + 1
  tokens.set(trackId, next)
  return next
}

export function isLatestTrackLoad(trackId: string, token: number): boolean {
  return tokens.get(trackId) === token
}

/** Test helper. Production loads only move forward. */
export function resetTrackLoadQueue(): void {
  tokens.clear()
}
