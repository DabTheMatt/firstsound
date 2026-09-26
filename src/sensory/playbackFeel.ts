import { clamp } from '../audio/parameters/mapping'

/** Faster / shorter end of the sensory time axis. */
export const SENSORY_SPEED_FAST = 4

/** Longer / stretched end of the sensory time axis. */
export const SENSORY_SPEED_SLOW = 0.25

/** Semitones from the center of the sensory pitch axis to either pole. */
export const SENSORY_PITCH_SPAN = 24

/**
 * Feel −1 is shorter and faster, 0 is natural, +1 is longer and stretched.
 * Logarithmic so the resting point is exactly 1×.
 * Maps onto the engine `speed` parameter (independent of pitch).
 */
export function speedFromFeel(feel: number): number {
  const t = clamp(feel, -1, 1)
  const logFast = Math.log(SENSORY_SPEED_FAST)
  const logSlow = Math.log(SENSORY_SPEED_SLOW)
  const u = (t + 1) / 2
  return Math.exp(logFast + (logSlow - logFast) * u)
}

export function feelFromSpeed(speed: number): number {
  const s = clamp(speed, SENSORY_SPEED_SLOW, SENSORY_SPEED_FAST)
  const logFast = Math.log(SENSORY_SPEED_FAST)
  const logSlow = Math.log(SENSORY_SPEED_SLOW)
  const u = (Math.log(s) - logFast) / (logSlow - logFast)
  return clamp(u * 2 - 1, -1, 1)
}

/**
 * Feel −1 is lower, 0 is natural, +1 is higher.
 * Maps onto the engine `pitch` parameter in semitones (independent of speed).
 */
export function pitchFromFeel(feel: number): number {
  return clamp(feel, -1, 1) * SENSORY_PITCH_SPAN
}

export function feelFromPitch(pitch: number): number {
  return clamp(pitch / SENSORY_PITCH_SPAN, -1, 1)
}

/** Keep sensory time/pitch on the engine voice when a feeling remap rewrites DSP. */
export function withLivePlayback<T extends { params: { speed: number; pitch: number } }>(
  dsp: T,
  live: { speed: number; pitch: number },
): T {
  return {
    ...dsp,
    params: { ...dsp.params, speed: live.speed, pitch: live.pitch },
  }
}
