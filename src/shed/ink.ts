/**
 * Shared ink-and-wash grammar for every SHED category.
 * Irregularity is a tiny deterministic offset so a reload draws the same line.
 */

export const INK = '#1c140f'
export const PARCHMENT = '#f3e6c8'

export type GraphicPart = {
  id: string
  d: string
  fill?: string
  stroke?: string
  strokeWidth?: number
  opacity?: number
}

function mixChannel(from: number, to: number, amount: number): number {
  return Math.round(from + (to - from) * amount)
}

export function mixHex(hex: string, target: string, amount: number): string {
  const from = hex.replace('#', '')
  const to = target.replace('#', '')
  if (from.length < 6 || to.length < 6) return hex
  const t = Math.min(1, Math.max(0, amount))
  const channels = [0, 2, 4].map((index) => {
    const left = parseInt(from.slice(index, index + 2), 16)
    const right = parseInt(to.slice(index, index + 2), 16)
    if (!Number.isFinite(left) || !Number.isFinite(right)) return 0
    return mixChannel(left, right, t)
  })
  return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

export function n(value: number): string {
  if (!Number.isFinite(value)) return '0.0'
  return value.toFixed(1)
}

export function path(points: Array<[number, number]>, close = true): string {
  if (points.length === 0) return ''
  const body = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${n(point[0])} ${n(point[1])}`).join(' ')
  return close ? `${body} Z` : body
}

export function hashString(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function unitHash(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

/** A sub-pixel pen wobble. The same seed and point always return the same place. */
export function inkPath(points: Array<[number, number]>, seed: number, close = true): string {
  const jittered = points.map((point, index) => {
    const jx = (unitHash(seed + index * 19.1) - 0.5) * 0.7
    const jy = (unitHash(seed + index * 7.7 + 2.2) - 0.5) * 0.7
    return [point[0] + jx, point[1] + jy] as [number, number]
  })
  return path(jittered, close)
}

export function fill(id: string, d: string, color: string, opacity?: number): GraphicPart {
  return { id, d, fill: color, opacity }
}

export function stroke(id: string, d: string, color: string, width = 1.25, opacity = 1): GraphicPart {
  return { id, d, fill: 'none', stroke: color, strokeWidth: width, opacity }
}

export function wash(id: string, d: string, color: string): GraphicPart {
  return { id, d, fill: mixHex(color, PARCHMENT, 0.42), opacity: 0.28 }
}

export function hline(id: string, x1: number, x2: number, y: number, color: string): GraphicPart {
  return stroke(id, `M${n(x1)} ${n(y)} L${n(x2)} ${n(y)}`, color, 0.6, 0.38)
}

export function courses(prefix: string, x: number, y: number, w: number, h: number, color: string): GraphicPart[] {
  const parts: GraphicPart[] = []
  const gap = Math.max(12, Math.min(18, h / 8))
  let index = 0
  for (let line = y + gap; line < y + h - 4; line += gap) {
    parts.push(hline(`${prefix}-${index}`, x + 3, x + w - 3, line, color))
    index += 1
    if (index > 7) break
  }
  return parts
}

export function pointedArch(x: number, y: number, w: number, h: number): string {
  const cx = x + w / 2
  const spring = Math.min(y + h - 1, y + Math.max(w * 0.72, h * 0.42))
  return path([
    [x, y + h],
    [x, spring],
    [cx, y],
    [x + w, spring],
    [x + w, y + h],
  ])
}

export function roundArch(x: number, y: number, w: number, h: number): string {
  const radius = Math.max(0.5, w / 2)
  const rise = Math.min(radius, Math.max(1, h * 0.55))
  const spring = y + rise
  return `M${n(x)} ${n(y + h)} L${n(x)} ${n(spring)} A${n(radius)} ${n(rise)} 0 0 1 ${n(x + w)} ${n(spring)} L${n(x + w)} ${n(y + h)} Z`
}

export function rect(x: number, y: number, w: number, h: number): string {
  return path([
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ])
}

export function circle(cx: number, cy: number, r: number): string {
  const radius = Math.max(0.5, r)
  return `M${n(cx - radius)} ${n(cy)} a${n(radius)} ${n(radius)} 0 1 0 ${n(radius * 2)} 0 a${n(radius)} ${n(radius)} 0 1 0 ${n(-radius * 2)} 0`
}

export function star(cx: number, cy: number, radius: number): string {
  const points: Array<[number, number]> = []
  const size = Math.max(1, radius)
  for (let index = 0; index < 10; index += 1) {
    const arm = index % 2 === 0 ? size : size * 0.42
    const angle = -Math.PI / 2 + (index * Math.PI) / 5
    points.push([cx + Math.cos(angle) * arm, cy + Math.sin(angle) * arm])
  }
  return path(points)
}

export function sideQuad(
  x: number,
  y: number,
  w: number,
  h: number,
  depth: number,
  rise: number,
): Array<[number, number]> {
  return [
    [x + w, y],
    [x + w + depth, y - rise],
    [x + w + depth, y + h - rise],
    [x + w, y + h],
  ]
}

export function steps(value: number, count: number): number {
  if (!Number.isFinite(value) || count < 1) return 0
  const t = Math.min(0.999, Math.max(0, value))
  return Math.min(count - 1, Math.floor(t * count))
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * Math.min(1, Math.max(0, t))
}

export function countBetween(value: number, min: number, max: number): number {
  const span = max - min
  return min + Math.round(Math.min(1, Math.max(0, value)) * span)
}
