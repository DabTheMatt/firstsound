import { hzToX, type FreqScaleKind } from './freqScale'
import { alignedBandDb, SPECTRUM_FLOOR_DB } from './spectrumBands'

export type EnvelopePoint = { x: number; y: number }

export function spectrumEnvelopePoints(
  dbs: ArrayLike<number>,
  edges: ArrayLike<number>,
  minHz: number,
  maxHz: number,
  plot: { left: number; right: number; top: number; bottom: number },
  dbCeil = 0,
  dbFloor = -100,
  dbOffset = 0,
  scale: FreqScaleKind = 'log',
): EnvelopePoint[] {
  const n = dbs.length
  if (n < 1) return []
  const dbSpan = dbCeil - dbFloor || 1
  const out: EnvelopePoint[] = []
  const yOf = (raw: number) => {
    const db = Math.min(dbCeil, Math.max(dbFloor, alignedBandDb(raw, dbOffset, SPECTRUM_FLOOR_DB)))
    const u = Math.min(1, Math.max(0, (dbCeil - db) / dbSpan))
    return plot.top + u * (plot.bottom - plot.top)
  }
  for (let i = 0; i < n; i++) {
    const y = yOf(dbs[i] ?? SPECTRUM_FLOOR_DB)
    const x0 = hzToX(edges[i] ?? minHz, minHz, maxHz, plot.left, plot.right, scale)
    const x1 = hzToX(edges[i + 1] ?? maxHz, minHz, maxHz, plot.left, plot.right, scale)
    out.push({ x: x0, y }, { x: x1, y })
  }
  return out
}

/** Straight segments so quiet bins stay on the graph instead of spline-clipping away. */
function traceEnvelope(ctx: CanvasRenderingContext2D, points: EnvelopePoint[]): void {
  for (let i = 1; i < points.length; i++) {
    const p = points[i]!
    ctx.lineTo(p.x, p.y)
  }
}

/** Polyline across every analysed band, matching the bar tops. */
export function strokeSpectrumEnvelope(ctx: CanvasRenderingContext2D, points: EnvelopePoint[]): void {
  if (points.length === 0) return
  const first = points[0]!
  ctx.beginPath()
  ctx.moveTo(first.x, first.y)
  if (points.length === 1) {
    ctx.stroke()
    return
  }
  traceEnvelope(ctx, points)
  ctx.stroke()
}

export function fillSpectrumEnvelope(
  ctx: CanvasRenderingContext2D,
  points: EnvelopePoint[],
  bottom: number,
): void {
  if (points.length === 0) return
  const first = points[0]!
  const last = points[points.length - 1]!
  ctx.beginPath()
  ctx.moveTo(first.x, bottom)
  ctx.lineTo(first.x, first.y)
  traceEnvelope(ctx, points)
  ctx.lineTo(last.x, bottom)
  ctx.closePath()
  ctx.fill()
}
