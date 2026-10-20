import type { ArchitecturalElement, AttachmentType, ConstructionRole } from '../model'
import { CATALOG, catalogById } from './catalog'
import { GROUND_Y, sceneBounds, type SceneBounds } from './layout'
import { allowsLateral, canAttach, childRoles } from './rules'

const OVERLAP = 8

export type ConstructionIssue =
  | 'root'
  | 'foundation'
  | 'parent'
  | 'cycle'
  | 'disconnected'
  | 'incompatible'
  | 'anchor'
  | 'support'
  | 'overlap'
  | 'limit'

function overlapSize(a: SceneBounds, b: SceneBounds): { width: number; height: number } {
  return {
    width: Math.min(a.right, b.right) - Math.max(a.left, b.left),
    height: Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top),
  }
}

function linked(a: ArchitecturalElement, b: ArchitecturalElement): boolean {
  return a.parentId === b.id || b.parentId === a.id
}

export function overlaps(elements: readonly ArchitecturalElement[]): boolean {
  const boxes = elements.map((element) => ({ element, bounds: sceneBounds(element) }))
  for (let index = 0; index < boxes.length; index += 1) {
    for (let other = index + 1; other < boxes.length; other += 1) {
      const left = boxes[index]
      const right = boxes[other]
      if (!left || !right || linked(left.element, right.element)) continue
      const size = overlapSize(left.bounds, right.bounds)
      if (size.width > OVERLAP && size.height > OVERLAP) return true
    }
  }
  return false
}

function towerOnGround(element: ArchitecturalElement): boolean {
  return element.role === 'tower' && Math.abs(sceneBounds(element).bottom - GROUND_Y) < 6
}

export function issueIn(elements: readonly ArchitecturalElement[]): ConstructionIssue | null {
  if (elements.length === 0) return null
  const roots = elements.filter((element) => element.parentId == null)
  if (roots.length !== 1) return 'root'
  const root = roots[0]
  if (!root) return 'root'
  const rootEntry = catalogById(root.catalogId)
  if (!rootEntry?.foundation || root.role !== rootEntry.role) return 'foundation'
  if (root.attachmentType != null || root.attachmentAnchor != null) return 'anchor'
  const byId = new Map(elements.map((element) => [element.id, element]))
  const used = new Set<string>()
  for (const element of elements) {
    if (element.id === root.id) continue
    if (!element.parentId || !byId.has(element.parentId)) return 'parent'
    const parent = byId.get(element.parentId)
    if (!parent?.role || !element.role || !element.attachmentType) return 'incompatible'
    const parentEntry = catalogById(parent.catalogId)
    const childEntry = catalogById(element.catalogId)
    if (!parentEntry || !childEntry || parent.role !== parentEntry.role || element.role !== childEntry.role) return 'incompatible'
    if (!parentEntry.anchors.includes(element.attachmentType)) return 'anchor'
    if (element.attachmentAnchor !== element.attachmentType) return 'anchor'
    if (!canAttach(parent.role, element.attachmentType, element.role)) return 'incompatible'
    if (
      (element.attachmentType === 'LEFT' || element.attachmentType === 'RIGHT') &&
      !allowsLateral(parent.role, towerOnGround(parent))
    ) {
      return 'support'
    }
    const key = `${parent.id}:${element.attachmentType}`
    if (used.has(key)) return 'anchor'
    used.add(key)
    const seen = new Set<string>()
    let cursor: ArchitecturalElement | undefined = element
    while (cursor?.parentId) {
      if (seen.has(cursor.id)) return 'cycle'
      seen.add(cursor.id)
      cursor = byId.get(cursor.parentId)
    }
  }
  const reachable = new Set<string>([root.id])
  const queue = [root.id]
  while (queue.length > 0) {
    const id = queue.shift()
    if (!id) break
    for (const element of elements) {
      if (element.parentId === id && !reachable.has(element.id)) {
        reachable.add(element.id)
        queue.push(element.id)
      }
    }
  }
  if (reachable.size !== elements.length) return 'disconnected'
  if (overlaps(elements)) return 'overlap'
  return null
}

export function openDirections(elements: readonly ArchitecturalElement[], id: string): AttachmentType[] {
  const element = elements.find((item) => item.id === id)
  const entry = catalogById(element?.catalogId)
  if (!element?.role || !entry) return []
  const taken = new Set(elements.filter((item) => item.parentId === id).map((item) => item.attachmentType))
  const grounded = towerOnGround(element)
  return entry.anchors.filter((direction) => {
    if (taken.has(direction)) return false
    if ((direction === 'LEFT' || direction === 'RIGHT') && !allowsLateral(element.role as ConstructionRole, grounded)) return false
    const roles = childRoles(element.role as ConstructionRole, direction)
    return CATALOG.some((item) => roles.includes(item.role))
  })
}

export function entriesFor(parentRole: ConstructionRole, direction: AttachmentType) {
  const roles = childRoles(parentRole, direction)
  return CATALOG.filter((entry) => roles.includes(entry.role))
}

/** Neighbors that touch, besides the primary parent. Ownership stays a tree. */
export function secondaryTouches(elements: readonly ArchitecturalElement[], id: string): string[] {
  const element = elements.find((item) => item.id === id)
  if (!element) return []
  const bounds = sceneBounds(element)
  const names: string[] = []
  for (const other of elements) {
    if (other.id === id || other.id === element.parentId || other.parentId === id) continue
    const box = sceneBounds(other)
    const gapX = Math.max(0, Math.max(bounds.left, box.left) - Math.min(bounds.right, box.right))
    const gapY = Math.max(0, Math.max(bounds.top, box.top) - Math.min(bounds.bottom, box.bottom))
    if (gapX <= OVERLAP && gapY <= OVERLAP) names.push(other.id)
  }
  return names
}
