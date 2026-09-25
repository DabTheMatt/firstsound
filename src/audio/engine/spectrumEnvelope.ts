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
    // Gate on the analyser floor, not the display floor. Quiet bins still
    // receive the meter-align offset and then sit on the graph floor.
    const db = alignedBandDb(raw, dbOffset)
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

/** Catmull-Rom segment through every band. Control points stay inside the data span so the stroke cannot leave the plot and re-enter as a second lobe. */
function curveThrough(
  ctx: CanvasRenderingContext2D,
  points: EnvelopePoint[],
): void {
  const n = points.length
  let yMin = Infinity
  let yMax = -Infinity
  for (const p of points) {
    if (p.y < yMin) yMin = p.y
    if (p.y > yMax) yMax = p.y
  }
  const clampY = (y: number) => Math.min(yMax, Math.max(yMin, y))
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i - 1] ?? points[i]!
    const p1 = points[i]!
    const p2 = points[i + 1]!
    const p3 = points[i + 2] ?? p2
    ctx.bezierCurveTo(
      p1.x + (p2.x - p0.x) / 6,
      clampY(p1.y + (p2.y - p0.y) / 6),
      p2.x - (p3.x - p1.x) / 6,
      clampY(p2.y - (p3.y - p1.y) / 6),
      p2.x,
      p2.y,
    )
  }
}

/** Smooth polyline that passes through every band center. */
export function strokeSpectrumEnvelope(ctx: CanvasRenderingContext2D, points: EnvelopePoint[]): void {
  if (points.length === 0) return
  const first = points[0]!
  ctx.beginPath()
  ctx.moveTo(first.x, first.y)
  if (points.length === 1) {
    ctx.stroke()
    return
  }
  curveThrough(ctx, points)
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
  curveThrough(ctx, points)
  ctx.lineTo(last.x, bottom)
  ctx.closePath()
  ctx.fill()
}
