import { diskContour, lineContour } from './contour'
import type { Contour, Point } from './types'

/** Pointed arch. The apex is an angle, in the manner of a Gothic lancet. */
export function lancetContour(id: string, x: number, y: number, w: number, h: number): Contour {
  const cx = x + w / 2
  const arch = Math.min(h * 0.62, Math.max(w * 1.15, h * 0.38))
  const spring = y + arch
  const shoulder = arch * 0.48
  return {
    id,
    closed: true,
    start: [x, y + h],
    curves: [
      { op: 'L', to: [x, spring] },
      { op: 'C', c1: [x, spring - shoulder], c2: [cx - w * 0.16, y + arch * 0.36], to: [cx, y] },
      { op: 'C', c1: [cx + w * 0.16, y + arch * 0.36], c2: [x + w, spring - shoulder], to: [x + w, spring] },
      { op: 'L', to: [x + w, y + h] },
    ],
  }
}

/** Open hood mould over a pair of lights. */
export function hoodContour(id: string, x: number, y: number, w: number, h: number): Contour {
  const cx = x + w / 2
  return {
    id,
    closed: false,
    start: [x, y + h],
    curves: [
      { op: 'C', c1: [x, y + h * 0.35], c2: [cx - w * 0.18, y + h * 0.2], to: [cx, y] },
      { op: 'C', c1: [cx + w * 0.18, y + h * 0.2], c2: [x + w, y + h * 0.35], to: [x + w, y + h] },
    ],
  }
}

export function crocketContour(id: string, x: number, y: number, direction: number): Contour {
  return lineContour(id, [
    [x, y + 2],
    [x + direction * 7.5, y - 1.5],
    [x + direction * 1.6, y - 7],
    [x + direction * 0.4, y - 2],
  ], true)
}

/** Small crown, kin to the finial of the taller St. Mary's spire. */
export function finialContour(id: string, cx: number, cy: number): Contour {
  return lineContour(id, [
    [cx - 8, cy],
    [cx - 8, cy - 8],
    [cx - 4.5, cy - 3],
    [cx - 2.2, cy - 12],
    [cx, cy - 5],
    [cx + 2.2, cy - 14],
    [cx + 4.5, cy - 3],
    [cx + 8, cy - 8],
    [cx + 8, cy],
  ], true)
}

export function starContour(id: string, cx: number, cy: number, radius = 12): Contour {
  const points: Point[] = []
  for (let index = 0; index < 10; index += 1) {
    const arm = index % 2 === 0 ? radius : radius * 0.42
    const angle = -Math.PI / 2 + (index * Math.PI) / 5
    points.push([cx + Math.cos(angle) * arm, cy + Math.sin(angle) * arm])
  }
  return lineContour(id, points, true)
}

export function rosetteContours(id: string, cx: number, cy: number): Contour[] {
  const petals = [0, 60, 120, 180, 240, 300].map((degree, index) => {
    const angle = (degree * Math.PI) / 180
    return diskContour(`${id}-petal-${index}`, cx + Math.cos(angle) * 7.2, cy + Math.sin(angle) * 7.2, 3.6)
  })
  return [diskContour(`${id}-heart`, cx, cy, 2.8), ...petals]
}

export function collarContour(id: string, left: Point, right: Point): Contour {
  const y = (left[1] + right[1]) / 2
  return lineContour(id, [
    [left[0], y - 2.2],
    [right[0], y - 2.2],
    [right[0] + 1, y + 2.4],
    [left[0] - 1, y + 2.4],
  ], true)
}
