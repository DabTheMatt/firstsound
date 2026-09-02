
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

/** Pointer X at the fade diamond maps 1:1 to fade length. */
export function fadeLengthFromDiamondTime(side: 'in' | 'out', start: number, end: number, t: number): number {
  const span = Math.max(0, end - start)
  if (side === 'in') return Math.max(0, Math.min(span, t - start))
  return Math.max(0, Math.min(span, end - t))
}
