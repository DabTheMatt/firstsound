/**
 * Shared transport / loop click guard.
 * Scheduled in output time so the ramp stays a few milliseconds at any
 * sample rate. Playback rate scales the source span covered by that window:
 * faster tape crosses more samples, but the listener still hears the same
 * short ramp.
 */

/** Floor for the ramp. Long enough to kill a step, short enough to feel immediate. */
export const ANTI_CLICK_SEC = 0.005

/** Never let a slow rate or a low sample rate collapse the ramp to a couple of samples. */
export const ANTI_CLICK_MIN_SAMPLES = 64

/** Hard cap so the guard cannot turn into a musical fade. */
export const ANTI_CLICK_MAX_SEC = 0.012

export function antiClickSeconds(sampleRate: number, playbackRate = 1): number {
  const sr = Number.isFinite(sampleRate) && sampleRate > 0 ? sampleRate : 48000
  const rate = Math.min(8, Math.max(0.05, Math.abs(playbackRate) || 1))
  const fromSamples = (ANTI_CLICK_MIN_SAMPLES / sr) * rate
  return Math.min(ANTI_CLICK_MAX_SEC, Math.max(ANTI_CLICK_SEC, fromSamples))
}

/** Overlap at a loop seam. Stays inside the region so the selection is not moved. */
export function loopCrossfadeSeconds(
  sampleRate: number,
  playbackRate: number,
  regionSpan: number,
): number {
  const base = antiClickSeconds(sampleRate, playbackRate)
  if (!(regionSpan > 0)) return base
  return Math.min(base, Math.max(0.001, regionSpan * 0.08))
}

export type LoopCursor = {
  when: number
  offset: number
}

export type LoopSegmentPlan = {
  when: number
  offset: number
  duration: number
  fadeIn: number
  fadeOut: number
}

/**
 * One pass of a region, plus the cursor for the next overlapped pass.
 * The next pass starts `fadeOut` early so the two gains form a crossfade
 * and the audio thread never waits on `onended`.
 */
export function nextLoopSegment(
  cursor: LoopCursor,
  regionStart: number,
  regionEnd: number,
  loop: boolean,
  crossfade: number,
): { segment: LoopSegmentPlan; next: LoopCursor | null } {
  const start = Math.min(regionStart, regionEnd)
  const end = Math.max(regionStart, regionEnd)
  const offset = Math.min(Math.max(cursor.offset, start), end - 0.0005)
  const duration = Math.max(0.001, end - offset)
  const xf = Math.min(Math.max(0.001, crossfade), duration * 0.45)
  const segment: LoopSegmentPlan = {
    when: cursor.when,
    offset,
    duration,
    fadeIn: xf,
    fadeOut: xf,
  }
  if (!loop) return { segment, next: null }
  return {
    segment,
    next: {
      when: cursor.when + duration - xf,
      offset: start,
    },
  }
}

/** Linear edge ramp on an AudioParam. Safe to call again: previous events are cleared. */
export function rampGainLinear(
  param: AudioParam,
  target: number,
  now: number,
  seconds: number,
): void {
  const current = Number.isFinite(param.value) ? param.value : target
  const dur = Math.max(0.001, seconds)
  param.cancelScheduledValues(now)
  param.setValueAtTime(current, now)
  if (Math.abs(current - target) <= 1e-5) return
  param.linearRampToValueAtTime(target, now + dur)
}

/**
 * Fade the voice in at `when` and out at `when + duration`.
 * Callers that fade in should set `param.value = 0` before connecting so the
 * current render quantum does not use the GainNode default of 1.
 */
export function scheduleEdgeFades(
  param: AudioParam,
  when: number,
  duration: number,
  fadeIn: number,
  fadeOut: number,
): void {
  const end = when + Math.max(0.001, duration)
  const inn = Math.max(0, Math.min(fadeIn, duration * 0.45))
  const out = Math.max(0, Math.min(fadeOut, duration * 0.45))
  // Drop the implicit event created by a preceding `.value` write at this time.
  param.cancelScheduledValues(when)
  if (inn > 0.0005) {
    param.setValueAtTime(0, when)
    param.linearRampToValueAtTime(1, when + inn)
  } else {
    param.setValueAtTime(1, when)
  }
  if (out > 0.0005) {
    const outAt = end - out
    if (outAt > when + inn + 0.0004) param.setValueAtTime(1, outAt)
    param.linearRampToValueAtTime(0, end)
  }
}

