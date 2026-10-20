import { SHED_GOLD } from './palette'
import { SHED_STYLE } from './style'

export type DrawPart = {
  id: string
  d: string
  fill: string
  opacity?: number
  fillOpacity?: number
  stroke?: string
  strokeWidth?: number
  strokeOpacity?: number
  strokeDasharray?: string
  fillRule?: 'evenodd' | 'nonzero'
  pointerEvents?: 'none'
}

export function n(value: number): string {
  return value.toFixed(1)
}

function hash(seed: number): number {
  const wave = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return wave - Math.floor(wave)
}

/** Stable, small offset so an outline can wander without leaving its structure. */
export function jitter(x: number, y: number, salt: number, amount: number): [number, number] {
  return [x + (hash(salt + 1.3) - 0.5) * amount, y + (hash(salt + 9.1) - 0.5) * amount]
}

export function poly(points: Array<[number, number]>, salt = 0, amount = 0, close = true): string {
  const body = points
    .map((point, index) => {
      const [x, y] = amount > 0 ? jitter(point[0], point[1], salt + index * 2.17, amount) : point
      return `${index === 0 ? 'M' : 'L'}${n(x)} ${n(y)}`
    })
    .join(' ')
  return close ? `${body} Z` : body
}

/** Pointed arch. The two cubics meet at an angle instead of a round top. */
export function lancet(x: number, y: number, w: number, h: number): string {
  const cx = x + w / 2
  const arch = Math.min(h * 0.58, Math.max(w * 1.2, h * 0.4))
  const spring = y + arch
  const shoulder = arch * 0.46
  return [
    `M${n(x)} ${n(y + h)}`,
    `L${n(x)} ${n(spring)}`,
    `C${n(x)} ${n(spring - shoulder)} ${n(cx - w * 0.2)} ${n(y + arch * 0.42)} ${n(cx)} ${n(y)}`,
    `C${n(cx + w * 0.2)} ${n(y + arch * 0.42)} ${n(x + w)} ${n(spring - shoulder)} ${n(x + w)} ${n(spring)}`,
    `L${n(x + w)} ${n(y + h)}`,
    'Z',
  ].join(' ')
}

/** A tall face with a few drifted corners, so the ink is not a ruled rectangle. */
export function facade(x: number, y: number, w: number, h: number, salt: number, amount: number): string {
  const segs = h > 200 ? 4 : 3
  const pts: Array<[number, number]> = []
  for (let i = 0; i <= segs; i += 1) pts.push([x + (w * i) / segs, y])
  for (let i = 1; i <= segs; i += 1) pts.push([x + w, y + (h * i) / segs])
  for (let i = 1; i <= segs; i += 1) pts.push([x + w - (w * i) / segs, y + h])
  for (let i = 1; i < segs; i += 1) pts.push([x, y + h - (h * i) / segs])
  return poly(pts, salt, amount)
}

export function disk(cx: number, cy: number, r: number): string {
  return `M${n(cx - r)} ${n(cy)} a${n(r)} ${n(r)} 0 1 0 ${n(r * 2)} 0 a${n(r)} ${n(r)} 0 1 0 ${n(-r * 2)} 0`
}

function variedWeight(base: number, salt: number): number {
  return base + (hash(salt + 4.2) - 0.5) * Math.min(SHED_STYLE.strokeWander, base * 0.22)
}

export function solid(
  id: string,
  d: string,
  fill: string,
  options?: { weight?: number; salt?: number; fillOpacity?: number },
): DrawPart {
  const salt = options?.salt ?? id.length * 3
  const weight = options?.weight ?? SHED_STYLE.strokeBody
  return {
    id,
    d,
    fill,
    fillOpacity: options?.fillOpacity ?? SHED_STYLE.washOpacity,
    stroke: SHED_STYLE.ink,
    strokeWidth: variedWeight(weight, salt),
  }
}

export function opening(id: string, d: string, fill: string): DrawPart {
  return {
    id,
    d,
    fill,
    fillOpacity: SHED_STYLE.openingOpacity,
    stroke: SHED_STYLE.ink,
    strokeWidth: SHED_STYLE.strokeOpening,
  }
}

export function hairline(id: string, d: string, opacity: number = SHED_STYLE.hairlineOpacity): DrawPart {
  return {
    id,
    d,
    fill: 'none',
    stroke: SHED_STYLE.ink,
    strokeWidth: SHED_STYLE.strokeHairline,
    strokeOpacity: opacity,
    pointerEvents: 'none',
  }
}

export function construction(id: string, d: string): DrawPart {
  return {
    id,
    d,
    fill: 'none',
    stroke: SHED_STYLE.constructionLine,
    strokeWidth: SHED_STYLE.strokeConstruction,
    strokeOpacity: SHED_STYLE.constructionOpacity,
    strokeDasharray: SHED_STYLE.constructionDash,
    pointerEvents: 'none',
  }
}

export function accent(id: string, d: string, fill = SHED_GOLD): DrawPart {
  return {
    id,
    d,
    fill,
    fillOpacity: 1,
    stroke: SHED_STYLE.ink,
    strokeWidth: SHED_STYLE.strokeAccent,
  }
}

export function cubic(
  _from: [number, number],
  c1: [number, number],
  c2: [number, number],
  to: [number, number],
): string {
  return `C${n(c1[0])} ${n(c1[1])} ${n(c2[0])} ${n(c2[1])} ${n(to[0])} ${n(to[1])}`
}

export function pointOnCubic(
  from: [number, number],
  c1: [number, number],
  c2: [number, number],
  to: [number, number],
  t: number,
): [number, number] {
  const m = 1 - t
  const x = m * m * m * from[0] + 3 * m * m * t * c1[0] + 3 * m * t * t * c2[0] + t * t * t * to[0]
  const y = m * m * m * from[1] + 3 * m * m * t * c1[1] + 3 * m * t * t * c2[1] + t * t * t * to[1]
  return [x, y]
}
