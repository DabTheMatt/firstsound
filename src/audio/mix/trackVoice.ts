/**
 * Per-track source plan on the shared project clock.
 *
 *   source (speed, pitch, direction, loop)
 *     → track input (gain, balance, phase)
 *     → track effect chain
 *     → track mixer
 *     → master
 *
 * Project length is the longest original source. A loop repeats inside that
 * length. It does not make the transport infinite, even when every track loops.
 * Loop boundaries are one BufferSource (or one ping-pong cycle buffer), not a
 * JavaScript timer restarting the sample.
 */

import { playbackNeedsStretch } from '../parameters/mapping'
import type { PlaybackDirection } from '../parameters/types'
import { loopBounds, resolveTrackPlayback, type TrackClock } from './playback'

const EPS = 0.0005

export type CueBuffer = 'forward' | 'reverse' | 'pingpong'

export type BufferCue = {
  buffer: CueBuffer
  offset: number
  /** Seconds of output. A looping source is stopped at this project boundary. */
  duration: number
  at: number
  loop: boolean
  /** Loop points in the cue buffer (reversed or ping-pong coordinates when needed). */
  loopStart: number
  loopEnd: number
}

export function sourceNeedsStretch(speed: number, pitch: number, rateIsLive: boolean): boolean {
  return rateIsLive || playbackNeedsStretch(speed, pitch)
}

/**
 * One native buffer voice for forward, reverse, or ping-pong.
 * Ping-pong plays a cycle buffer (forward then reverse) so the loop is a
 * single AudioBufferSourceNode, truncated by the project end.
 */
export function bufferCues(input: {
  sourceDuration: number
  origin: number
  projectDuration: number
  loop: boolean
  direction: PlaybackDirection
  speed?: number
  loopStart?: number
  loopEnd?: number
}): BufferCue[] {
  const source = input.sourceDuration
  const origin = Number.isFinite(input.origin) ? Math.max(0, input.origin) : 0
  const project = Number.isFinite(input.projectDuration) ? Math.max(0, input.projectDuration) : 0
  if (!(source > EPS) || !(project > EPS) || origin >= project - EPS) return []
  const clock: TrackClock = {
    sourceDuration: source,
    speed: input.speed ?? 1,
    direction: input.direction,
    loop: input.loop,
    loopStart: input.loopStart ?? 0,
    loopEnd: input.loopEnd ?? 0,
  }
  const resolved = resolveTrackPlayback(clock, origin)
  if (resolved.ended || resolved.sourceTime == null) return []
  const remain = project - origin
  const duration = input.loop ? remain : Math.min(remain, Math.max(0, resolved.contentProjectDuration - origin))
  if (!(duration > EPS)) return []
  const region = loopBounds(source, input.loop ? clock.loopStart : 0, input.loop ? clock.loopEnd : 0)
  if (input.direction === 'pingpong') {
    const cycle = (region.end - region.start) * 2
    const into = resolved.playDirection < 0 ? region.end - resolved.sourceTime + (region.end - region.start) : resolved.sourceTime - region.start
    return [{ buffer: 'pingpong', offset: into, duration, at: 0, loop: input.loop, loopStart: 0, loopEnd: cycle }]
  }
  if (input.direction === 'reverse') {
    const offset = source - resolved.sourceTime
    return [
      {
        buffer: 'reverse',
        offset,
        duration,
        at: 0,
        loop: input.loop,
        loopStart: source - region.end,
        loopEnd: source - region.start,
      },
    ]
  }
  return [
    {
      buffer: 'forward',
      offset: resolved.sourceTime,
      duration,
      at: 0,
      loop: input.loop,
      loopStart: region.start,
      loopEnd: region.end,
    },
  ]
}
