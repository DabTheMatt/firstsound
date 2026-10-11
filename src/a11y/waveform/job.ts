import { noteLandmarkScan, readLandmarkCache, recordingKey, writeLandmarkCache, type RecordingIdentity } from './cache'
import { detectLandmarksCancellable, type DetectedLandmark } from './detect'
import { scanWithWorker, workerFits } from './workerClient'

export type LandmarkJob = {
  cancel: () => void
  done: Promise<DetectedLandmark[] | null>
}

function mixMono(channels: Float32Array[]): Float32Array {
  const length = channels[0]?.length ?? 0
  const mono = new Float32Array(length)
  const mix = Math.max(1, channels.length)
  for (let i = 0; i < length; i++) {
    let sum = 0
    for (let c = 0; c < channels.length; c++) sum += channels[c]?.[i] ?? 0
    mono[i] = sum / mix
  }
  return mono
}

/**
 * Starts analysis for one recording identity.
 * A cache hit does not scan again. Cancellation drops the result.
 * Long files stay on chunked channel views so a second full buffer is not kept.
 */
export function startLandmarkJob(
  identity: RecordingIdentity,
  channels: Float32Array[],
  stillCurrent: () => boolean,
): LandmarkJob {
  const key = recordingKey(identity)
  const cached = readLandmarkCache(key)
  let cancelled = false
  if (cached) {
    return {
      cancel: () => {
        cancelled = true
      },
      done: Promise.resolve(cached),
    }
  }
  noteLandmarkScan()
  const isCancelled = () => cancelled || !stillCurrent()
  const frames = channels[0]?.length ?? 0
  const done = (async (): Promise<DetectedLandmark[] | null> => {
    let marks: DetectedLandmark[] | null = null
    if (workerFits(frames, identity.sampleRate)) {
      const mono = mixMono(channels)
      if (isCancelled()) return null
      marks = await scanWithWorker(mono, identity.sampleRate, isCancelled)
    }
    if (!marks) {
      if (isCancelled()) return null
      marks = await detectLandmarksCancellable(channels, identity.sampleRate, isCancelled)
    }
    if (!marks || isCancelled()) return null
    writeLandmarkCache(key, marks)
    return marks
  })()
  return {
    cancel: () => {
      cancelled = true
    },
    done,
  }
}
