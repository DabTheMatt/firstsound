import { formatTimecode } from '../../audio/engine/formatTime'
import { validatePlayhead, type EditResult } from '../../edit/dragFree/edits'
import type { NavStepId } from './types'

/** RMS and peak are measured over this window centered on the playhead. */
export const INSPECT_WINDOW_SEC = 0.05

export function navStepSeconds(id: NavStepId, sampleRate: number): number | null {
  switch (id) {
    case '10s':
      return 10
    case '1s':
      return 1
    case '100ms':
      return 0.1
    case '10ms':
      return 0.01
    case 'sample':
      return sampleRate > 0 ? 1 / sampleRate : null
    default:
      return null
  }
}

/** Inclusive frame count. The exclusive end frame equals the buffer length. */
export function frameCountFor(duration: number, sampleRate: number): number {
  if (!(sampleRate > 0) || !(duration > 0)) return 0
  return Math.max(0, Math.round(duration * sampleRate))
}

/**
 * Move by an integer number of milliseconds, or by one sample when the step is one sample period.
 * Sample steps use the buffer rate. Millisecond steps do not claim sample accuracy.
 */
export function stepTimeline(
  current: number,
  direction: -1 | 1,
  duration: number,
  stepSec: number,
  sampleRate: number,
): EditResult<number> {
  if (!(stepSec > 0)) return validatePlayhead(Math.min(duration, Math.max(0, current)), duration)
  const sample = sampleRate > 0 ? 1 / sampleRate : 0
  if (sample > 0 && Math.abs(stepSec - sample) <= sample * 1e-6) {
    const frames = frameCountFor(duration, sampleRate)
    let frame = Math.round(Math.max(0, current) * sampleRate)
    frame = Math.min(frames, Math.max(0, frame)) + direction
    frame = Math.min(frames, Math.max(0, frame))
    return validatePlayhead(frame / sampleRate, duration)
  }
  const ms = Math.round(Math.max(0, current) * 1000) + direction * Math.round(stepSec * 1000)
  const limit = Math.round(Math.max(0, duration) * 1000)
  return validatePlayhead(Math.min(limit, Math.max(0, ms)) / 1000, duration)
}

/** Minutes, seconds, and milliseconds. Hours appear only after one hour. */
export function formatAccessibleClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0
  const ms = Math.round(seconds * 1000)
  const hours = Math.floor(ms / 3_600_000)
  const rest = ms - hours * 3_600_000
  const clock = formatTimecode(rest / 1000, 3)
  if (hours <= 0) return clock
  return `${hours}:${clock}`
}

export function kilohertzLabel(sampleRate: number): string {
  if (!(sampleRate > 0)) return '0'
  const khz = sampleRate / 1000
  if (Math.abs(khz - Math.round(khz)) < 1e-6) return String(Math.round(khz))
  return (Math.round(khz * 10) / 10).toFixed(1)
}

export function speakAccessibleTime(seconds: number, locale: 'en' | 'pl'): string {
  const ms = Math.round((Number.isFinite(seconds) ? Math.max(0, seconds) : 0) * 1000)
  const hours = Math.floor(ms / 3_600_000)
  const minutes = Math.floor((ms % 3_600_000) / 60_000)
  const secs = Math.floor((ms % 60_000) / 1000)
  const frac = ms % 1000
  const sec = frac === 0 ? String(secs) : `${secs}.${String(frac).padStart(3, '0').replace(/0+$/, '')}`
  if (locale === 'pl') {
    const clock = hours > 0 ? `${hours} godz. ${minutes} min ${sec} s` : minutes > 0 ? `${minutes} min ${sec} s` : `${sec} sekund`
    return clock
  }
  const parts: string[] = []
  if (hours) parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`)
  if (minutes) parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`)
  parts.push(`${sec} ${secs === 1 && frac === 0 ? 'second' : 'seconds'}`)
  return parts.join(' ')
}

/** Window around `center`, shifted so it stays inside the recording. */
export function inspectBounds(center: number, duration: number, windowSec = INSPECT_WINDOW_SEC): { start: number; end: number } {
  if (!(duration > 0)) return { start: 0, end: 0 }
  const width = Math.min(Math.max(0, windowSec), duration)
  let start = center - width / 2
  let end = start + width
  if (start < 0) {
    end -= start
    start = 0
  }
  if (end > duration) {
    start -= end - duration
    end = duration
  }
  start = Math.max(0, start)
  end = Math.min(duration, Math.max(start, end))
  return { start, end }
}
