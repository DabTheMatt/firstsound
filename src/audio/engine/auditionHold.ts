/** How long Pause and hold repeats, so the frozen graph stays audible. */
export const AUDITION_SPAN_SEC = 1.25

/** Shorter than this and the loop is a click, not a fragment you can hear. */
export const AUDITION_MIN_SEC = 0.28

/**
 * A short window of what has already reached the playhead.
 * The frozen EQ shows that moment, so the loop ends there instead of
 * playing the slice that has not appeared yet.
 * Near the start of the sample the window slides forward only far enough
 * to stay a fragment. The playhead stays inside the window.
 */
export function auditionWindow(
  playheadSec: number,
  durationSec: number,
  spanSec = AUDITION_SPAN_SEC,
): { start: number; end: number; resumeAt: number } | null {
  if (!(durationSec > 0) || !Number.isFinite(durationSec) || !Number.isFinite(playheadSec)) return null
  const span = Math.min(durationSec, Math.max(AUDITION_MIN_SEC, spanSec))
  const head = Math.min(durationSec, Math.max(0, playheadSec))
  let end = head
  let start = Math.max(0, end - span)
  if (end - start < span - 1e-4) end = Math.min(durationSec, start + span)
  if (!(end > start + 1e-3)) return null
  const resumeAt = Math.min(Math.max(start, end - 0.02), Math.max(start, head))
  return { start, end, resumeAt }
}
