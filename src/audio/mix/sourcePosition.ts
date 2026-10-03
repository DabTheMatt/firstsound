/**
 * Project transport time → per-track source position.
 * One mapping for the playhead, the loop waveform, and the stretch cursor.
 * Speed, direction, and loop bounds change the source clock. They do not
 * create a second transport.
 */

import type { PlaybackDirection } from '../parameters/types'

const MIN_LOOP = 0.05
const EPS = 0.0005

export type SourceClock = {
  sourceDuration: number
  /** 1 = original speed. Higher values consume the source faster. */
  speed: number
  direction: PlaybackDirection
  loop: boolean
  /** Source seconds. 0 is the start of the file. */
  loopStart: number
  /** Source seconds. Values <= 0 mean the full source. */
  loopEnd: number
}

export type SourceHead = {
  head: number
  dir: 1 | -1
  intro: boolean
}

export function playbackRateOf(speed: number): number {
  if (!Number.isFinite(speed) || speed <= 0) return 1
  return Math.min(8, Math.max(0.05, speed))
}

export function resolveLoop(clock: SourceClock): { loopStart: number; loopEnd: number } {
  const dur = Number.isFinite(clock.sourceDuration) ? Math.max(0, clock.sourceDuration) : 0
  let start = Number.isFinite(clock.loopStart) ? clock.loopStart : 0
  let end = Number.isFinite(clock.loopEnd) && clock.loopEnd > 0 ? clock.loopEnd : dur
  if (!(dur > 0)) return { loopStart: 0, loopEnd: 0 }
  start = Math.min(dur, Math.max(0, start))
  end = Math.min(dur, Math.max(0, end))
  if (!(end > start + MIN_LOOP)) {
    if (start + MIN_LOOP <= dur) end = Math.min(dur, start + MIN_LOOP)
    else {
      end = dur
      start = Math.max(0, dur - MIN_LOOP)
    }
  }
  if (!(end > start)) {
    start = 0
    end = dur
  }
  return { loopStart: start, loopEnd: end }
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

/**
 * Source position after `projectTime` seconds of the shared transport,
 * assuming the current speed has been constant since the origin.
 */
export function sourcePositionAt(projectTime: number, clock: SourceClock): number {
  const dur = clock.sourceDuration
  if (!(dur > EPS)) return 0
  const t = Number.isFinite(projectTime) ? Math.max(0, projectTime) : 0
  const advanced = t * playbackRateOf(clock.speed)
  const { loopStart, loopEnd } = resolveLoop(clock)

  if (clock.direction === 'pingpong') {
    const lo = clock.loop ? loopStart : 0
    const hi = clock.loop ? loopEnd : dur
    const width = Math.max(MIN_LOOP, hi - lo)
    const cycle = width * 2
    const pos = clock.loop ? advanced % cycle : Math.min(advanced, cycle)
    if (pos <= width + EPS) return clamp(lo + Math.min(pos, width), lo, hi)
    return clamp(hi - (pos - width), lo, hi)
  }

  if (clock.direction === 'reverse') {
    const hi = clock.loop ? loopEnd : dur
    const lo = clock.loop ? loopStart : 0
    const width = Math.max(MIN_LOOP, hi - lo)
    const into = clock.loop ? advanced % width : Math.min(advanced, width)
    return clamp(hi - into, lo, hi)
  }

  if (!clock.loop) return clamp(Math.min(advanced, dur), 0, dur)
  if (advanced < loopEnd) return clamp(advanced, 0, dur)
  const span = Math.max(MIN_LOOP, loopEnd - loopStart)
  const into = (advanced - loopEnd) % span
  return clamp(loopStart + into, loopStart, loopEnd)
}

/** +1 while a ping-pong cycle is traveling toward loopEnd. */
export function pingPongDirection(projectTime: number, clock: SourceClock): 1 | -1 {
  const dur = clock.sourceDuration
  if (!(dur > EPS)) return 1
  const advanced = Math.max(0, projectTime) * playbackRateOf(clock.speed)
  const { loopStart, loopEnd } = resolveLoop(clock)
  const lo = clock.loop ? loopStart : 0
  const hi = clock.loop ? loopEnd : dur
  const width = Math.max(MIN_LOOP, hi - lo)
  const pos = clock.loop ? advanced % (width * 2) : Math.min(advanced, width * 2)
  return pos <= width + EPS ? 1 : -1
}

export function initialSourceHead(origin: number, clock: SourceClock): SourceHead {
  const { loopStart, loopEnd } = resolveLoop(clock)
  const head = sourcePositionAt(origin, clock)
  const dir: 1 | -1 =
    clock.direction === 'reverse' ? -1 : clock.direction === 'pingpong' ? pingPongDirection(origin, clock) : 1
  const intro =
    clock.loop &&
    clock.direction === 'forward' &&
    loopStart > EPS &&
    head < loopEnd - EPS
  return { head, dir, intro }
}

/**
 * Fold a head that has already been advanced by `dir * rate * dt`
 * back into the legal source range. Null means the one-shot has ended.
 */
export function correctSourceHead(state: SourceHead, clock: SourceClock): SourceHead | null {
  const dur = clock.sourceDuration
  if (!(dur > EPS)) return null
  const { loopStart, loopEnd } = resolveLoop(clock)
  let { head, dir, intro } = state

  if (clock.direction === 'pingpong') {
    const lo = clock.loop ? loopStart : 0
    const hi = clock.loop ? loopEnd : dur
    if (!clock.loop && (head > hi + EPS || head < lo - EPS)) return null
    for (let i = 0; i < 8; i++) {
      if (head > hi) {
        head = hi - (head - hi)
        dir = -1
      } else if (head < lo) {
        head = lo + (lo - head)
        dir = 1
      } else break
    }
    return { head: clamp(head, lo, hi), dir, intro: false }
  }

  if (clock.direction === 'reverse') {
    const hi = clock.loop ? loopEnd : dur
    const lo = clock.loop ? loopStart : 0
    const span = Math.max(MIN_LOOP, hi - lo)
    if (!clock.loop && head < lo - EPS) return null
    if (clock.loop && head < lo) {
      const back = (lo - head) % span
      head = back === 0 ? hi : hi - back
    }
    if (head > hi) head = hi
    return { head: clamp(head, lo, hi), dir: -1, intro: false }
  }

  if (!clock.loop) {
    if (head >= dur - EPS || head < -EPS) return null
    return { head: clamp(head, 0, dur), dir: 1, intro: false }
  }

  const span = Math.max(MIN_LOOP, loopEnd - loopStart)
  if (head >= loopEnd) {
    intro = false
    let into = (head - loopEnd) % span
    if (into < 0) into += span
    head = loopStart + into
  } else if (!intro && head < loopStart) {
    const back = (loopStart - head) % span
    head = loopEnd - (back === 0 ? span : back)
  }
  const floor = intro ? 0 : loopStart
  return { head: clamp(head, floor, loopEnd), dir: 1, intro }
}

/** Project seconds occupied by one repeat of the loop region at this speed. */
export function loopProjectSpan(clock: SourceClock): number {
  const { loopStart, loopEnd } = resolveLoop(clock)
  return Math.max(0, loopEnd - loopStart) / playbackRateOf(clock.speed)
}

export function projectFraction(projectTime: number, projectDuration: number): number {
  if (!(projectDuration > 0) || !Number.isFinite(projectTime)) return 0
  return clamp(projectTime / projectDuration, 0, 1)
}

/**
 * Lane fraction for the moving playhead.
 * Without loop the lane is the source, so different speeds sit at different X.
 * With loop the lane is project time, so the caret stays on the sounding copy.
 */
export function caretFraction(projectTime: number, sourcePosition: number, clock: SourceClock, projectDuration: number): number {
  if (clock.loop && projectDuration > 0) return projectFraction(projectTime, projectDuration)
  const domain = Math.max(clock.sourceDuration, projectDuration, 0.001)
  return clamp(sourcePosition / domain, 0, 1)
}

/** Where a source instant sits on the same axis as the caret. */
export function markerFraction(sourceTime: number, clock: SourceClock, projectDuration: number): number {
  if (!(clock.sourceDuration > 0)) return 0
  if (clock.loop && projectDuration > 0) {
    return clamp(sourceTime / playbackRateOf(clock.speed) / projectDuration, 0, 1)
  }
  const domain = Math.max(clock.sourceDuration, projectDuration, 0.001)
  return clamp(sourceTime / domain, 0, 1)
}

export function sourceTimeAtFraction(fraction: number, clock: SourceClock, projectDuration: number): number {
  const f = clamp(fraction, 0, 1)
  const dur = Math.max(0, clock.sourceDuration)
  if (!(dur > 0)) return 0
  if (clock.loop && projectDuration > 0) {
    return clamp(f * projectDuration * playbackRateOf(clock.speed), 0, dur)
  }
  const domain = Math.max(dur, projectDuration, 0.001)
  return clamp(f * domain, 0, dur)
}

/** Source sample drawn at a lane fraction. Loop tiles use project time. */
export function sampleAtLaneFraction(fraction: number, clock: SourceClock, projectDuration: number): number {
  const f = clamp(fraction, 0, 1)
  if (clock.loop && projectDuration > 0) return sourcePositionAt(f * projectDuration, clock)
  const domain = Math.max(clock.sourceDuration, projectDuration, 0.001)
  const sample = f * domain
  if (sample > clock.sourceDuration) return Number.NaN
  return sample
}

/** How many loop copies fit, including a short final one. */
export function loopCopyCount(clock: SourceClock, projectDuration: number): number {
  if (!clock.loop || !(projectDuration > 0)) return 1
  const span = loopProjectSpan(clock)
  if (!(span > EPS)) return 1
  return Math.max(1, Math.ceil(projectDuration / span - EPS))
}

/** 1 for a mono source, 2 for a real stereo source. */
export function meterChannelCount(sourceChannels: number): 1 | 2 {
  return sourceChannels >= 2 ? 2 : 1
}
