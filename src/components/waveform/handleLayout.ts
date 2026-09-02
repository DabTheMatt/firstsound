
/** Envelope diamonds sit below the loop nodes so the hit targets do not overlap. */
export const FADE_DIAMOND_TOP_PX = 20

/** Envelope diamonds share the loop-node X when fade length is 0. */
export function fadeHandleAtLoopFrac(loopEdgeFrac: number): number {
  return loopEdgeFrac
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

/** Pointer X at the fade diamond maps 1:1 to fade length. */
export function fadeLengthFromDiamondTime(side: 'in' | 'out', start: number, end: number, t: number): number {
  const span = Math.max(0, end - start)
  if (side === 'in') return Math.max(0, Math.min(span, t - start))
  return Math.max(0, Math.min(span, end - t))
}

/** Knob travel covers the region, and at least 8 s so short loops still have room. */
export function fadeKnobMaxSec(regionSec: number): number {
  return Math.max(8, Math.max(0, regionSec))
}
