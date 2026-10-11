import { useEffect, useState } from 'react'
import { engine, useEngine } from '../../hooks/useEngine'
import { readLandmarkCache, recordingKey } from './cache'
import type { DetectedLandmark } from './detect'
import { startLandmarkJob } from './job'

export type LandmarkStatus = 'idle' | 'running' | 'ready' | 'error'

function readChannels(): { channels: Float32Array[]; frames: number } | null {
  const snap = engine.getSnapshot()
  if (!snap.sampleLoaded || !(snap.sampleRate > 0) || snap.channelCount < 1) return null
  const channels: Float32Array[] = []
  for (let index = 0; index < snap.channelCount; index++) {
    const data = engine.audibleChannel(index)
    if (!data || data.length < 1) return null
    channels.push(data)
  }
  if (engine.getSnapshot().bufferRev !== snap.bufferRev) return null
  return { channels, frames: channels[0]?.length ?? 0 }
}

/** One analysis per recording identity. Closing the panel does not drop the cache. */
export function useDetectedLandmarks(enabled: boolean): { marks: DetectedLandmark[]; status: LandmarkStatus } {
  const snap = useEngine()
  const frames = enabled && snap.sampleLoaded ? (engine.audibleChannel(0)?.length ?? 0) : 0
  const key =
    snap.sampleLoaded && snap.duration > 0 && frames > 0
      ? recordingKey({
          revision: snap.bufferRev,
          sampleRate: snap.sampleRate,
          frames,
          channels: snap.channelCount,
        })
      : ''
  const [marks, setMarks] = useState<DetectedLandmark[]>([])
  const [status, setStatus] = useState<LandmarkStatus>('idle')

  useEffect(() => {
    if (!enabled || !key) {
      setMarks([])
      setStatus('idle')
      return
    }
    const cached = readLandmarkCache(key)
    if (cached) {
      setMarks(cached)
      setStatus('ready')
      return
    }
    const read = readChannels()
    const snapNow = engine.getSnapshot()
    if (!read || read.frames < 1) {
      setMarks([])
      setStatus('error')
      return
    }
    const identity = {
      revision: snapNow.bufferRev,
      sampleRate: snapNow.sampleRate,
      frames: read.frames,
      channels: read.channels.length,
    }
    const job = startLandmarkJob(identity, read.channels, () => {
      const live = engine.getSnapshot()
      return live.bufferRev === identity.revision && live.sampleRate === identity.sampleRate
    })
    setStatus('running')
    let cancelled = false
    void job.done.then((result) => {
      if (cancelled) return
      if (!result) {
        const live = engine.getSnapshot()
        if (live.bufferRev !== identity.revision) return
        setMarks([])
        setStatus('error')
        return
      }
      setMarks(result)
      setStatus('ready')
    })
    return () => {
      cancelled = true
      job.cancel()
    }
  }, [enabled, key])

  return { marks, status }
}
