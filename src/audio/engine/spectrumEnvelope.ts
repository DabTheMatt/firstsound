import { hzToX, type FreqScaleKind } from './freqScale'
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
    const raw = dbs[i] ?? dbFloor
    const db = raw <= dbFloor + 1 ? dbFloor : raw + dbOffset
    const u = Math.min(1, Math.max(0, (dbCeil - db) / dbSpan))
    out.push({
      x: hzToX(hz, minHz, maxHz, plot.left, plot.right, scale),
      y: plot.top + u * (plot.bottom - plot.top),
    })
  }
  return out
}

/** Catmull-Rom segment that passes through both band points. */
function curveThrough(
  ctx: CanvasRenderingContext2D,
  points: EnvelopePoint[],
): void {
  const n = points.length
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i - 1] ?? points[i]!
    const p1 = points[i]!
    const p2 = points[i + 1]!
    const p3 = points[i + 2] ?? p2
    ctx.bezierCurveTo(
      p1.x + (p2.x - p0.x) / 6,
      p1.y + (p2.y - p0.y) / 6,
      p2.x - (p3.x - p1.x) / 6,
      p2.y - (p3.y - p1.y) / 6,
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
