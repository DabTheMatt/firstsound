/**
 * Waveform viewport math — a horizontal window [start, end] (seconds) into the
 * sample. Kept pure and free of DOM/audio so it is unit-testable and cheap.
 */
export type View = { start: number; end: number }

const MIN_SPAN = 0.002 // ~2 ms, floor so extreme zoom stays sane

export function clampView(view: View, duration: number, minSpan = MIN_SPAN): View {
  if (duration <= 0) return { start: 0, end: 0 }
  const span = Math.min(Math.max(view.end - view.start, minSpan), duration)
  const start = Math.min(Math.max(view.start, 0), Math.max(0, duration - span))
  return { start, end: start + span }
}

export function fitView(duration: number): View {
  return { start: 0, end: Math.max(duration, MIN_SPAN) }
}

/** Display zoom vs the whole sample. 100% = the full file is in view. */
export function zoomPercent(view: View, duration: number): number {
  if (duration <= 0) return 100
  const span = Math.max(view.end - view.start, MIN_SPAN)
  return (duration / span) * 100
}

/** Fraction [0..1] of the viewport width at time `t` (may be <0 or >1 if offscreen). */
export function timeToFrac(t: number, view: View): number {
  const span = view.end - view.start
  if (span <= 0) return 0
  return (t - view.start) / span
}

export function fracToTime(frac: number, view: View): number {
  return view.start + frac * (view.end - view.start)
}

/**
 * Zoom by `factor` (<1 zooms in, >1 zooms out) while keeping `focus` (seconds)
 * pinned to the same on-screen position.
 */
export function zoomAround(
  view: View,
  factor: number,
  focus: number,
  duration: number,
  minSpan = MIN_SPAN,
): View {
  const span = view.end - view.start
  if (span <= 0) return clampView(view, duration, minSpan)
  const rel = (focus - view.start) / span
  const nextSpan = Math.min(Math.max(span * factor, minSpan), Math.max(duration, minSpan))
  const start = focus - rel * nextSpan
  return clampView({ start, end: start + nextSpan }, duration, minSpan)
}

/** Zoom the selection to fill the view, leaving a small context margin each side. */
export function zoomToSelection(
  selStart: number,
  selEnd: number,
  duration: number,
  margin = 0.06,
): View {
  const span = Math.max(selEnd - selStart, MIN_SPAN)
  const pad = span * margin
  return clampView({ start: selStart - pad, end: selEnd + pad }, duration)
}

/** Pan by `delta` seconds, keeping the span fixed. */
export function panView(view: View, delta: number, duration: number): View {
  const span = view.end - view.start
  return clampView({ start: view.start + delta, end: view.end + delta }, duration, span)
}

/**
 * Trackpad / wheel: pan when the gesture is mostly horizontal (or Shift is held).
 * Returns seconds to shift the view, or null to zoom instead.
 */
export function wheelPanSeconds(
  deltaX: number,
  deltaY: number,
  shiftKey: boolean,
  viewSpan: number,
  widthPx: number,
): number | null {
  const pan = shiftKey || Math.abs(deltaX) > Math.abs(deltaY)
  if (!pan) return null
  const deltaPx = Math.abs(deltaX) >= Math.abs(deltaY) ? deltaX : deltaY
  return (deltaPx / Math.max(1, widthPx)) * viewSpan
}

/**
 * Vertical draw gain so `peak` fills `headroom` of the height. Used by
 * "Normalize View" — a display-only amplitude zoom, never touching audio.
 */
export function verticalGain(peak: number, headroom = 0.92): number {
  if (!(peak > 0)) return 1
  return Math.min(24, Math.max(1, headroom / peak))
}
