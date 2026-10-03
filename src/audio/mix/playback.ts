/**
 * Authoritative per-track playback mapping.
 *
 * Project Track State (`MixTrack` + the track rack) owns identity, loop region,
 * direction, speed, and input gain. This module is the Playback Resolver:
 * one project clock in, one source position out. Live scheduling
 * (`trackVoice` / `AudioEngine`) and the multitrack waveform both call it.
 * Do not keep a second loop or speed formula in the UI.
 *
 * Project length stays the longest original source. Speed changes how much
 * of that source is heard before the project ends; looping repeats inside
 * the project and does not extend it. Pitch is a separate grain concern and
 * does not move this clock.
 *
 * Waveform peaks are immutable source data. `waveformVisualGain` only scales
 * drawing. Mixer volume is a post-chain fader and is not part of this gain.
 */

import type { PlaybackDirection } from '../parameters/types'

const EPS = 0.0005
export const MIN_LOOP_SPAN = 0.05

export type TrackClock = {
  sourceDuration: number
  speed: number
  direction: PlaybackDirection
  loop: boolean
  /** Source seconds. Ignored while loop is off. 0 with loopEnd 0 means the whole source. */
  loopStart: number
  /** Source seconds. `<= loopStart` means the whole source. */
  loopEnd: number
}

export type ResolvedPlayback = {
  /** Null once the unlooped source has been consumed. */
  sourceTime: number | null
  /** +1 forward, -1 reverse, at this project time. */
  playDirection: 1 | -1
  iteration: number
  insideLoop: boolean
  ended: boolean
  /** Source window that is actually playing (the loop fragment, or the whole file). */
  regionStart: number
  regionEnd: number
  /** Project seconds for one directional pass of the region. */
  passProjectDuration: number
  /** Project seconds until an unlooped track goes silent. */
  contentProjectDuration: number
  /** Source seconds already read since project 0. */
  consumedSource: number
}

export type WaveTile = {
  projectStart: number
  projectEnd: number
  sourceStart: number
  sourceEnd: number
  reverse: boolean
}

export function clampSpeed(speed: number): number {
  if (!Number.isFinite(speed) || speed <= 0) return 1
  return Math.min(8, Math.max(0.05, speed))
}

/** Linear display gain. dB values are never added to pixel height. */
export function waveformVisualGain(gainDb: number): number {
  if (!Number.isFinite(gainDb)) return 1
  return 10 ** (gainDb / 20)
}

/**
 * Loop fragment in source time.
 * A non-positive span means "the whole source" so older tracks stay compatible.
 */
export function loopBounds(
  sourceDuration: number,
  loopStart = 0,
  loopEnd = 0,
): { start: number; end: number } {
  const dur = Number.isFinite(sourceDuration) ? Math.max(0, sourceDuration) : 0
  if (!(dur > EPS)) return { start: 0, end: 0 }
  const rawStart = Number.isFinite(loopStart) ? loopStart : 0
  const rawEnd = Number.isFinite(loopEnd) ? loopEnd : 0
  if (!(rawEnd > rawStart + EPS)) return { start: 0, end: dur }
  const start = Math.min(Math.max(0, rawStart), Math.max(0, dur - MIN_LOOP_SPAN))
  const end = Math.min(dur, Math.max(start + MIN_LOOP_SPAN, rawEnd))
  return { start, end }
}

/** One-shot copy of a waveform selection. Later selection edits do not write the loop. */
export function selectionAsLoop(
  start: number,
  end: number,
  sourceDuration: number,
): { loopStart: number; loopEnd: number } | null {
  if (!(sourceDuration > MIN_LOOP_SPAN)) return null
  if (!Number.isFinite(start) || !Number.isFinite(end) || !(end > start + MIN_LOOP_SPAN)) return null
  const loopStart = Math.max(0, start)
  const loopEnd = Math.min(sourceDuration, end)
  if (!(loopEnd > loopStart + MIN_LOOP_SPAN)) return null
  if (loopStart <= 0.02 && loopEnd >= sourceDuration - 0.02) return null
  return { loopStart, loopEnd }
}

function playedRegion(clock: TrackClock): { start: number; end: number } {
  if (!clock.loop) return loopBounds(clock.sourceDuration, 0, 0)
  return loopBounds(clock.sourceDuration, clock.loopStart, clock.loopEnd)
}

export function resolveTrackPlayback(clock: TrackClock, projectTime: number): ResolvedPlayback {
  const speed = clampSpeed(clock.speed)
  const region = playedRegion(clock)
  const span = Math.max(0, region.end - region.start)
  const pass = span > EPS ? span / speed : 0
  const ping = clock.direction === 'pingpong'
  const content = ping ? pass * 2 : pass
  const t = Number.isFinite(projectTime) ? Math.max(0, projectTime) : 0
  const empty: ResolvedPlayback = {
    sourceTime: null,
    playDirection: clock.direction === 'reverse' ? -1 : 1,
    iteration: 0,
    insideLoop: clock.loop,
    ended: true,
    regionStart: region.start,
    regionEnd: region.end,
    passProjectDuration: pass,
    contentProjectDuration: content,
    consumedSource: 0,
  }
  if (!(span > EPS)) return empty

  const cycle = ping ? content : pass
  const ended = !clock.loop && t >= content - EPS
  const local = clock.loop ? t % cycle : Math.min(t, Math.max(0, content - EPS))
  let playDirection: 1 | -1 = 1
  let sourceTime = region.start
  if (ping) {
    if (local < pass) {
      sourceTime = region.start + local * speed
      playDirection = 1
    } else {
      sourceTime = region.end - (local - pass) * speed
      playDirection = -1
    }
  } else if (clock.direction === 'reverse') {
    sourceTime = region.end - local * speed
    playDirection = -1
  } else {
    sourceTime = region.start + local * speed
    playDirection = 1
  }
  sourceTime = Math.min(region.end, Math.max(region.start, sourceTime))
  const iteration = clock.loop && cycle > EPS ? Math.floor(t / cycle) : 0
  const consumedSource = Math.min(ping ? span * 2 : span, t * speed)
  if (ended) {
    return {
      ...empty,
      sourceTime: clock.direction === 'reverse' ? region.start : ping ? region.start : region.end,
      playDirection: clock.direction === 'reverse' ? -1 : 1,
      ended: true,
      consumedSource,
    }
  }
  return {
    sourceTime,
    playDirection,
    iteration,
    insideLoop: clock.loop,
    ended: false,
    regionStart: region.start,
    regionEnd: region.end,
    passProjectDuration: pass,
    contentProjectDuration: content,
    consumedSource,
  }
}

