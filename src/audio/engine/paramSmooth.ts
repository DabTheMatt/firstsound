/**
 * One scheduler for realtime AudioParam updates.
 *
 * Stacked `setTargetAtTime` calls (one per knob / LFO / automation tick) leave
 * stale events on the timeline. In browsers that discontinuity is a click. In
 * the offline engine those events are unstable and can blow the signal up.
 * Each new target therefore cancels the tail with `cancelAndHoldAtTime` — the
 * value already reached is held — and schedules a single short ramp.
 *
 * Discrete enums (filter type, distortion algorithm, impulse choice) are not
 * AudioParams and must not be interpolated here. Callers crossfade a silent
 * spare path with the gain profile instead.
 */

export const SMOOTH_GAIN_SEC = 0.008
export const SMOOTH_MIX_SEC = 0.007
export const SMOOTH_PAN_SEC = 0.006
export const SMOOTH_FREQUENCY_SEC = 0.012
export const SMOOTH_Q_SEC = 0.006
export const SMOOTH_PITCH_SEC = 0.016
export const SMOOTH_DELAY_MIN_SEC = 0.012
/**
 * Maximum |d(delayTime)/dt|. Faster than this, a DelayNode read head skips
 * samples and the output tears (a chirp that reads as a click), especially
 * inside a feedback loop. 1.15 keeps a full musical jump a short glide.
 */
export const DELAY_TIME_SLEW = 1.15
/** Previous unsafe ceiling. A jump longer than this in 30 ms tears a DelayNode. */
export const SMOOTH_DELAY_MAX_SEC = 0.03
export const SMOOTH_TIME_SEC = 0.008
export const SMOOTH_DB_SEC = 0.008

export type SmoothingProfile =
  | 'gain'
  | 'mix'
  | 'pan'
  | 'frequency'
  | 'q'
  | 'pitch'
  | 'delayTime'
  | 'time'
  | 'db'

type Curve = 'linear' | 'exponential'

type ProfileSpec = {
  curve: Curve
  seconds: number
  eps: number
  min?: number
  max?: number
}

const PROFILES: Record<SmoothingProfile, ProfileSpec> = {
  gain: { curve: 'linear', seconds: SMOOTH_GAIN_SEC, eps: 1e-4 },
  mix: { curve: 'linear', seconds: SMOOTH_MIX_SEC, eps: 1e-4 },
  pan: { curve: 'linear', seconds: SMOOTH_PAN_SEC, eps: 1e-4, min: -1, max: 1 },
  frequency: { curve: 'exponential', seconds: SMOOTH_FREQUENCY_SEC, eps: 0.05, min: 0.001 },
  q: { curve: 'linear', seconds: SMOOTH_Q_SEC, eps: 1e-4 },
  pitch: { curve: 'exponential', seconds: SMOOTH_PITCH_SEC, eps: 1e-4, min: 0.02 },
  delayTime: { curve: 'linear', seconds: SMOOTH_DELAY_MIN_SEC, eps: 1e-5, min: 0 },
  time: { curve: 'linear', seconds: SMOOTH_TIME_SEC, eps: 1e-5, min: 0 },
  db: { curve: 'linear', seconds: SMOOTH_DB_SEC, eps: 1e-3 },
}

type Scheduled = {
  target: number
  time: number
  /** Value already reached at `time`, before this ramp. Replacing a same-time
   * schedule has to restart from here: cancelAndHold does not remove an event
   * that was just inserted at that exact time. */
  from: number
}

const scheduled = new WeakMap<AudioParam, Scheduled>()

function hold(param: AudioParam, time: number): void {
  try {
    param.cancelAndHoldAtTime(time)
  } catch {
    const current = Number.isFinite(param.value) ? param.value : 0
    param.cancelScheduledValues(time)
    param.setValueAtTime(current, time)
  }
}

function writeRamp(
  param: AudioParam,
  value: number,
  t: number,
  dur: number,
  curve: Curve,
  from: number,
): void {
  const expo = curve === 'exponential' && value > 0 && from > 0
  if (dur < 0.0005) {
    param.setValueAtTime(value, t)
    return
  }
  try {
    if (expo) param.exponentialRampToValueAtTime(value, t + dur)
    else param.linearRampToValueAtTime(value, t + dur)
  } catch {
    try {
      param.linearRampToValueAtTime(value, t + dur)
    } catch {
      param.setValueAtTime(value, t)
    }
  }
}

