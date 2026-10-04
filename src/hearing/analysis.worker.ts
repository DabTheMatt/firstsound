/** Background entry for long static analyses. The main thread uses analyzePcm directly for short spans. */

import { analyzePcm, type AnalysisScope, type BufferAnalysis } from './analyze'

export type WorkerRequest = {
  left: Float32Array
  right: Float32Array | null
  sampleRate: number
  startFrame: number
  endFrame: number
  originSec: number
  scope: AnalysisScope
  soundMap: boolean
}

export type WorkerResponse = {
  ok: true
  analysis: BufferAnalysis
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const data = event.data
  const analysis = analyzePcm(
    {
      left: data.left,
      right: data.right,
      sampleRate: data.sampleRate,
      startFrame: data.startFrame,
      endFrame: data.endFrame,
      originSec: data.originSec,
      scope: data.scope,
    },
    { soundMap: data.soundMap, maxMapColumns: 96 },
  )
  const response: WorkerResponse = { ok: true, analysis }
  self.postMessage(response)
}
