import { buildElement } from '../geometry'
import type { ArchitecturalElement, AttachmentType } from '../model'
import { renderSketchTower, usesSketchTower } from '../rendering/tower'
import { SCENE_HEIGHT, SCENE_WIDTH, elementFit } from '../view'
import { catalogById } from './catalog'

/** Shared ground line, the same stroke the parchment already draws. */
export const GROUND_Y = Math.round(SCENE_HEIGHT * 0.78)

/** Ink overlap so connected faces meet without a gap. */
export const JOIN = 2

export const POSITION_MIN = -1.5
export const POSITION_MAX = 2.5

export type SceneBounds = {
  left: number
  right: number
  top: number
  bottom: number
  cx: number
}

type Metrics = {
  anchorX: number
  anchorY: number
  fit: number
  body: { x: number; y: number; w: number; h: number }
}

export function elementMetrics(element: ArchitecturalElement): Metrics {
  const graphic = usesSketchTower(element) ? renderSketchTower(element) : buildElement(element)
  return {
    anchorX: graphic.anchorX,
    anchorY: graphic.anchorY,
    fit: elementFit(graphic.width, graphic.height),
    body: graphic.body,
  }
}

/** Bounds of the architectural mass. Canvas padding around the drawing is not part of the joint. */
export function sceneBounds(element: ArchitecturalElement): SceneBounds {
  const metrics = elementMetrics(element)
  const ax = element.x * SCENE_WIDTH
  const ay = element.y * SCENE_HEIGHT
  const left = ax + (metrics.body.x - metrics.anchorX) * metrics.fit
  const top = ay + (metrics.body.y - metrics.anchorY) * metrics.fit
  const width = metrics.body.w * metrics.fit
  return {
    left,
    right: left + width,
    top,
    bottom: top + metrics.body.h * metrics.fit,
    cx: left + width / 2,
  }
}

function placeEdge(element: ArchitecturalElement, left: number, bottom: number): { x: number; y: number } {
  const metrics = elementMetrics(element)
  const ax = left - (metrics.body.x - metrics.anchorX) * metrics.fit
  const ay = bottom - (metrics.body.y + metrics.body.h - metrics.anchorY) * metrics.fit
  return { x: ax / SCENE_WIDTH, y: ay / SCENE_HEIGHT }
}

export function placeOnGround(element: ArchitecturalElement): { x: number; y: number } {
  const metrics = elementMetrics(element)
  const width = metrics.body.w * metrics.fit
  const left = SCENE_WIDTH / 2 - width / 2
  return placeEdge(element, left, GROUND_Y)
}

export function withinConstructionRange(value: number): boolean {
  return Number.isFinite(value) && value >= POSITION_MIN && value <= POSITION_MAX
}

function childrenOf(elements: readonly ArchitecturalElement[], parentId: string): ArchitecturalElement[] {
  return elements.filter((element) => element.parentId === parentId)
}

/**
 * Recomputes every descendant from the root anchor.
 * The root stays where it is. Children keep the anchor they were given.
 */
export function layoutTree(elements: readonly ArchitecturalElement[]): ArchitecturalElement[] | null {
  const root = elements.find((element) => element.parentId == null)
  if (!root) return elements.length === 0 ? [...elements] : null
  const placed = new Map<string, ArchitecturalElement>([[root.id, root]])
  const queue = [root]
  const seen = new Set<string>([root.id])
  while (queue.length > 0) {
    const parent = queue.shift()
    if (!parent) break
    const current = placed.get(parent.id)
    if (!current) return null
    const bounds = sceneBounds(current)
    for (const child of childrenOf(elements, parent.id)) {
      if (seen.has(child.id)) return null
      seen.add(child.id)
      const direction = child.attachmentType
      if (direction !== 'LEFT' && direction !== 'RIGHT' && direction !== 'TOP') return null
      const metrics = elementMetrics(child)
      const childWidth = metrics.body.w * metrics.fit
      let left = bounds.cx - childWidth / 2
      let bottom = bounds.top + JOIN
      if (direction === 'RIGHT') {
        left = bounds.right - JOIN
        bottom = bounds.bottom
      } else if (direction === 'LEFT') {
        left = bounds.left + JOIN - childWidth
        bottom = bounds.bottom
      }
      const position = placeEdge(child, left, bottom)
      if (!withinConstructionRange(position.x) || !withinConstructionRange(position.y)) return null
      const next = { ...child, x: position.x, y: position.y }
      placed.set(child.id, next)
      queue.push(next)
    }
  }
  if (seen.size !== elements.length) return null
  return elements.map((element) => placed.get(element.id) ?? element)
}

export function groundedTower(element: ArchitecturalElement): boolean {
  if (element.role !== 'tower') return false
  return Math.abs(sceneBounds(element).bottom - GROUND_Y) < 6
}

export function directionOf(value: string | null | undefined): AttachmentType | null {
  if (value === 'LEFT' || value === 'RIGHT' || value === 'TOP') return value
  return null
}

export function entryMatches(element: ArchitecturalElement): boolean {
  const entry = catalogById(element.catalogId)
  if (!entry || element.role !== entry.role) return false
  return true
}
