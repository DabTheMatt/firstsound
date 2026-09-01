import { formatTimecode, timecodeDigits } from '../../audio/engine/formatTime'

export type RulerStep = 1 | 10 | 30

/**
 * Major ruler interval from the visible span (and sample length when fully zoomed out).
 * 1 s when close, 10 s on medium views, 30 s on long overviews.
 */
export function rulerStepSeconds(viewSpan: number, sampleDuration: number): RulerStep {
  const span = Math.max(0, viewSpan)
  const dur = Math.max(0, sampleDuration)
  const fullyOut = dur > 0 && span >= dur * 0.85
  const scale = fullyOut ? Math.max(span, dur) : span
  if (scale <= 25) return 1
  if (scale <= 180) return 10
  return 30
}

export function rulerTickTimes(viewStart: number, viewEnd: number, step: number): number[] {
  if (!(step > 0) || viewEnd <= viewStart) return []
  const first = Math.ceil((viewStart - 1e-9) / step) * step
  const out: number[] = []
  for (let t = first; t <= viewEnd + 1e-9; t += step) {
    if (t >= 0) out.push(t)
  }
  return out
}

export type RulerMark = {
  t: number
  frac: number
  label: string
}

export function rulerMarks(
  viewStart: number,
  viewEnd: number,
  sampleDuration: number,
  minFracGap = 0.045,
): RulerMark[] {
  const span = Math.max(1e-6, viewEnd - viewStart)
  const step = rulerStepSeconds(span, sampleDuration)
  const digits = timecodeDigits(span)
  const times = rulerTickTimes(viewStart, viewEnd, step)
  const out: RulerMark[] = []
  let lastFrac = -1
  for (const t of times) {
    const frac = (t - viewStart) / span
    if (frac < -0.01 || frac > 1.01) continue
    if (out.length > 0 && frac - lastFrac < minFracGap) continue
    out.push({ t, frac, label: formatTimecode(t, digits) })
    lastFrac = frac
  }
  if (out.length === 0) {
    out.push({ t: viewStart, frac: 0, label: formatTimecode(viewStart, digits) })
    out.push({ t: viewEnd, frac: 1, label: formatTimecode(viewEnd, digits) })
  }
  return out
}
