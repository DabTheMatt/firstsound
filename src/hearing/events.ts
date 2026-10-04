/**
 * Conservative event detection on a PCM span.
 * Nearby hits of the same kind collapse into one marker.
 * Heuristic hits use "possible" in the label.
 */

import type { AnalysisScope } from './analyze'
import { CLIP_AMPLITUDE, amplitudeToDbfs } from './levels'
import type { EventKind } from './settings'

export type HearingEvent = {
  id: string
  kind: EventKind
  /** Seconds from the start of the sample, not the span. */
  time: number
  duration: number
  label: string
  detail: string
  confidence: 'measured' | 'possible'
}

const BLOCK = 256
const MERGE_SEC = 0.08
const MAX_EVENTS = 48

const LABELS: Record<EventKind, string> = {
  transient: 'TRANSIENT',
  silence: 'SILENCE START',
  loud: 'LOUD EVENT',
  lowFrequency: 'LOW-FREQUENCY EVENT',
  tonal: 'TONAL EVENT',
  possibleClick: 'POSSIBLE CLICK',
  possibleClip: 'POSSIBLE CLIPPING',
}

type Hit = {
  kind: EventKind
  time: number
  duration: number
  score: number
  detail: string
  confidence: HearingEvent['confidence']
}

function sampleAt(data: ArrayLike<number>, index: number): number {
  const value = data[index] ?? 0
  return Number.isFinite(value) ? value : 0
}

function mix(left: ArrayLike<number>, right: ArrayLike<number> | null | undefined, index: number): number {
  const l = sampleAt(left, index)
  if (!right || index >= right.length) return l
  return (l + sampleAt(right, index)) * 0.5
}

export function detectEvents(
  left: ArrayLike<number>,
  right: ArrayLike<number> | null | undefined,
  sampleRate: number,
  startFrame: number,
  endFrame: number,
  originSec: number,
): HearingEvent[] {
  const rate = sampleRate > 0 ? sampleRate : 44100
  const start = Math.max(0, Math.floor(startFrame))
  const end = Math.max(start, Math.min(left.length, Math.floor(endFrame)))
  const frames = end - start
  if (frames < 8) return []
  const hits: Hit[] = []
  let prevPeak = 0
  let prevRms = 0
  let silenceRun = 0
  let silenceStart = 0
  let tonalRun = 0
  let tonalStart = 0
  let low = 0

  const flushSilence = () => {
    const dur = silenceRun / rate
    if (dur >= 0.15) {
      hits.push({
        kind: 'silence',
        time: originSec + (silenceStart - start) / rate,
        duration: dur,
        score: dur,
        detail: `RMS below −70 dBFS for ${dur.toFixed(2)} s`,
        confidence: 'measured',
      })
    }
    silenceRun = 0
  }

  const flushTonal = () => {
    const dur = tonalRun / rate
    if (dur >= 0.2) {
      hits.push({
        kind: 'tonal',
        time: originSec + (tonalStart - start) / rate,
        duration: dur,
        score: dur,
        detail: `Sustained low zero-crossing rate for ${dur.toFixed(2)} s`,
        confidence: 'possible',
      })
    }
    tonalRun = 0
  }

  for (let from = start; from < end; from += BLOCK) {
    const to = Math.min(end, from + BLOCK)
    let peak = 0
    let sumSq = 0
    let count = 0
    let clips = 0
    let crossings = 0
    let prev = 0
    let lowEnergy = 0
    let highEnergy = 0
    for (let i = from; i < to; i++) {
      const x = mix(left, right, i)
      const amp = Math.abs(x)
      if (amp > peak) peak = amp
      sumSq += x * x
      count++
      if (amp >= CLIP_AMPLITUDE) clips++
      if (i > from && ((prev <= 0 && x > 0) || (prev >= 0 && x < 0))) crossings++
      prev = x
      low += 0.12 * (x - low)
      const hp = x - low
      lowEnergy += low * low
      highEnergy += hp * hp
    }
    const rms = count > 0 ? Math.sqrt(sumSq / count) : 0
    const time = originSec + (from - start) / rate
    const peakDb = amplitudeToDbfs(peak)
    const rmsDb = amplitudeToDbfs(rms)

    if (rms < 0.0003 && peak < 0.001) {
      if (silenceRun === 0) silenceStart = from
      silenceRun += to - from
      flushTonal()
    } else {
      flushSilence()
    }

    if (clips > 0) {
      hits.push({
        kind: 'possibleClip',
        time,
        duration: (to - from) / rate,
        score: clips,
        detail: `${clips} sample${clips === 1 ? '' : 's'} at or above ${CLIP_AMPLITUDE} (±0.1 dB of full scale)`,
        confidence: 'measured',
      })
    }

    const fromQuiet = prevRms < 0.01
    const onset =
      from > start &&
      peak > 0.12 &&
      (peakDb ?? -120) > -24 &&
      (fromQuiet ? peak > 0.12 : peak > prevRms * 6)
    if (onset) {
      const lowShare = lowEnergy + highEnergy > 0 ? lowEnergy / (lowEnergy + highEnergy) : 0
      const short = peak > prevPeak * 8
      if (short && (peakDb ?? -120) > -18 && lowShare < 0.72) {
        hits.push({
          kind: 'possibleClick',
          time,
          duration: (to - from) / rate,
          score: peak,
          detail: `Short level jump${peakDb !== null ? `, peak ${peakDb.toFixed(1)} dBFS` : ''}`,
          confidence: 'possible',
        })
      } else if (lowShare >= 0.72) {
        hits.push({
          kind: 'lowFrequency',
          time,
          duration: (to - from) / rate,
          score: peak,
          detail: `Onset with ${Math.round(lowShare * 100)}% of block energy in the low band`,
          confidence: 'measured',
        })
      } else {
        hits.push({
          kind: 'transient',
          time,
          duration: (to - from) / rate,
          score: peak,
          detail: peakDb !== null ? `Peak ${peakDb.toFixed(1)} dBFS` : 'Level onset',
          confidence: 'measured',
        })
      }
    } else if ((peakDb ?? -120) >= -6 && peak > prevPeak * 1.4) {
      hits.push({
        kind: 'loud',
        time,
        duration: (to - from) / rate,
        score: peak,
        detail: peakDb !== null ? `Peak ${peakDb.toFixed(1)} dBFS` : 'High level',
        confidence: 'measured',
      })
    }

    const zcr = ((crossings / Math.max(1, to - from)) * rate)
    const tonalish = (rmsDb ?? -120) > -36 && zcr > 40 && zcr < 2500 && peak < rms * 4
    if (tonalish && !onset) {
      if (tonalRun === 0) tonalStart = from
      tonalRun += to - from
    } else {
      flushTonal()
    }

    prevPeak = Math.max(peak, prevPeak * 0.9)
    prevRms = rms
  }
  flushSilence()
  flushTonal()

  return clusterEvents(hits).slice(0, MAX_EVENTS)
}

