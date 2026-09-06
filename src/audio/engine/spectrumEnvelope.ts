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
): EnvelopePoint[] {
  const n = dbs.length
  if (n < 1) return []
  const logSpan = Math.log(Math.max(maxHz, minHz * 1.01) / Math.max(1, minHz))
  const dbSpan = dbCeil - dbFloor || 1
  const out: EnvelopePoint[] = []
  for (let i = 0; i < n; i++) {
    const hz = bandCenterHz(edges, i)
    const t = Math.log(Math.max(minHz, hz) / Math.max(1, minHz)) / logSpan
    const raw = dbs[i] ?? dbFloor
    const db = raw <= dbFloor + 1 ? dbFloor : raw + dbOffset
    const u = Math.min(1, Math.max(0, (dbCeil - db) / dbSpan))
    out.push({
      x: plot.left + t * (plot.right - plot.left),
      y: plot.top + u * (plot.bottom - plot.top),
    })
  }
  return out
}

/** Smooth polyline through band centers (midpoint quadratics). */
export function strokeSpectrumEnvelope(ctx: CanvasRenderingContext2D, points: EnvelopePoint[]): void {
  if (points.length === 0) return
  const first = points[0]!
  ctx.beginPath()
  ctx.moveTo(first.x, first.y)
  if (points.length === 1) {
    ctx.stroke()
    return
  }
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]!
    const cur = points[i]!
    const mx = (prev.x + cur.x) / 2
    const my = (prev.y + cur.y) / 2
    ctx.quadraticCurveTo(prev.x, prev.y, mx, my)
  }
  const last = points[points.length - 1]!
  ctx.lineTo(last.x, last.y)
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
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]!
    const cur = points[i]!
    const mx = (prev.x + cur.x) / 2
    const my = (prev.y + cur.y) / 2
    ctx.quadraticCurveTo(prev.x, prev.y, mx, my)
  }
  ctx.lineTo(last.x, last.y)
  ctx.lineTo(last.x, bottom)
  ctx.closePath()
  ctx.fill()
}
