import { detectTransients } from '../../audio/engine/transients'
import { LOW_LEVEL_RMS } from './measure'
import type { DetectedLandmarkType } from './types'

/**
 * Detected events are approximate.
 * Low-level means RMS below about −48 dBFS for at least 120 ms. That is not absolute silence.
 * Transients reuse the editor onset detector. They are not musical beats.
 * Level changes are short-term RMS jumps of at least 12 dB. They are not LUFS.
 */

export type DetectedLandmark = {
  type: DetectedLandmarkType
  time: number
  confidence?: number
}

const HOP_SEC = 0.02
const LOW_LEVEL_MIN_SEC = 0.12
const LEVEL_WINDOW_SEC = 0.1
const LEVEL_CHANGE_DB = 12
const LEVEL_FLOOR_LINEAR = 10 ** (-50 / 20)
const LEVEL_MIN_GAP_SEC = 0.3
const MAX_LEVEL_CHANGES = 48
const TRANSIENT_STORE_MAX = 160
const TRANSIENT_GAP_SEC = 0.05
const TRANSIENT_GAP_WHEN_DENSE_SEC = 0.18
const TRANSIENT_SENSITIVITY = 0.35
const CHUNK_SEC = 4
const OVERLAP_SEC = 0.2
const MAX_HOPS = 120_000

type ScanOptions = {
  yield: boolean
  isCancelled: () => boolean
}

function hopSeconds(durationSec: number): number {
  if (!(durationSec > 0)) return HOP_SEC
  const hops = durationSec / HOP_SEC
  if (hops <= MAX_HOPS) return HOP_SEC
  return durationSec / MAX_HOPS
}

function mixInto(channels: Float32Array[], from: number, to: number, dest: Float32Array): number {
  const count = Math.max(0, to - from)
  const mix = channels.length
  for (let i = 0; i < count; i++) {
    let sum = 0
    const index = from + i
    for (let c = 0; c < mix; c++) sum += channels[c]?.[index] ?? 0
    dest[i] = mix > 0 ? sum / mix : 0
  }
  return count
}

function rmsDbDelta(prev: number, next: number): number {
  if (!(prev > 0) || !(next > 0)) return 0
  return Math.abs(20 * Math.log10(next / prev))
}

async function maybeYield(options: ScanOptions): Promise<boolean> {
  if (options.isCancelled()) return false
  if (!options.yield) return true
  await new Promise((resolve) => setTimeout(resolve, 0))
  return !options.isCancelled()
}

/** Drop steady tones. A mark has to rise above the level around it. */
function isProminent(channels: Float32Array[], sampleRate: number, time: number): boolean {
  const length = channels[0]?.length ?? 0
  if (length < 8) return false
  const center = Math.round(time * sampleRate)
  const inner = Math.max(1, Math.round(sampleRate * 0.015))
  const outer = Math.max(inner + 1, Math.round(sampleRate * 0.06))
  let peak = 0
  let sum = 0
  let count = 0
  const from = Math.max(0, center - outer)
  const to = Math.min(length, center + outer)
  for (let i = from; i < to; i++) {
    let mixed = 0
    for (let c = 0; c < channels.length; c++) mixed += channels[c]?.[i] ?? 0
    mixed /= channels.length
    const amp = Math.abs(mixed)
    if (Math.abs(i - center) <= inner) {
      if (amp > peak) peak = amp
    } else {
      sum += mixed * mixed
      count++
    }
  }
  const rms = count > 0 ? Math.sqrt(sum / count) : 0
  if (peak < 0.02) return false
  return peak > rms * 3.2 + 0.008
}

function addTransient(times: number[], time: number): void {
  const gap = times.length < 120 ? TRANSIENT_GAP_SEC : TRANSIENT_GAP_WHEN_DENSE_SEC
  const last = times[times.length - 1]
  if (last != null && time - last < gap) return
  if (times.length >= TRANSIENT_STORE_MAX) return
  times.push(time)
}

/**
 * One pass over channel views. The scratch buffer is one chunk, not a second copy of the file.
 * `null` means the caller cancelled the scan.
 */