function clusterEvents(hits: Hit[]): HearingEvent[] {
  const sorted = [...hits].sort((a, b) => a.time - b.time || b.score - a.score)
  const kept: Hit[] = []
  for (const hit of sorted) {
    const previous = kept.find((item) => item.kind === hit.kind && Math.abs(item.time - hit.time) <= MERGE_SEC)
    if (previous) {
      if (hit.score > previous.score) {
        previous.score = hit.score
        previous.detail = hit.detail
        previous.time = Math.min(previous.time, hit.time)
      }
      previous.duration = Math.max(previous.duration, hit.duration)
      continue
    }
    kept.push({ ...hit })
  }
  kept.sort((a, b) => a.time - b.time)
  const capped = kept.length > MAX_EVENTS ? kept.sort((a, b) => b.score - a.score).slice(0, MAX_EVENTS).sort((a, b) => a.time - b.time) : kept
  return capped.map((hit, index) => ({
    id: `${hit.kind}-${index}-${Math.round(hit.time * 1000)}`,
    kind: hit.kind,
    time: hit.time,
    duration: hit.duration,
    label: LABELS[hit.kind],
    detail: hit.detail,
    confidence: hit.confidence,
  }))
}

export function filterEvents(events: readonly HearingEvent[], enabled: Partial<Record<EventKind, boolean>>): HearingEvent[] {
  return events.filter((event) => enabled[event.kind] !== false)
}

export type TransientMark = { time: number; label: string }

/** Measured transient events, plus dynamics-map onsets that are not already marked. */
export function transientMarkers(
  events: readonly HearingEvent[],
  dynamics: readonly { time: number; transient: boolean }[] | null | undefined,
): TransientMark[] {
  const marks: TransientMark[] = events
    .filter((event) => event.kind === 'transient')
    .map((event) => ({ time: event.time, label: event.label }))
  for (const bucket of dynamics ?? []) {
    if (!bucket.transient) continue
    if (marks.some((mark) => Math.abs(mark.time - bucket.time) < 0.08)) continue
    marks.push({ time: bucket.time, label: 'TRANSIENT' })
  }
  marks.sort((a, b) => a.time - b.time)
  return marks.slice(0, 40)
}

export function scopeLabel(scope: AnalysisScope): string {
  if (scope === 'selection') return 'SELECTION'
  if (scope === 'current') return 'CURRENT'
  return 'FULL SAMPLE'
}
