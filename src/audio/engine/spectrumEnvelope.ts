import { hzToX, type FreqScaleKind } from './freqScale'
import { alignedBandDb, fftLastUsableBin, SPECTRUM_FLOOR_DB } from './spectrumBands'

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

/** Bar silhouette: one flat run per log band. The spectrum line uses writeSpectrumBinLine. */
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

export type SpectrumPlotRect = { left: number; right: number; top: number; bottom: number }

function spectrumDbToY(
  raw: number,
  plot: SpectrumPlotRect,
  dbCeil: number,
  dbFloor: number,
  dbOffset: number,
): number {
  const dbSpan = dbCeil - dbFloor || 1
  const db = Math.min(dbCeil, Math.max(dbFloor, alignedBandDb(raw, dbOffset, SPECTRUM_FLOOR_DB)))
  const u = Math.min(1, Math.max(0, (dbCeil - db) / dbSpan))
  return plot.top + u * (plot.bottom - plot.top)
}

/**
 * Spectrum stroke, drawn like an EQ correction curve: one vertex per FFT bin
 * at that bin's frequency, then straight segments. Flat bar tops are not repeated.
 * Writes x,y pairs into `out` and returns the point count.
 */
export function writeSpectrumBinLine(
  dbs: ArrayLike<number>,
  sampleRate: number,
  minHz: number,
  maxHz: number,
  plot: SpectrumPlotRect,
  out: Float32Array,
  dbCeil = 0,
  dbFloor = -100,
  dbOffset = 0,
  scale: FreqScaleKind = 'log',
): number {
  const n = dbs.length
  if (n < 2 || !(sampleRate > 0) || out.length < 2) return 0
  const fftSize = n * 2
  const last = Math.min(fftLastUsableBin(n), n - 1)
  let count = 0
  for (let i = 1; i <= last; i++) {
    const hz = (i * sampleRate) / fftSize
    if (hz < minHz) continue
    if (hz > maxHz) break
    const o = count * 2
    if (o + 1 >= out.length) break
    out[o] = hzToX(hz, minHz, maxHz, plot.left, plot.right, scale)
    out[o + 1] = spectrumDbToY(dbs[i] ?? SPECTRUM_FLOOR_DB, plot, dbCeil, dbFloor, dbOffset)
    count++
  }
  return count
}

/** Polyline through x,y pairs. Same segment style as the EQ magnitude stroke. */
export function strokeSpectrumXY(ctx: CanvasRenderingContext2D, xy: ArrayLike<number>, count: number): void {
  if (count < 1) return
  ctx.beginPath()
  ctx.moveTo(xy[0] ?? 0, xy[1] ?? 0)
  for (let i = 1; i < count; i++) ctx.lineTo(xy[i * 2] ?? 0, xy[i * 2 + 1] ?? 0)
  if (count === 1) {
    ctx.stroke()
    return
  }
  ctx.stroke()
}

export function fillSpectrumXY(
  ctx: CanvasRenderingContext2D,
  xy: ArrayLike<number>,
  count: number,
  bottom: number,
): void {
  if (count < 1) return
  const x0 = xy[0] ?? 0
  const y0 = xy[1] ?? bottom
  const last = count - 1
  ctx.beginPath()
  ctx.moveTo(x0, bottom)
  ctx.lineTo(x0, y0)
  for (let i = 1; i < count; i++) ctx.lineTo(xy[i * 2] ?? 0, xy[i * 2 + 1] ?? 0)
  ctx.lineTo(xy[last * 2] ?? x0, bottom)
  ctx.closePath()
  ctx.fill()
}
