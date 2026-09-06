/** Track tabs hang from the top of the wave pane; loop nodes sit below them. */
export const LOOP_HANDLE_TOP_PX = 26

export const LOOP_HANDLE_HEIGHT_PX = 16

/** Envelope diamonds sit below the loop nodes so the hit targets do not overlap. */
export const FADE_DIAMOND_TOP_PX = LOOP_HANDLE_TOP_PX + LOOP_HANDLE_HEIGHT_PX + 2

export const FADE_DIAMOND_SIZE_PX = 18

/** Delay/reverb overlay keeps the band above fade diamonds for loop / envelope. */
export const SPACE_HANDLE_TOP_PX = FADE_DIAMOND_TOP_PX + FADE_DIAMOND_SIZE_PX + 2

/** True when a pointer Y should grab a loop edge instead of the playhead. */
export function hitsLoopNodeY(y: number, hitPx: number): boolean {
  const pad = hitPx * 0.35
  return y >= LOOP_HANDLE_TOP_PX - pad && y <= LOOP_HANDLE_TOP_PX + LOOP_HANDLE_HEIGHT_PX + pad
}

/** Envelope diamonds share the loop-node X when fade length is 0. */
export function fadeHandleAtLoopFrac(loopEdgeFrac: number): number {
  return loopEdgeFrac
}

/** Fade-in always starts on loop start; fade-out always ends on loop end. */
export function fadeOriginTime(side: 'in' | 'out', start: number, end: number): number {
  return side === 'in' ? start : end
}

/** Fade length stays inside the loop; origin cannot leave the loop edge. */
export function clampFadeLengthToLoop(length: number, start: number, end: number): number {
  const span = Math.max(0, end - start)
  return Math.min(span, Math.max(0, length))
}

/** Diamond sits at the fade knee (end of fade-in / start of fade-out). */
export function fadeDiamondLayout(opts: {
  side: 'in' | 'out'
  start: number
  end: number
  fadeIn: number
  fadeOut: number
}): { time: number } {
  const span = Math.max(0, opts.end - opts.start)
  if (opts.side === 'in') {
    const dur = Math.min(Math.max(0, opts.fadeIn), span)
    return { time: opts.start + dur }
  }
  const dur = Math.min(Math.max(0, opts.fadeOut), span)
  return { time: opts.end - dur }
}

/** Mid-fade point on the envelope line, used by the shape handle. */
export function fadeShapeHandleLayout(opts: {
  side: 'in' | 'out'
  start: number
  end: number
  fadeIn: number
  fadeOut: number
}): { time: number; progress: number } | null {
  const span = Math.max(0, opts.end - opts.start)
  const dur = opts.side === 'in'
    ? Math.min(Math.max(0, opts.fadeIn), span)
    : Math.min(Math.max(0, opts.fadeOut), span)
  if (dur < 0.002) return null
  const time = opts.side === 'in' ? opts.start + dur * 0.5 : opts.end - dur * 0.5
  return { time, progress: 0.5 }
}

/** Pointer X at the fade diamond maps 1:1 to fade length, origin pinned to the loop. */
export function fadeLengthFromDiamondTime(side: 'in' | 'out', start: number, end: number, t: number): number {
  const origin = fadeOriginTime(side, start, end)
  if (side === 'in') return clampFadeLengthToLoop(t - origin, start, end)
  return clampFadeLengthToLoop(origin - t, start, end)
}

/** Knob travel covers the region, and at least 8 s so short loops still have room. */
export function fadeKnobMaxSec(regionSec: number): number {
  return Math.max(8, Math.max(0, regionSec))
}