/**
 * One ramp on the timeline. A second call at the same timestamp replaces the
 * ramp that has not been heard yet instead of stacking another event.
 */
function scheduleRamp(
  param: AudioParam,
  value: number,
  t: number,
  dur: number,
  curve: Curve,
): void {
  const prev = scheduled.get(param)
  const sameTime = prev !== undefined && Math.abs(prev.time - t) <= 1e-4
  if (sameTime && prev) {
    try {
      param.cancelScheduledValues(t)
    } catch {
      /* already clear */
    }
    param.setValueAtTime(prev.from, t)
    writeRamp(param, value, t, dur, curve, prev.from)
    scheduled.set(param, { target: value, time: t, from: prev.from })
    return
  }
  const from = prev ? prev.target : Number.isFinite(param.value) ? param.value : value
  hold(param, t)
  writeRamp(param, value, t, dur, curve, from)
  scheduled.set(param, { target: value, time: t, from })
}

/**
 * Replace any scheduled tail with a linear ramp. Transport fades call this
 * directly so their duration stays exact.
 */
export function rampAudioParamLinear(
  param: AudioParam,
  target: number,
  now: number,
  seconds: number,
): void {
  const value = Number.isFinite(target) ? target : 0
  const t = Math.max(0, Number.isFinite(now) ? now : 0)
  scheduleRamp(param, value, t, Math.max(0, seconds), 'linear')
}

/**
 * Snap a parameter that is already inaudible (muted wet path, spare bank).
 * Still clears stale automation so a later fade cannot resume an old ramp.
 */
export function setAudioParamNow(param: AudioParam, value: number, now: number): void {
  const v = Number.isFinite(value) ? value : 0
  const t = Math.max(0, Number.isFinite(now) ? now : 0)
  const prev = scheduled.get(param)
  if (prev && Math.abs(prev.time - t) <= 1e-4) {
    try {
      param.cancelScheduledValues(t)
    } catch {
      /* already clear */
    }
  } else {
    hold(param, t)
  }
  param.setValueAtTime(v, t)
  scheduled.set(param, { target: v, time: t, from: v })
}

function delaySeconds(previous: number | undefined, value: number): number {
  if (previous === undefined) return SMOOTH_DELAY_MIN_SEC
  const delta = Math.abs(value - previous)
  if (delta < 1e-4) return SMOOTH_DELAY_MIN_SEC
  // Duration tracks the distance so the read head never exceeds DELAY_TIME_SLEW.
  // A 30 ms cap (the previous policy) turned a 200 ms jump into a torn head.
  return Math.max(SMOOTH_DELAY_MIN_SEC, delta / DELAY_TIME_SLEW)
}

/**
 * Move `param` toward `target` without a step. `now` is `AudioContext.currentTime`
 * (or a future gesture time when several updates are scheduled ahead of an
 * offline render). Repeated calls for the same target leave the in-flight ramp
 * alone so automation, LFO, and knob ticks do not restart it.
 */
/** Last target written for this AudioParam. Tests use it to see the DSP value. */
export function scheduledAudioParamTarget(param: AudioParam): number | undefined {
  return scheduled.get(param)?.target
}

export function setSmoothedAudioParam(
  param: AudioParam,
  target: number,
  now: number,
  profile: SmoothingProfile,
): void {
  if (!Number.isFinite(target)) return
  const spec = PROFILES[profile]
  let value = target
  if (spec.min != null) value = Math.max(spec.min, value)
  if (spec.max != null) value = Math.min(spec.max, value)
  const previous = scheduled.get(param)
  if (previous !== undefined && Math.abs(previous.target - value) <= spec.eps) return
  const t = Math.max(0, Number.isFinite(now) ? now : 0)
  const seconds = profile === 'delayTime' ? delaySeconds(previous?.target, value) : spec.seconds
  scheduleRamp(param, value, t, seconds, spec.curve)
}
