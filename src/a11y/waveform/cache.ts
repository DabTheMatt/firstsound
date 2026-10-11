import type { DetectedLandmark } from './detect'

export type RecordingIdentity = {
  revision: number
  sampleRate: number
  frames: number
  channels: number
}

const MAX_ENTRIES = 4
const cache = new Map<string, DetectedLandmark[]>()
let scansStarted = 0

/** Stable for a recording. UI settings are not part of the key. */
export function recordingKey(identity: RecordingIdentity): string {
  return `${identity.revision}:${identity.sampleRate}:${identity.frames}:${identity.channels}`
}

export function readLandmarkCache(key: string): DetectedLandmark[] | null {
  return cache.get(key) ?? null
}

export function writeLandmarkCache(key: string, marks: DetectedLandmark[]): void {
  if (cache.has(key)) cache.delete(key)
  cache.set(key, marks)
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value
    if (oldest == null) break
    cache.delete(oldest)
  }
}

export function noteLandmarkScan(): void {
  scansStarted += 1
}

export function landmarkScanCount(): number {
  return scansStarted
}

export function resetLandmarkCache(): void {
  cache.clear()
  scansStarted = 0
}