export async function scanLandmarks(
  channels: Float32Array[],
  sampleRate: number,
  options: ScanOptions,
): Promise<DetectedLandmark[] | null> {
  const length = channels[0]?.length ?? 0
  if (!(sampleRate > 0) || length < 8 || channels.length === 0) return []
  const hopSec = hopSeconds(length / sampleRate)
  const hopFrames = Math.max(1, Math.round(sampleRate * hopSec))
  const chunkFrames = Math.max(hopFrames * 8, Math.round(sampleRate * CHUNK_SEC))
  const overlapFrames = Math.min(Math.round(sampleRate * OVERLAP_SEC), Math.floor(chunkFrames / 4))
  const scratch = new Float32Array(chunkFrames)
  const transients: number[] = []
  const low: { start: number; end: number }[] = []
  const levels: DetectedLandmark[] = []
  let lowStart = -1
  let hopFrame = 0
  let windowSum = 0
  let windowFrames = 0
  let windowStart = 0
  let prevWindowRms = 0
  let lastLevelTime = -1

  const flushLow = (endFrame: number) => {
    if (lowStart < 0) return
    const startSec = lowStart / sampleRate
    const endSec = endFrame / sampleRate
    if (endSec - startSec >= LOW_LEVEL_MIN_SEC - 1e-6) low.push({ start: startSec, end: endSec })
    lowStart = -1
  }

  const consumeHops = (upTo: number) => {
    while (hopFrame + hopFrames <= upTo) {
      let sum = 0
      let peak = 0
      const from = hopFrame
      const to = hopFrame + hopFrames
      for (let i = from; i < to; i++) {
        let mixed = 0
        for (let c = 0; c < channels.length; c++) mixed += channels[c]?.[i] ?? 0
        mixed /= channels.length
        const amp = Math.abs(mixed)
        if (amp > peak) peak = amp
        sum += mixed * mixed
      }
      const rms = Math.sqrt(sum / hopFrames)
      if (rms < LOW_LEVEL_RMS && peak < LOW_LEVEL_RMS * 4) {
        if (lowStart < 0) lowStart = from
      } else flushLow(from)
      windowSum += sum
      windowFrames += hopFrames
      if (windowFrames >= Math.round(sampleRate * LEVEL_WINDOW_SEC)) {
        const rmsWindow = Math.sqrt(windowSum / windowFrames)
        const time = windowStart / sampleRate
        if (prevWindowRms > 0 && rmsWindow > 0) {
          const louder = Math.max(prevWindowRms, rmsWindow)
          const delta = rmsDbDelta(prevWindowRms, rmsWindow)
          if (
            delta >= LEVEL_CHANGE_DB &&
            louder >= LEVEL_FLOOR_LINEAR &&
            (lastLevelTime < 0 || time - lastLevelTime >= LEVEL_MIN_GAP_SEC) &&
            levels.length < MAX_LEVEL_CHANGES
          ) {
            levels.push({
              type: 'level-change',
              time,
              confidence: Math.min(1, delta / 36),
            })
            lastLevelTime = time
          }
        }
        prevWindowRms = rmsWindow
        windowSum = 0
        windowFrames = 0
        windowStart = to
      }
      hopFrame = to
    }
  }

  let frame = 0
  while (frame < length) {
    if (!(await maybeYield(options))) return null
    const end = Math.min(length, frame + chunkFrames)
    const count = mixInto(channels, frame, end, scratch)
    consumeHops(end)
    if (count >= 32) {
      const found = detectTransients(scratch.subarray(0, count), sampleRate, frame / sampleRate, TRANSIENT_SENSITIVITY)
      const minTime = frame === 0 ? 0 : (frame + overlapFrames) / sampleRate
      for (const time of found) {
        if (time + 1e-4 < minTime) continue
        if (!isProminent(channels, sampleRate, time)) continue
        addTransient(transients, time)
      }
    }
    if (end >= length) break
    frame = Math.max(frame + 1, end - overlapFrames)
  }
  if (lowStart >= 0) flushLow(length)

  const marks: DetectedLandmark[] = []
  for (const span of low) {
    marks.push({ type: 'low-level-start', time: span.start })
    marks.push({ type: 'low-level-end', time: span.end })
  }
  for (const time of transients) marks.push({ type: 'transient', time })
  marks.push(...levels)
  marks.sort((a, b) => a.time - b.time || a.type.localeCompare(b.type))
  return marks
}

/** Runs to completion on the caller turn. Short fixtures use this. */
export async function detectLandmarks(channels: Float32Array[], sampleRate: number): Promise<DetectedLandmark[]> {
  const marks = await scanLandmarks(channels, sampleRate, { yield: false, isCancelled: () => false })
  return marks ?? []
}

/** Yields between chunks so a long file does not stall the main thread. `null` means cancelled. */
export function detectLandmarksCancellable(
  channels: Float32Array[],
  sampleRate: number,
  isCancelled: () => boolean,
): Promise<DetectedLandmark[] | null> {
  return scanLandmarks(channels, sampleRate, { yield: true, isCancelled })
}
