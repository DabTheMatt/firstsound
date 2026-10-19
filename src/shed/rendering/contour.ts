import type { Contour, Point } from './types'

export function fmt(value: number): string {
  if (!Number.isFinite(value)) return '0.0'
  return (Math.round(value * 10) / 10).toFixed(1)
}

export function lineContour(id: string, points: readonly Point[], closed: boolean): Contour {
  const start = points[0] ?? [0, 0]
  return {
    id,
    closed,
    start,
    curves: points.slice(1).map((to) => ({ op: 'L', to })),
  }
}

export function rectContour(id: string, x: number, y: number, w: number, h: number): Contour {
  return lineContour(id, [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ], true)
}

/** Four-cubic circle. */
export function diskContour(id: string, cx: number, cy: number, r: number): Contour {
  const k = r * 0.5523
  return {
    id,
    closed: true,
    start: [cx - r, cy],
    curves: [
      { op: 'C', c1: [cx - r, cy - k], c2: [cx - k, cy - r], to: [cx, cy - r] },
      { op: 'C', c1: [cx + k, cy - r], c2: [cx + r, cy - k], to: [cx + r, cy] },
      { op: 'C', c1: [cx + r, cy + k], c2: [cx + k, cy + r], to: [cx, cy + r] },
      { op: 'C', c1: [cx - k, cy + r], c2: [cx - r, cy + k], to: [cx - r, cy] },
    ],
  }
}

/** Open circular arc, degrees clockwise from the +x axis in screen space (y down). */
export function arcContour(id: string, cx: number, cy: number, r: number, startDeg: number, endDeg: number): Contour {
  const sweep = endDeg - startDeg
  const steps = Math.max(3, Math.round(Math.abs(sweep) / 18))
  const points: Point[] = []
  for (let index = 0; index <= steps; index += 1) {
    const degree = startDeg + (sweep * index) / steps
    const angle = (degree * Math.PI) / 180
    points.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r])
  }
  return lineContour(id, points, false)
}

export function cubicPoint(from: Point, c1: Point, c2: Point, to: Point, t: number): Point {
  const m = 1 - t
  return [
    m * m * m * from[0] + 3 * m * m * t * c1[0] + 3 * m * t * t * c2[0] + t * t * t * to[0],
    m * m * m * from[1] + 3 * m * m * t * c1[1] + 3 * m * t * t * c2[1] + t * t * t * to[1],
  ]
}

export function contourPoints(contour: Contour, curveSamples = 4): Point[] {
  const points: Point[] = [contour.start]
  let previous = contour.start
  for (const curve of contour.curves) {
    if (curve.op === 'L') {
      points.push(curve.to)
      previous = curve.to
      continue
    }
    const samples = Math.max(1, curveSamples)
    for (let index = 1; index <= samples; index += 1) {
      points.push(cubicPoint(previous, curve.c1, curve.c2, curve.to, index / samples))
    }
    previous = curve.to
  }
  if (contour.closed && points.length > 2) {
    const first = points[0]!
    const last = points[points.length - 1]!
    if (Math.hypot(first[0] - last[0], first[1] - last[1]) < 0.45) points.pop()
  }
  return points
}

export function pointsPath(points: readonly Point[], closed: boolean): string {
  if (points.length === 0) return ''
  const body = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${fmt(point[0])} ${fmt(point[1])}`).join(' ')
  return closed && points.length > 2 ? `${body} Z` : body
}

/** Drops the crown of a silhouette so a wash can stop short of the spire. */
export function clipBelow(contour: Contour, y: number): Contour | null {
  const points = contourPoints(contour, 5).filter((point) => point[1] >= y - 0.5)
  if (points.length < 4) return null
  return lineContour(`${contour.id}-wash`, points, true)
}

export function contourPath(contour: Contour, curveSamples = 4): string {
  return pointsPath(contourPoints(contour, curveSamples), contour.closed)
}

export function translate(points: readonly Point[], dx: number, dy: number): Point[] {
  return points.map((point) => [point[0] + dx, point[1] + dy])
}

export function centroid(points: readonly Point[]): Point {
  if (points.length === 0) return [0, 0]
  let x = 0
  let y = 0
  for (const point of points) {
    x += point[0]
    y += point[1]
  }
  return [x / points.length, y / points.length]
}

/** Pulls every point toward the centroid by a fixed distance, without inverting the shape. */
export function shrink(points: readonly Point[], amount: number): Point[] {
  if (amount <= 0) return points.map((point) => [point[0], point[1]])
  const center = centroid(points)
  return points.map((point) => {
    const dx = point[0] - center[0]
    const dy = point[1] - center[1]
    const length = Math.hypot(dx, dy) || 1
    const pull = Math.min(amount, length * 0.42)
    return [point[0] - (dx / length) * pull, point[1] - (dy / length) * pull]
  })
}

export function boundsOf(points: readonly Point[]): { x: number; y: number; w: number; h: number } {
  if (points.length === 0) return { x: 0, y: 0, w: 0, h: 0 }
  let minX = points[0]![0]
  let minY = points[0]![1]
  let maxX = minX
  let maxY = minY
  for (const point of points) {
    minX = Math.min(minX, point[0])
    minY = Math.min(minY, point[1])
    maxX = Math.max(maxX, point[0])
    maxY = Math.max(maxY, point[1])
  }
  return { x: minX, y: minY, w: Math.max(0, maxX - minX), h: Math.max(0, maxY - minY) }
}

export function rotate(points: readonly Point[], degrees: number, origin?: Point): Point[] {
  const center = origin ?? centroid(points)
  const angle = (degrees * Math.PI) / 180
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return points.map((point) => {
    const dx = point[0] - center[0]
    const dy = point[1] - center[1]
    return [center[0] + dx * cos - dy * sin, center[1] + dx * sin + dy * cos]
  })
}
