/** Running tap-tempo estimate from wall-clock tap times (seconds). */

import { clampTempo, roundTempo, TEMPO_MIN_BPM, TEMPO_MAX_BPM } from './transients'

export const TAP_GAP_RESET_SEC = 2.4
export const TAP_MAX_HISTORY = 8

export type TapTempoState = {
  times: number[]
}

export function emptyTapTempo(): TapTempoState {
  return { times: [] }
}

export function addTap(
  state: TapTempoState,
  nowSec: number,
  gapResetSec = TAP_GAP_RESET_SEC,
): { state: TapTempoState; bpm: number | null } {
  const last = state.times[state.times.length - 1]
  const times =
    last !== undefined && nowSec - last > gapResetSec ? [nowSec] : [...state.times, nowSec]
  const next = { times: times.slice(-TAP_MAX_HISTORY) }
  return { state: next, bpm: bpmFromTaps(next.times) }
}

export function bpmFromTaps(times: number[]): number | null {
  if (times.length < 2) return null
  const iois: number[] = []
  for (let i = 1; i < times.length; i++) {
    const dt = (times[i] ?? 0) - (times[i - 1] ?? 0)
    if (dt < 60 / TEMPO_MAX_BPM || dt > 60 / TEMPO_MIN_BPM) continue
    iois.push(dt)
  }
  if (!iois.length) return null
  const mean = iois.reduce((a, b) => a + b, 0) / iois.length
  if (!(mean > 0)) return null
  return roundTempo(clampTempo(60 / mean))
}
