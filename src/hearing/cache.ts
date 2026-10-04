/** Stable identity for a static analysis. Transient spectra are not stored here. */

import type { AnalysisScope } from './analyze'

export type AnalysisKey = {
  bufferRev: number
  sampleRate: number
  startFrame: number
  endFrame: number
  scope: AnalysisScope
  soundMap: boolean
  channels: number
}

export function analysisCacheKey(key: AnalysisKey): string {
  return [
    key.bufferRev,
    key.sampleRate,
    key.startFrame,
    key.endFrame,
    key.scope,
    key.soundMap ? 1 : 0,
    key.channels,
  ].join('|')
}
