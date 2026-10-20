import {
  defaultElement,
  isConstructionDocument,
  type ArchitecturalElement,
  type AttachmentType,
  type ElementParams,
  type OrnamentId,
  type ShedDocument,
} from '../model'

const MAX_ELEMENTS = 64

type ConstructionPatch = {
  height?: number
  width?: number
  roof?: number
  primary?: string
  secondary?: string
  detail?: string
  ornament?: OrnamentId
  params?: Partial<ElementParams>
  layer?: number
  variant?: number
}
import { catalogById, type CatalogEntry } from './catalog'
import { elementFromCatalog } from './element'
import { issueIn, openDirections } from './graph'
import { layoutTree, placeOnGround, POSITION_MAX, POSITION_MIN } from './layout'
import { canAttach } from './rules'

export type ConstructionIssueCode =
  | 'incompatible'
  | 'overlap'
  | 'anchor'
  | 'foundation'
  | 'support'
  | 'limit'
  | 'parent'

export type ConstructionResult = {
  document: ShedDocument
  error: ConstructionIssueCode | null
  addedId: string | null
}

function same(document: ShedDocument, error: ConstructionIssueCode | null = null): ConstructionResult {
  return { document, error, addedId: null }
}

function nextId(document: ShedDocument, type: ArchitecturalElement['type']): string {
  const used = new Set(document.scene.elements.map((element) => element.id))
  let index = 1
  let id = `${type}-${index}`
  while (used.has(id)) {
    index += 1
    id = `${type}-${index}`
  }
  return id
}

function commit(document: ShedDocument, elements: ArchitecturalElement[], addedId: string | null): ConstructionResult {
  const laid = layoutTree(elements)
  if (!laid) return same(document, 'limit')
  if (JSON.stringify(laid) === JSON.stringify(document.scene.elements)) return same(document)
  const issue = issueIn(laid)
  if (issue === 'overlap') return same(document, 'overlap')
  if (issue === 'incompatible' || issue === 'foundation') return same(document, issue === 'foundation' ? 'foundation' : 'incompatible')
  if (issue === 'anchor') return same(document, 'anchor')
  if (issue === 'support') return same(document, 'support')
  if (issue === 'limit') return same(document, 'limit')
  if (issue) return same(document, 'incompatible')
  return {
    document: {
      ...document,
      scene: { ...document.scene, version: document.scene.version + 1, elements: laid },
    },
    error: null,
    addedId,
  }
}

export function placeFoundation(document: ShedDocument, catalogId: string): ConstructionResult {
  if (!isConstructionDocument(document)) return same(document, 'incompatible')
  if (document.scene.elements.length > 0) return same(document, 'foundation')
  const entry = catalogById(catalogId)
  if (!entry?.foundation) return same(document, 'foundation')
  const element = elementFromCatalog(entry, nextId(document, entry.type), { parentId: null, attachmentType: null })
  const position = placeOnGround(element)
  element.x = position.x
  element.y = position.y
  return commit(document, [element], element.id)
}

export function attachPiece(
  document: ShedDocument,
  parentId: string,
  direction: AttachmentType,
  catalogId: string,
): ConstructionResult {
  if (!isConstructionDocument(document)) return same(document, 'incompatible')
  if (document.scene.elements.length >= MAX_ELEMENTS) return same(document, 'limit')
  const parent = document.scene.elements.find((element) => element.id === parentId)
  const entry = catalogById(catalogId)
  if (!parent?.role || !entry) return same(document, 'parent')
  if (!openDirections(document.scene.elements, parentId).includes(direction)) return same(document, 'anchor')
  if (!canAttach(parent.role, direction, entry.role)) return same(document, 'incompatible')
  const element = elementFromCatalog(entry, nextId(document, entry.type), { parentId, attachmentType: direction })
  return commit(document, [...document.scene.elements, element], element.id)
}

function descendantIds(elements: readonly ArchitecturalElement[], id: string): Set<string> {
  const ids = new Set<string>([id])
  let grew = true
  while (grew) {
    grew = false
    for (const element of elements) {
      if (element.parentId && ids.has(element.parentId) && !ids.has(element.id)) {
        ids.add(element.id)
        grew = true
      }
    }
  }
  return ids
}

export function deleteBranch(document: ShedDocument, id: string): ConstructionResult {
  if (!isConstructionDocument(document)) return same(document, 'incompatible')
  if (!document.scene.elements.some((element) => element.id === id)) return same(document)
  const drop = descendantIds(document.scene.elements, id)
  const elements = document.scene.elements.filter((element) => !drop.has(element.id))
  if (elements.length === 0) {
    return {
      document: {
        ...document,
        scene: { ...document.scene, version: document.scene.version + 1, elements: [] },
      },
      error: null,
      addedId: null,
    }
  }
  return commit(document, elements, null)
}

