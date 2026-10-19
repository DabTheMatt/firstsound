import type { ColorTreatment } from '../model'
import { SHED_INK, SHED_PARCHMENT } from '../palette'
import { contourPoints, pointsPath, rotate, shrink, translate } from './contour'
import type { Rng } from './seed'
import type { Contour, Point, SketchPart } from './types'

export function normalizeHex(value: string | undefined, fallback: string): string {
  if (!value) return fallback
  const next = value.trim().toLowerCase()
  return /^#[0-9a-f]{6}$/.test(next) ? next : fallback
}

export function mixHex(hex: string, target: string, amount: number): string {
  const from = normalizeHex(hex, '#000000').slice(1)
  const to = normalizeHex(target, '#ffffff').slice(1)
  const t = Math.min(1, Math.max(0, amount))
  const channels = [0, 2, 4].map((index) => {
    const start = parseInt(from.slice(index, index + 2), 16)
    const end = parseInt(to.slice(index, index + 2), 16)
    return Math.round(start + (end - start) * t)
  })
  return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

export type WashOptions = {
  treatment: ColorTreatment
  abstraction: number
  rng: Rng
  opacity?: number
  inset?: number
}

function layerCount(treatment: ColorTreatment): number {
  if (treatment === 'reserve') return 1
  if (treatment === 'layered') return 3
  return 2
}

export function wash(id: string, contour: Contour, fill: string, options: WashOptions): SketchPart[] {
  const sampled = contourPoints(contour, 3)
  if (sampled.length < 3) return []
  const abstraction = Math.min(1, Math.max(0, options.abstraction))
  const layers = layerCount(options.treatment)
  const baseOpacity = options.opacity ?? (options.treatment === 'reserve' ? 0.34 : 0.5)
  const shift = 0.35 + abstraction * 7.2
  const parts: SketchPart[] = []
  for (let index = 0; index < layers; index += 1) {
    const dx = (options.rng.next() - 0.42) * shift * (index === 0 ? 1 : 0.72)
    const dy = (options.rng.next() - 0.38) * shift * (index === 0 ? 0.85 : 0.7)
    const pull = (options.inset ?? (options.treatment === 'reserve' ? 4.5 : 2.2)) + index * 1.6 + abstraction * 1.4
    const patch = translate(shrink(sampled, pull), dx, dy)
    const tint = index === 0 ? fill : index === 1 ? mixHex(fill, SHED_PARCHMENT, 0.38) : mixHex(fill, SHED_INK, 0.12)
    parts.push({
      id: index === 0 ? id : `${id}-${index}`,
      d: pointsPath(patch, true),
      layer: 'color',
      fill: tint,
      fillOpacity: Math.max(0.12, baseOpacity - index * 0.14),
      stroke: 'none',
      pointerEvents: 'none',
    })
  }
  return parts
}

/** A small irregular stain. Count stays low; this is pigment, not noise. */
export function pigment(id: string, anchor: Point, radius: number, fill: string, rng: Rng, opacity: number): SketchPart | null {
  if (radius < 2) return null
  const count = 5
  const points: Point[] = []
  for (let index = 0; index < count; index += 1) {
    const angle = (-Math.PI / 2) + (index * Math.PI * 2) / count
    const reach = radius * (0.55 + rng.next() * 0.5)
    points.push([anchor[0] + Math.cos(angle) * reach, anchor[1] + Math.sin(angle) * reach * 0.82])
  }
  return {
    id,
    d: pointsPath(points, true),
    layer: 'color',
    fill,
    fillOpacity: opacity,
    stroke: 'none',
    pointerEvents: 'none',
  }
}

export function looseRect(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  degrees: number,
  fill: string,
  opacity: number,
): SketchPart {
  const points = rotate(
    [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ],
    degrees,
  )
  return {
    id,
    d: pointsPath(points, true),
    layer: 'color',
    fill,
    fillOpacity: opacity,
    stroke: 'none',
    pointerEvents: 'none',
  }
}
