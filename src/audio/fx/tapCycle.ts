/** Wall-clock taps that estimate one LFO cycle. Same gesture as tap tempo, no audio graph. */

export const TAP_CYCLE_GAP_RESET_SEC = 4
export const TAP_CYCLE_MAX_HISTORY = 8
/** Ignores a second event from the same press. Short enough for a 20 Hz cycle. */
export const TAP_CYCLE_MIN_GAP_SEC = 0.04

export type TapCycleState = {
  times: number[]
}

export function emptyTapCycle(): TapCycleState {
  return { times: [] }
}

export function addCycleTap(
  state: TapCycleState,
  nowSec: number,
  minHz: number,
  maxHz: number,
): { state: TapCycleState; hz: number | null } {
  const last = state.times[state.times.length - 1]
  if (last !== undefined && nowSec - last < TAP_CYCLE_MIN_GAP_SEC) {
    return { state, hz: hzFromCycleTaps(state.times, minHz, maxHz) }
  }
  const times =
    last !== undefined && nowSec - last > TAP_CYCLE_GAP_RESET_SEC ? [nowSec] : [...state.times, nowSec]
  const next = { times: times.slice(-TAP_CYCLE_MAX_HISTORY) }
  return { state: next, hz: hzFromCycleTaps(next.times, minHz, maxHz) }
}

/** Mean interval between taps, as Hz. Intervals outside the rate range are skipped. */
export function hzFromCycleTaps(times: number[], minHz: number, maxHz: number): number | null {
  if (times.length < 2 || !(minHz > 0) || !(maxHz >= minHz)) return null
  const minDt = 1 / maxHz
  const maxDt = 1 / minHz
  const iois: number[] = []
  for (let i = 1; i < times.length; i++) {
    const dt = (times[i] ?? 0) - (times[i - 1] ?? 0)
    if (dt < minDt || dt > maxDt) continue
    iois.push(dt)
  }
  if (!iois.length) return null
  const mean = iois.reduce((sum, dt) => sum + dt, 0) / iois.length
  if (!(mean > 0)) return null
  const hz = Math.min(maxHz, Math.max(minHz, 1 / mean))
  return Math.round(hz * 1000) / 1000
}
