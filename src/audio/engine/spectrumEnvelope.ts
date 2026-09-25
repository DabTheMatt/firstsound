import { hzToX, type FreqScaleKind } from './freqScale'
import { SPECTRUM_FLOOR_DB } from './spectrumBands'
import { bandCenterHz } from './spectrumRegions'

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
  for (let i = 0; i < n; i++) {
    const hz = bandCenterHz(edges, i)
    const raw = dbs[i] ?? SPECTRUM_FLOOR_DB
    // Analyser silence stays on the floor. Quieter-but-real bins get the same
    // meter alignment as the bars, then sit on the graph floor if they are still below it.
    const lifted = raw <= SPECTRUM_FLOOR_DB + 1 ? SPECTRUM_FLOOR_DB : raw + dbOffset
    const db = Math.min(dbCeil, Math.max(dbFloor, lifted))
    const u = Math.min(1, Math.max(0, (dbCeil - db) / dbSpan))
    out.push({
      x: hzToX(hz, minHz, maxHz, plot.left, plot.right, scale),
      y: plot.top + u * (plot.bottom - plot.top),
    })
  }
  return out
}

/** Straight segments through every band so quiet bins stay on the graph instead of spline-clipping away. */
function traceEnvelope(ctx: CanvasRenderingContext2D, points: EnvelopePoint[]): void {
  for (let i = 1; i < points.length; i++) {
    const p = points[i]!
    ctx.lineTo(p.x, p.y)
  }
}

/** Polyline that passes through every band center. */
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
