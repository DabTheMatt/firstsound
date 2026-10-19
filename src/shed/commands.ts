import { clampPosition } from './persistence'
import {
  clampUnit,
  defaultTower,
  isColorTreatment,
  isInkStyle,
  isOrnamentId,
  type ArchitecturalElement,
  type OrnamentId,
  type ShedDocument,
} from './model'

const NUDGE = 0.02
const FINE_NUDGE = 0.005
const MAX_ELEMENTS = 24

export type ElementPatch = Partial<
  Pick<
    ArchitecturalElement,
    | 'x'
    | 'y'
    | 'layer'
    | 'height'
    | 'width'
    | 'roof'
    | 'primary'
    | 'secondary'
    | 'ornament'
    | 'visualSeed'
    | 'abstraction'
    | 'inkStyle'
    | 'colorTreatment'
  >
>

export function nudgeDelta(key: string, shiftKey: boolean): { x: number; y: number } | null {
  const step = shiftKey ? FINE_NUDGE : NUDGE
  switch (key) {
    case 'ArrowLeft':
      return { x: -step, y: 0 }
    case 'ArrowRight':
      return { x: step, y: 0 }
    case 'ArrowUp':
      return { x: 0, y: -step }
    case 'ArrowDown':
      return { x: 0, y: step }
    default:
      return null
  }
}

function nextVersion(document: ShedDocument): number {
  return document.scene.version + 1
}

function mapElement(
  document: ShedDocument,
  id: string,
  map: (element: ArchitecturalElement) => ArchitecturalElement,
): ShedDocument {
  let changed = false
  const elements = document.scene.elements.map((element) => {
    if (element.id !== id) return element
    changed = true
    return map(element)
  })
  if (!changed) return document
  return {
    ...document,
    scene: { ...document.scene, version: nextVersion(document), elements },
  }
}

function sanitizePatch(patch: ElementPatch): ElementPatch {
  const next: ElementPatch = {}
  if (patch.x != null) next.x = clampPosition(patch.x)
  if (patch.y != null) next.y = clampPosition(patch.y)
  if (patch.height != null) next.height = clampUnit(patch.height)
  if (patch.width != null) next.width = clampUnit(patch.width)
  if (patch.roof != null) next.roof = clampUnit(patch.roof)
  if (patch.layer != null && Number.isInteger(patch.layer)) next.layer = Math.min(99, Math.max(0, patch.layer))
  if (typeof patch.primary === 'string' && /^#[0-9a-fA-F]{6}$/.test(patch.primary)) next.primary = patch.primary.toLowerCase()
  if (typeof patch.secondary === 'string' && /^#[0-9a-fA-F]{6}$/.test(patch.secondary)) next.secondary = patch.secondary.toLowerCase()
  if (isOrnamentId(patch.ornament)) next.ornament = patch.ornament
  if (patch.visualSeed != null && Number.isFinite(patch.visualSeed)) {
    next.visualSeed = Math.min(1_000_000_000, Math.max(0, Math.round(patch.visualSeed)))
  }
  if (patch.abstraction != null) next.abstraction = clampUnit(patch.abstraction)
  if (isInkStyle(patch.inkStyle)) next.inkStyle = patch.inkStyle
  if (isColorTreatment(patch.colorTreatment)) next.colorTreatment = patch.colorTreatment
  return next
}

export function updateElement(document: ShedDocument, id: string, patch: ElementPatch): ShedDocument {
  const clean = sanitizePatch(patch)
  return mapElement(document, id, (element) => ({ ...element, ...clean }))
}

export function moveElement(document: ShedDocument, id: string, x: number, y: number): ShedDocument {
  return updateElement(document, id, { x, y })
}

export function nudgeElement(document: ShedDocument, id: string, key: string, shiftKey: boolean): ShedDocument {
  const delta = nudgeDelta(key, shiftKey)
  if (!delta) return document
  const element = document.scene.elements.find((item) => item.id === id)
  if (!element) return document
  return moveElement(document, id, element.x + delta.x, element.y + delta.y)
}

export function resetElement(document: ShedDocument, id: string): ShedDocument {
  const initial = defaultTower(id)
  return mapElement(document, id, (element) => ({
    ...initial,
    id: element.id,
    layer: element.layer,
  }))
}

export function changeLayer(document: ShedDocument, id: string, delta: number): ShedDocument {
  const element = document.scene.elements.find((item) => item.id === id)
  if (!element) return document
  return updateElement(document, id, { layer: element.layer + delta })
}

export function setOrnament(document: ShedDocument, id: string, ornament: OrnamentId): ShedDocument {
  return updateElement(document, id, { ornament })
}

function nextTowerId(document: ShedDocument): string {
  const used = new Set(document.scene.elements.map((element) => element.id))
  let index = document.scene.elements.length + 1
  let id = `tower-${index}`
  while (used.has(id)) {
    index += 1
    id = `tower-${index}`
  }
  return id
}

export function addTower(document: ShedDocument): ShedDocument {
  if (document.scene.elements.length >= MAX_ELEMENTS) return document
  const index = document.scene.elements.length
  const element = defaultTower(nextTowerId(document))
  element.x = clampPosition(0.32 + (index % 4) * 0.14)
  element.y = clampPosition(0.7 + (index % 3) * 0.06)
  element.layer = index + 1
  return {
    ...document,
    scene: {
      ...document.scene,
      version: nextVersion(document),
      elements: [...document.scene.elements, element],
    },
  }
}

export function elementsInDrawOrder(document: ShedDocument): ArchitecturalElement[] {
  return document.scene.elements
    .map((element, index) => ({ element, index }))
    .sort((a, b) => a.element.layer - b.element.layer || a.index - b.index)
    .map((item) => item.element)
}