export function maxAdjacentDelta(
  samples: ArrayLike<number>,
  from = 1,
  to = samples.length,
): number {
  let max = 0
  const a = Math.max(1, from | 0)
  const b = Math.min(samples.length, to | 0)
  for (let i = a; i < b; i++) {
    max = Math.max(max, Math.abs((samples[i] ?? 0) - (samples[i - 1] ?? 0)))
  }
  return max
}

/** Overlap-add a region the way the transport scheduler does. */
export function renderCrossfadedLoop(
  source: ArrayLike<number>,
  sampleRate: number,
  regionStartSec: number,
  regionEndSec: number,
  passes: number,
  crossfadeSec: number,
): Float32Array {
  const sr = Math.max(1, sampleRate)
  const start = Math.max(0, Math.min(source.length - 1, Math.floor(regionStartSec * sr)))
  const end = Math.max(start + 1, Math.min(source.length, Math.floor(regionEndSec * sr)))
  const span = end - start
  const xf = Math.max(1, Math.min(Math.floor(crossfadeSec * sr), Math.floor(span * 0.45)))
  const period = Math.max(1, span - xf)
  const count = Math.max(1, passes | 0)
  const out = new Float32Array(period * count + xf)
  for (let pass = 0; pass < count; pass++) {
    const t0 = pass * period
    for (let i = 0; i < span; i++) {
      const dest = t0 + i
      if (dest >= out.length) break
      let g = 1
      if (i < xf) g = i / xf
      if (i > span - xf) g = Math.min(g, (span - i) / xf)
      out[dest] = (out[dest] ?? 0) + (source[start + i] ?? 0) * g
    }
  }
  return out
}

/** Hard restart with no overlap — the discontinuity the scheduler replaces. */
export function renderHardLoop(
  source: ArrayLike<number>,
  sampleRate: number,
  regionStartSec: number,
  regionEndSec: number,
  passes: number,
): Float32Array {
  const sr = Math.max(1, sampleRate)
  const start = Math.max(0, Math.min(source.length - 1, Math.floor(regionStartSec * sr)))
  const end = Math.max(start + 1, Math.min(source.length, Math.floor(regionEndSec * sr)))
  const span = end - start
  const count = Math.max(1, passes | 0)
  const out = new Float32Array(span * count)
  for (let pass = 0; pass < count; pass++) {
    const t0 = pass * span
    for (let i = 0; i < span; i++) out[t0 + i] = source[start + i] ?? 0
  }
  return out
}

export function applyLinearEdges(
  samples: ArrayLike<number>,
  fadeInSamples: number,
  fadeOutSamples: number,
): Float32Array {
  const n = samples.length
  const out = new Float32Array(n)
  const inn = Math.max(0, fadeInSamples | 0)
  const fadeOut = Math.max(0, fadeOutSamples | 0)
  for (let i = 0; i < n; i++) {
    let g = 1
    if (inn > 0 && i < inn) g *= i / inn
    if (fadeOut > 0 && i > n - 1 - fadeOut) g *= (n - 1 - i) / Math.max(1, fadeOut)
    out[i] = (samples[i] ?? 0) * g
  }
  return out
}

/** Insert `wet` into `dry` with a linear crossfade. A hard cut is fadeSamples <= 1. */
export function crossfadeInsert(
  dry: ArrayLike<number>,
  wet: ArrayLike<number>,
  at: number,
  fadeSamples: number,
): Float32Array {
  const n = Math.min(dry.length, wet.length)
  const out = new Float32Array(n)
  const fade = Math.max(1, fadeSamples | 0)
  const cut = Math.max(0, Math.min(n, at | 0))
  for (let i = 0; i < n; i++) {
    if (i < cut) {
      out[i] = dry[i] ?? 0
      continue
    }
    const t = Math.min(1, (i - cut) / fade)
    out[i] = (dry[i] ?? 0) * (1 - t) + (wet[i] ?? 0) * t
  }
  return out
}
