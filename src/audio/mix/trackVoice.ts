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

const EPS = 0.0005

export type CueBuffer = 'forward' | 'reverse' | 'pingpong'

export type BufferCue = {
  buffer: CueBuffer
  offset: number
  /** Seconds of output. A looping source is stopped at this project boundary. */
  duration: number
  at: number
  loop: boolean
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
}): BufferCue[] {
  const source = input.sourceDuration
  const origin = Number.isFinite(input.origin) ? Math.max(0, input.origin) : 0
  const project = Number.isFinite(input.projectDuration) ? Math.max(0, input.projectDuration) : 0
  if (!(source > EPS) || !(project > EPS) || origin >= project - EPS) return []
  const remain = project - origin
  if (input.direction === 'pingpong') {
    const cycle = source * 2
    if (!input.loop && origin >= cycle - EPS) return []
    const offset = input.loop ? origin % cycle : origin
    const duration = input.loop ? remain : Math.min(remain, cycle - origin)
    if (!(duration > EPS)) return []
    return [{ buffer: 'pingpong', offset, duration, at: 0, loop: input.loop }]
  }
  if (!input.loop && origin >= source - EPS) return []
  const offset = input.loop ? origin % source : origin
  const duration = input.loop ? remain : Math.min(remain, source - origin)
  if (!(duration > EPS)) return []
  return [
    {
      buffer: input.direction === 'reverse' ? 'reverse' : 'forward',
      offset,
      duration,
      at: 0,
      loop: input.loop,
    },
  ]
}
