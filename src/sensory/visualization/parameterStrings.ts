import { SENSORY_AXIS_IDS, type SensoryAxisId } from '../sensoryParameters'

export type StringInsets = {
  top: number
  right: number
  bottom: number
  left: number
}

export type ParameterStringGeom = {
  id: SensoryAxisId
  x1: number
  y1: number
  x2: number
  y2: number
}

export type StringIntersection = {
  a: SensoryAxisId
  b: SensoryAxisId
  x: number
  y: number
}

export const DEFAULT_STRING_INSETS: StringInsets = {
  top: 88,
  right: 168,
  bottom: 104,
  left: 168,
}

export function layoutParameterStrings(
  width: number,
  height: number,
  insets: StringInsets = DEFAULT_STRING_INSETS,
  ids: readonly SensoryAxisId[] = SENSORY_AXIS_IDS,
): ParameterStringGeom[] {
  const x0 = insets.left
  const y0 = insets.top
  const x1 = Math.max(x0 + 8, width - insets.right)
  const y1 = Math.max(y0 + 8, height - insets.bottom)
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  const rx = (x1 - x0) / 2
  const ry = (y1 - y0) / 2
  const n = ids.length || 1
  return ids.map((id, i) => {
    const a0 = (i * Math.PI * 2) / n - Math.PI / 2
    const a1 = a0 + Math.PI * (0.52 + (i % 5) * 0.09)
    return {
      id,
      x1: cx + Math.cos(a0) * rx,
      y1: cy + Math.sin(a0) * ry,
      x2: cx + Math.cos(a1) * rx,
      y2: cy + Math.sin(a1) * ry,
    }
  })
}

export function amountToT(amount: number, kind: 'unipolar' | 'bipolar'): number {
  if (kind === 'bipolar') return clamp01((amount + 1) / 2)
  return clamp01(amount)
}

export function tToAmount(t: number, kind: 'unipolar' | 'bipolar'): number {
  const u = clamp01(t)
  return kind === 'bipolar' ? u * 2 - 1 : u
}

export function pointAlong(geom: ParameterStringGeom, t: number): { x: number; y: number } {
  const u = clamp01(t)
  return {
    x: geom.x1 + (geom.x2 - geom.x1) * u,
    y: geom.y1 + (geom.y2 - geom.y1) * u,
  }
}

export function projectT(geom: ParameterStringGeom, x: number, y: number): number {
  const dx = geom.x2 - geom.x1
  const dy = geom.y2 - geom.y1
  const len2 = dx * dx + dy * dy
  if (len2 < 1e-8) return 0
  return clamp01(((x - geom.x1) * dx + (y - geom.y1) * dy) / len2)
}

export function distToString(geom: ParameterStringGeom, x: number, y: number): number {
  const t = projectT(geom, x, y)
  const p = pointAlong(geom, t)
  const dx = x - p.x
  const dy = y - p.y
  return Math.hypot(dx, dy)
}

export function nearestString(
  geoms: readonly ParameterStringGeom[],
  x: number,
  y: number,
  maxDist: number,
): ParameterStringGeom | null {
  let best: ParameterStringGeom | null = null
  let bestD = maxDist
  for (const geom of geoms) {
    const d = distToString(geom, x, y)
    if (d <= bestD) {
      bestD = d
      best = geom
    }
  }
  return best
}

export function stringAngleDeg(geom: ParameterStringGeom): number {
  const deg = (Math.atan2(geom.y2 - geom.y1, geom.x2 - geom.x1) * 180) / Math.PI
  if (deg > 90) return deg - 180
  if (deg < -90) return deg + 180
  return deg
}

export function stringLabelPose(
  geom: ParameterStringGeom,
  along = 0.07,
  offset = 16,
): { x: number; y: number; angle: number } {
  const p = pointAlong(geom, along)
  const dx = geom.x2 - geom.x1
  const dy = geom.y2 - geom.y1
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  const side = ny > 0 ? 1 : -1
  return {
    x: p.x + nx * offset * side,
    y: p.y + ny * offset * side,
    angle: stringAngleDeg(geom),
  }
}

export function stringIntersections(geoms: readonly ParameterStringGeom[]): StringIntersection[] {
  const hits: StringIntersection[] = []
  for (let i = 0; i < geoms.length; i++) {
    for (let j = i + 1; j < geoms.length; j++) {
      const a = geoms[i]!
      const b = geoms[j]!
      const p = segmentIntersection(a, b)
      if (!p) continue
      hits.push({ a: a.id, b: b.id, x: p.x, y: p.y })
    }
  }
  return hits
}

function segmentIntersection(
  a: ParameterStringGeom,
  b: ParameterStringGeom,
): { x: number; y: number } | null {
  const dax = a.x2 - a.x1
  const day = a.y2 - a.y1
  const dbx = b.x2 - b.x1
  const dby = b.y2 - b.y1
  const den = dax * dby - day * dbx
  if (Math.abs(den) < 1e-8) return null
  const sx = b.x1 - a.x1
  const sy = b.y1 - a.y1
  const t = (sx * dby - sy * dbx) / den
  const u = (sx * day - sy * dax) / den
  if (t < 0.02 || t > 0.98 || u < 0.02 || u > 0.98) return null
  return { x: a.x1 + dax * t, y: a.y1 + day * t }
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.min(1, Math.max(0, n))
}
