/** How long Hold repeats, so the looping fragment stays audible on the graph. */
export const AUDITION_SPAN_SEC = 1

/** Lengths offered in the graph menu. */
export const AUDITION_SPAN_CHOICES = [0.05, 0.1, 0.25, 0.5, 1] as const

export type AuditionSpanSec = (typeof AUDITION_SPAN_CHOICES)[number]

/** Shortest fragment the menu can ask for. */
export const AUDITION_MIN_SEC = 0.05

let spanSec: AuditionSpanSec = AUDITION_SPAN_SEC
const spanListeners = new Set<(span: AuditionSpanSec) => void>()

export function auditionSpanSec(): AuditionSpanSec {
  return spanSec
}

export function setAuditionSpanSec(next: number): void {
  const choice = (AUDITION_SPAN_CHOICES as readonly number[]).includes(next) ? (next as AuditionSpanSec) : spanSec
  if (choice === spanSec) return
  spanSec = choice
  for (const listener of spanListeners) listener(spanSec)
}

export function subscribeAuditionSpan(onChange: (span: AuditionSpanSec) => void): () => void {
  spanListeners.add(onChange)
  return () => spanListeners.delete(onChange)
}

/**
 * A short window of what has already reached the playhead.
 * The graph is drawing that moment, so the loop ends there instead of
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
