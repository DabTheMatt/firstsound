/** How long Pause and hold repeats, so the frozen graph stays audible. */
export const AUDITION_SPAN_SEC = 1.25

/** Shorter than this and the loop is a click, not a fragment you can hear. */
export const AUDITION_MIN_SEC = 0.28

/**
 * A short window that contains `playheadSec`.
 * Near the end of the sample the window slides back so the fragment still has length.
 * The playhead stays inside the window.
 */
export function auditionWindow(
  playheadSec: number,
  durationSec: number,
  spanSec = AUDITION_SPAN_SEC,
): { start: number; end: number; resumeAt: number } | null {
  if (!(durationSec > 0) || !Number.isFinite(durationSec) || !Number.isFinite(playheadSec)) return null
  const span = Math.min(durationSec, Math.max(AUDITION_MIN_SEC, spanSec))
  const head = Math.min(durationSec, Math.max(0, playheadSec))
  let start = head
  let end = Math.min(durationSec, start + span)
  if (end - start < span - 1e-4) start = Math.max(0, end - span)
  if (!(end > start + 1e-3)) return null
  const resumeAt = Math.min(end - 0.02, Math.max(start, head))
  return { start, end, resumeAt }
}
