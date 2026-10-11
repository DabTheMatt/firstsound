import type { DetectedLandmark } from './detect'

const WORKER_LIMIT_SEC = 8 * 60

export function workerFits(frames: number, sampleRate: number): boolean {
  if (typeof Worker === 'undefined') return false
  if (!(sampleRate > 0) || frames <= 0) return false
  return frames / sampleRate <= WORKER_LIMIT_SEC
}

/** Transfers one mono copy. The engine buffer stays where it is. */
export function scanWithWorker(
  mono: Float32Array,
  sampleRate: number,
  isCancelled: () => boolean,
): Promise<DetectedLandmark[] | null> {
  return new Promise((resolve) => {
    let worker: Worker
    try {
      worker = new Worker(new URL('./landmark.worker.ts', import.meta.url), { type: 'module' })
    } catch {
      resolve(null)
      return
    }
    let settled = false
    const finish = (marks: DetectedLandmark[] | null) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      worker.terminate()
      resolve(isCancelled() ? null : marks)
    }
    const timer = window.setTimeout(() => finish(null), 20_000)
    worker.onmessage = (event: MessageEvent<{ marks: DetectedLandmark[] }>) => {
      finish(event.data?.marks ?? [])
    }
    worker.onerror = () => finish(null)
    try {
      worker.postMessage({ mono, sampleRate }, [mono.buffer])
    } catch {
      finish(null)
    }
  })
}