export function hasBranch(document: ShedDocument, id: string): boolean {
  return document.scene.elements.some((element) => element.parentId === id)
}

function supportsChildren(entry: CatalogEntry, elements: readonly ArchitecturalElement[], id: string): boolean {
  const children = elements.filter((element) => element.parentId === id)
  return children.every((child) => {
    if (!child.role || !child.attachmentType) return false
    if (!entry.anchors.includes(child.attachmentType)) return false
    return canAttach(entry.role, child.attachmentType, child.role)
  })
}

export function replaceCatalog(document: ShedDocument, id: string, catalogId: string): ConstructionResult {
  if (!isConstructionDocument(document)) return same(document, 'incompatible')
  const current = document.scene.elements.find((element) => element.id === id)
  const entry = catalogById(catalogId)
  if (!current || !entry) return same(document, 'parent')
  if (current.role !== entry.role) return same(document, 'incompatible')
  if (current.parentId == null && !entry.foundation) return same(document, 'foundation')
  if (!supportsChildren(entry, document.scene.elements, id)) return same(document, 'support')
  const elements = document.scene.elements.map((element) => {
    if (element.id !== id) return element
    const next = elementFromCatalog(entry, element.id, {
      parentId: element.parentId ?? null,
      attachmentType: element.attachmentType ?? null,
    })
    return {
      ...next,
      layer: element.layer,
      primary: element.primary,
      secondary: element.secondary,
      detail: element.detail,
      x: element.x,
      y: element.y,
      params: element.params,
    }
  })
  return commit(document, elements, null)
}

export function patchConstruction(document: ShedDocument, id: string, patch: ConstructionPatch): ConstructionResult {
  if (!isConstructionDocument(document)) return same(document, 'incompatible')
  const current = document.scene.elements.find((element) => element.id === id)
  if (!current) return same(document)
  if (patch.variant != null && current.catalogId) {
    return same(document, 'incompatible')
  }
  const elements = document.scene.elements.map((element) => {
    if (element.id !== id) return element
    return {
      ...element,
      ...(patch.height != null ? { height: patch.height } : {}),
      ...(patch.width != null ? { width: patch.width } : {}),
      ...(patch.roof != null ? { roof: patch.roof } : {}),
      ...(patch.primary ? { primary: patch.primary } : {}),
      ...(patch.secondary ? { secondary: patch.secondary } : {}),
      ...(patch.detail ? { detail: patch.detail } : {}),
      ...(patch.ornament ? { ornament: patch.ornament } : {}),
      ...(patch.params ? { params: { ...element.params, ...patch.params } } : {}),
      ...(patch.layer != null ? { layer: patch.layer } : {}),
    }
  })
  return commit(document, elements, null)
}

export function translateConstruction(document: ShedDocument, id: string, x: number, y: number): ShedDocument {
  const element = document.scene.elements.find((item) => item.id === id)
  if (!element) return document
  const dx = x - element.x
  const dy = y - element.y
  if (dx === 0 && dy === 0) return document
  const elements = document.scene.elements.map((item) => ({ ...item, x: item.x + dx, y: item.y + dy }))
  const inside = elements.every(
    (item) => item.x >= POSITION_MIN && item.x <= POSITION_MAX && item.y >= POSITION_MIN && item.y <= POSITION_MAX,
  )
  if (!inside) return document
  return {
    ...document,
    scene: { ...document.scene, version: document.scene.version + 1, elements },
  }
}

export function duplicatePiece(document: ShedDocument, id: string): ConstructionResult {
  const source = document.scene.elements.find((element) => element.id === id)
  if (!source?.catalogId || !source.parentId || !source.role) return same(document, 'anchor')
  const parent = document.scene.elements.find((element) => element.id === source.parentId)
  if (!parent) return same(document, 'parent')
  const open = openDirections(document.scene.elements, parent.id)
  const direction = (['RIGHT', 'LEFT', 'TOP'] as const).find((item) => open.includes(item) && canAttach(parent.role!, item, source.role!))
  if (!direction) return same(document, 'anchor')
  return attachPiece(document, parent.id, direction, source.catalogId)
}

export function resetPiece(document: ShedDocument, id: string): ConstructionResult {
  const current = document.scene.elements.find((element) => element.id === id)
  const entry = catalogById(current?.catalogId)
  if (!current || !entry) return same(document)
  const fresh = defaultElement(entry.type, current.id)
  const elements = document.scene.elements.map((element) => {
    if (element.id !== id) return element
    return {
      ...elementFromCatalog(entry, current.id, {
        parentId: current.parentId ?? null,
        attachmentType: current.attachmentType ?? null,
      }),
      layer: current.layer,
      x: current.x,
      y: current.y,
      visualSeed: fresh.visualSeed ?? element.visualSeed,
    }
  })
  return commit(document, elements, null)
}
