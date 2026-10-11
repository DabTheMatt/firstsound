import { amplitudeToDbfs, formatDb } from '../../hearing/levels'
import { inspectBounds } from './time'

export type ChannelLevel = {
  peak: number
  peakDbfs: number | null
  rms: number
  rmsDbfs: number | null
}

export type SignalReading = {
  start: number
  end: number
  windowSec: number
  channels: ChannelLevel[]
  /** True when every channel in the window is below the low-level RMS threshold. */
  lowLevel: boolean
}

/** About −48 dBFS. A window under this RMS is low-level, not guaranteed silence. */
export const LOW_LEVEL_RMS = 10 ** (-48 / 20)

function channelLevel(samples: ArrayLike<number>, from: number, to: number): ChannelLevel {
  let peak = 0
  let sum = 0
  let count = 0
  const start = Math.max(0, Math.floor(from))
  const end = Math.min(samples.length, Math.max(start, Math.ceil(to)))
  for (let i = start; i < end; i++) {
    const value = samples[i] ?? 0
    const amp = Math.abs(value)
    if (amp > peak) peak = amp
    sum += value * value
    count++
  }
  const rms = count > 0 ? Math.sqrt(sum / count) : 0
  return { peak, peakDbfs: amplitudeToDbfs(peak), rms, rmsDbfs: amplitudeToDbfs(rms) }
}

/** Peak and RMS over a bounded window. A single sample is not reported as RMS. */
export function measureWindow(
  channels: ArrayLike<number>[],
  sampleRate: number,
  centerSec: number,
  durationSec: number,
): SignalReading | null {
  if (!(sampleRate > 0) || channels.length === 0 || !(durationSec > 0)) return null
  const bounds = inspectBounds(centerSec, durationSec)
  const frames = bounds.end - bounds.start
  if (!(frames > 1 / sampleRate)) return null
  const from = Math.round(bounds.start * sampleRate)
  const to = Math.round(bounds.end * sampleRate)
  if (to - from < 2) return null
  const levels = channels.map((channel) => channelLevel(channel, from, to))
  return {
    start: bounds.start,
    end: bounds.end,
    windowSec: bounds.end - bounds.start,
    channels: levels,
    lowLevel: levels.every((level) => level.rms < LOW_LEVEL_RMS),
  }
}

export function formatLevel(db: number | null): string {
  return formatDb(db, 1)
}
