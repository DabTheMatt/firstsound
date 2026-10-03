/**
 * Shared project-transport plan.
 * Every voice uses the same AudioContext `when`. Offsets are project time,
 * not per-track clocks. A track that has already ended is omitted unless it
 * loops. Looping never extends the project past the longest original source.
 */

export type TrackSpan = {
  id: string
  duration: number
  /** Repeats inside the project. Does not extend project duration. */
  loop?: boolean
}

export type ScheduledVoice = {
  id: string
  offset: number
}

export type ProjectStartPlan = {
  /** One AudioContext time for every source.start(). */
  when: number
  origin: number
  voices: ScheduledVoice[]
}

export function projectDurationOf(tracks: readonly TrackSpan[]): number {
  let max = 0
  for (const track of tracks) {
    if (track.duration > max) max = track.duration
  }
  return max
}

/** Future-proof lead so every source is scheduled, not started late in JS. */
export function sharedStartWhen(audioNow: number, leadSec = 0.02): number {
  const now = Number.isFinite(audioNow) ? audioNow : 0
  const lead = Number.isFinite(leadSec) ? Math.max(0, leadSec) : 0.02
  return now + lead
}

export function planSyncedVoices(tracks: readonly TrackSpan[], origin: number): ScheduledVoice[] {
  const start = Number.isFinite(origin) ? Math.max(0, origin) : 0
  const voices: ScheduledVoice[] = []
  for (const track of tracks) {
    if (!(track.duration > 0)) continue
    if (!track.loop && start >= track.duration - 0.0005) continue
    const offset = track.loop ? start % track.duration : start
    voices.push({ id: track.id, offset })
  }
  return voices
}

export function planProjectStart(
  tracks: readonly TrackSpan[],
  origin: number,
  audioNow: number,
  leadSec = 0.02,
): ProjectStartPlan {
  const originClamped = Number.isFinite(origin) ? Math.max(0, origin) : 0
  return {
    when: sharedStartWhen(audioNow, leadSec),
    origin: originClamped,
    voices: planSyncedVoices(tracks, originClamped),
  }
}