/** Tiles of the audible waveform across one project lane. Empty after an unlooped track ends. */
export function waveformTiles(clock: TrackClock, projectDuration: number): WaveTile[] {
  const project = Number.isFinite(projectDuration) ? Math.max(0, projectDuration) : 0
  const region = playedRegion(clock)
  const span = region.end - region.start
  if (!(project > EPS) || !(span > EPS)) return []
  const speed = clampSpeed(clock.speed)
  const pass = span / speed
  const ping = clock.direction === 'pingpong'
  const tiles: WaveTile[] = []
  const push = (projectStart: number, projectEnd: number, sourceStart: number, sourceEnd: number, reverse: boolean) => {
    if (!(projectEnd > projectStart + EPS) || projectStart >= project - EPS) return
    const visibleEnd = Math.min(project, projectEnd)
    const span = projectEnd - projectStart
    const shown = Math.min(1, Math.max(0, (visibleEnd - projectStart) / span))
    const sourceAt = sourceStart + (sourceEnd - sourceStart) * shown
    tiles.push({
      projectStart,
      projectEnd: visibleEnd,
      sourceStart,
      sourceEnd: sourceAt,
      reverse,
    })
  }
  if (!clock.loop) {
    if (ping) {
      push(0, pass, region.start, region.end, false)
      push(pass, pass * 2, region.end, region.start, true)
    } else if (clock.direction === 'reverse') {
      push(0, pass, region.end, region.start, true)
    } else {
      push(0, pass, region.start, region.end, false)
    }
    return tiles
  }
  const cycle = ping ? pass * 2 : pass
  if (!(cycle > EPS)) return []
  const count = Math.min(64, Math.ceil(project / cycle))
  for (let i = 0; i < count; i++) {
    const origin = i * cycle
    if (origin >= project - EPS) break
    if (ping) {
      push(origin, origin + pass, region.start, region.end, false)
      push(origin + pass, origin + cycle, region.end, region.start, true)
    } else if (clock.direction === 'reverse') {
      push(origin, origin + pass, region.end, region.start, true)
    } else {
      push(origin, origin + pass, region.start, region.end, false)
    }
  }
  return tiles
}

/**
 * Project-time fraction of the playhead on this lane.
 * A track that has already ended parks at the end of its own content
 * instead of tracking the global transport through silence.
 */
export function playheadProjectRatio(clock: TrackClock, projectTime: number, projectDuration: number): number {
  if (!(projectDuration > EPS)) return 0
  const resolved = resolveTrackPlayback(clock, projectTime)
  const parked = resolved.ended ? Math.min(projectTime, resolved.contentProjectDuration) : projectTime
  return Math.min(1, Math.max(0, parked / projectDuration))
}

/** Where the unlooped source would end on the project lane, before looping tiles. */
export function sourceEndProjectRatio(clock: TrackClock, projectDuration: number): number {
  if (!(projectDuration > EPS) || !(clock.sourceDuration > EPS)) return 0
  const speed = clampSpeed(clock.speed)
  const end = clock.direction === 'pingpong' ? (clock.sourceDuration * 2) / speed : clock.sourceDuration / speed
  return Math.min(1, Math.max(0, end / projectDuration))
}

/** Move a loop fragment in source time. Handles cannot cross. */
export function dragLoopRegion(input: {
  mode: 'start' | 'end' | 'body'
  originStart: number
  originEnd: number
  deltaSource: number
  sourceDuration: number
}): { loopStart: number; loopEnd: number } {
  const dur = Math.max(MIN_LOOP_SPAN, input.sourceDuration)
  const origin = loopBounds(dur, input.originStart, input.originEnd)
  const delta = Number.isFinite(input.deltaSource) ? input.deltaSource : 0
  let start = origin.start
  let end = origin.end
  if (input.mode === 'body') {
    const span = end - start
    start = Math.min(Math.max(0, start + delta), Math.max(0, dur - span))
    end = start + span
  } else if (input.mode === 'start') {
    start = Math.min(Math.max(0, start + delta), end - MIN_LOOP_SPAN)
  } else {
    end = Math.max(start + MIN_LOOP_SPAN, Math.min(dur, end + delta))
  }
  const bounds = loopBounds(dur, start, end)
  return { loopStart: bounds.start, loopEnd: bounds.end }
}

export function formatLoopReadout(seconds: number): string {
  if (!Number.isFinite(seconds)) return '00.000'
  const clamped = Math.max(0, seconds)
  const text = clamped.toFixed(3)
  const [whole, frac] = text.split('.')
  return `${(whole ?? '0').padStart(2, '0')}.${frac ?? '000'}`
}
