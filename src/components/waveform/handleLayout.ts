import { fadeGain, type FadeCurve } from '../../audio/engine/fades'

/** Envelope diamonds share the loop-node X; CSS stacks them underneath. */
export function fadeHandleAtLoopFrac(loopEdgeFrac: number): number {
  return loopEdgeFrac
}

/** Diamond sits at the fade midpoint, on the envelope line (y=0 top, y=1 bottom). */
export function fadeDiamondLayout(opts: {
  side: 'in' | 'out'
  start: number
  end: number
  fadeIn: number
  fadeOut: number
  curve: FadeCurve
  bend: number
}): { time: number; y: number } {
  const span = Math.max(0, opts.end - opts.start)
  const gain = fadeGain(0.5, opts.curve, opts.bend)
  const y = 1 - gain
  if (opts.side === 'in') {
    const dur = Math.min(Math.max(0, opts.fadeIn), span)
    return { time: opts.start + dur * 0.5, y }
  }
  const dur = Math.min(Math.max(0, opts.fadeOut), span)
  return { time: opts.end - dur * 0.5, y }
}

/** Pointer X at the fade diamond maps to fade length (diamond is at 50% of the fade). */
export function fadeLengthFromDiamondTime(side: 'in' | 'out', start: number, end: number, t: number): number {
  const span = Math.max(0, end - start)
  if (side === 'in') return Math.max(0, Math.min(span, 2 * (t - start)))
  return Math.max(0, Math.min(span, 2 * (end - t)))
}
