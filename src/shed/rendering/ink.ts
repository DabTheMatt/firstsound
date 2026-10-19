import type { InkStyle } from '../model'
import { SHED_INK, SHED_WARM_GRAY } from '../palette'
import { contourPoints, fmt, pointsPath } from './contour'
import type { Rng } from './seed'
import type { Contour, Point, SketchPart } from './types'

type InkStyleName = InkStyle

export type InkOptions = {
  style: InkStyleName
  abstraction: number
  rng: Rng
  /** Scales wobble for small motifs so a lancet stays a lancet. */
  scale?: number
  weight?: number
  /** A second, shorter stroke beside part of the contour. */
  echo?: boolean
  dashed?: boolean
  color?: string
  opacity?: number
  layer?: SketchPart['layer']
}

function styleAmp(style: InkStyleName): number {
  if (style === 'steady') return 0.42
  if (style === 'loose') return 1.28
  return 1
}

function densify(points: readonly Point[], closed: boolean, maxEdge: number): Point[] {
  if (points.length < 2) return [...points]
  const source = closed ? [...points, points[0]!] : [...points]
  const out: Point[] = []
  for (let index = 0; index < source.length - 1; index += 1) {
    const from = source[index]!
    const to = source[index + 1]!
    out.push(from)
    const distance = Math.hypot(to[0] - from[0], to[1] - from[1])
    const inserts = Math.min(3, Math.floor(distance / maxEdge))
    for (let step = 1; step <= inserts; step += 1) {
      const t = step / (inserts + 1)
      out.push([from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t])
    }
  }
  if (!closed) out.push(source[source.length - 1]!)
  return out
}

function wobble(points: readonly Point[], rng: Rng, amount: number, closed: boolean): Point[] {
  return points.map((point, index) => {
    const end = index === 0 || index === points.length - 1
    if (!closed && end) return [point[0], point[1]]
    const previous = points[(index - 1 + points.length) % points.length] ?? point
    const next = points[(index + 1) % points.length] ?? point
    const dx = next[0] - previous[0]
    const dy = next[1] - previous[1]
    const length = Math.hypot(dx, dy) || 1
    const gain = (rng.next() - 0.5) * 2 * amount
    return [point[0] + (-dy / length) * gain, point[1] + (dx / length) * gain]
  })
}

function withGap(points: readonly Point[], gap: number): string {
  const commands: string[] = []
  let down = false
  points.forEach((point, index) => {
    const skipped = index === gap || index === gap + 1
    if (skipped) {
      down = false
      return
    }
    commands.push(`${down ? 'L' : 'M'}${fmt(point[0])} ${fmt(point[1])}`)
    down = true
  })
  return commands.join(' ')
}

function echoStroke(points: readonly Point[], rng: Rng, amount: number): Point[] | null {
  if (points.length < 7) return null
  const start = 1 + rng.int(0, Math.min(2, points.length - 5))
  const span = Math.max(3, Math.floor(points.length * (0.28 + rng.next() * 0.22)))
  const end = Math.min(points.length - 1, start + span)
  if (end - start < 3) return null
  const slice = points.slice(start, end)
  const first = slice[0]!
  const last = slice[slice.length - 1]!
  const dx = last[0] - first[0]
  const dy = last[1] - first[1]
  const length = Math.hypot(dx, dy) || 1
  const nx = -dy / length
  const ny = dx / length
  const offset = 1.8 + amount * 0.45
  return slice.map((point) => [point[0] + nx * offset, point[1] + ny * offset])
}

export function trace(id: string, contour: Contour, options: InkOptions): SketchPart[] {
  const curved = contour.curves.some((curve) => curve.op === 'C')
  const sampled = contourPoints(contour, curved ? 6 : 1)
  if (sampled.length < 2) return []
  const scale = options.scale ?? 1
  const prepared = !options.dashed && scale > 0.75 ? densify(sampled, contour.closed, 52) : sampled
  const abstraction = Math.min(1, Math.max(0, options.abstraction))
  const amount = (0.85 + abstraction * 2.6) * styleAmp(options.style) * scale
  const drawn = wobble(prepared, options.rng, amount, contour.closed)
  const allowGap = !options.dashed && abstraction > 0.34 && drawn.length > 8 && options.rng.chance(0.35 + abstraction * 0.4)
  const gapAt = allowGap ? options.rng.int(2, Math.max(2, drawn.length - 4)) : -1
  const d = gapAt >= 0 ? withGap(drawn, gapAt) : pointsPath(drawn, contour.closed && gapAt < 0)
  if (!d) return []
  const weight = options.weight ?? 1.15
  const widthJitter = 1 + (options.rng.next() - 0.5) * (0.12 + abstraction * 0.22)
  const parts: SketchPart[] = [
    {
      id,
      d,
      layer: options.layer ?? (options.dashed ? 'construction' : 'ink'),
      fill: 'none',
      stroke: options.color ?? (options.dashed ? SHED_WARM_GRAY : SHED_INK),
      strokeWidth: Math.max(0.35, weight * widthJitter),
      strokeOpacity: options.opacity ?? (options.dashed ? 0.55 : 0.92),
      strokeDasharray: options.dashed ? '3.2 3.4' : undefined,
      pointerEvents: 'none',
    },
  ]
  const echoChance = options.style === 'steady' ? 0.08 : options.style === 'loose' ? 0.75 : 0.42
  if (options.echo && options.rng.chance(echoChance * (0.35 + abstraction))) {
    const echo = echoStroke(drawn, options.rng, amount)
    if (echo) {
      parts.push({
        id: `${id}-echo`,
        d: pointsPath(echo, false),
        layer: 'ink',
        fill: 'none',
        stroke: options.color ?? SHED_INK,
        strokeWidth: Math.max(0.3, weight * 0.55),
        strokeOpacity: 0.45,
        pointerEvents: 'none',
      })
    }
  }
  return parts
}

/** Short broken courses. One path, so a shaft does not become a grid of nodes. */
export function hatch(id: string, x: number, y: number, w: number, h: number, rng: Rng, abstraction: number): SketchPart | null {
  if (w < 8 || h < 12) return null
  const rows = Math.min(9, 4 + Math.round(abstraction * 4))
  const commands: string[] = []
  for (let row = 0; row < rows; row += 1) {
    const lineY = y + ((row + 1) * h) / (rows + 1) + (rng.next() - 0.5) * 1.2
    const inset = 5 + rng.next() * 4
    const gap = w * (0.18 + rng.next() * 0.12)
    const mid = x + w / 2 + (rng.next() - 0.5) * 6
    commands.push(`M${fmt(x + inset)} ${fmt(lineY)} L${fmt(mid - gap / 2)} ${fmt(lineY)}`)
    commands.push(`M${fmt(mid + gap / 2)} ${fmt(lineY)} L${fmt(x + w - inset)} ${fmt(lineY)}`)
  }
  return {
    id,
    d: commands.join(' '),
    layer: 'hatch',
    fill: 'none',
    stroke: SHED_INK,
    strokeWidth: 0.55,
    strokeOpacity: 0.28 + abstraction * 0.12,
    pointerEvents: 'none',
  }
}
