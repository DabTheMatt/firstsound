import { clampPosition } from './persistence'
import {
  clampUnit,
  clampVariant,
  defaultElement,
  defaultParams,
  isElementType,
  isOrnamentId,
  PARAM_KEYS,
  type ArchitecturalElement,
  type ElementParams,
  type ElementType,
  type OrnamentId,
  type ParamKey,
  type ShedDocument,
} from './model'

const NUDGE = 0.02
const FINE_NUDGE = 0.005
export const MAX_ELEMENTS = 64

export type ElementPatch = Partial<
  Pick<
    ArchitecturalElement,
    'x' | 'y' | 'layer' | 'height' | 'width' | 'roof' | 'primary' | 'secondary' | 'detail' | 'ornament' | 'variant'
  >
> & {
  params?: Partial<ElementParams>
}

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

const HEX = /^#[0-9a-fA-F]{6}$/

function color(value: string | undefined): string | undefined {
  if (!value || !HEX.test(value)) return undefined
  return value.toLowerCase()
}

function sanitizeParams(current: ElementParams, patch: Partial<ElementParams> | undefined): ElementParams {
  if (!patch) return current
  const next = { ...current }
  for (const key of PARAM_KEYS) {
    const value = patch[key]
    if (typeof value === 'number') next[key] = clampUnit(value)
  }
  return next
}

function sanitizePatch(element: ArchitecturalElement, patch: ElementPatch): ElementPatch {
  const next: ElementPatch = {}
  if (patch.x != null) next.x = clampPosition(patch.x)
  if (patch.y != null) next.y = clampPosition(patch.y)
  if (patch.height != null) next.height = clampUnit(patch.height)
  if (patch.width != null) next.width = clampUnit(patch.width)
  if (patch.roof != null) next.roof = clampUnit(patch.roof)
  if (patch.layer != null && Number.isInteger(patch.layer)) next.layer = Math.min(99, Math.max(0, patch.layer))
  const primary = color(patch.primary)
  const secondary = color(patch.secondary)
  const detail = color(patch.detail)
  if (primary) next.primary = primary
  if (secondary) next.secondary = secondary
  if (detail) next.detail = detail
  if (isOrnamentId(patch.ornament)) next.ornament = patch.ornament
  if (patch.variant != null) next.variant = clampVariant(element.type, patch.variant)
  if (patch.params) next.params = sanitizeParams(element.params ?? defaultParams(), patch.params)
  return next
}

export function updateElement(document: ShedDocument, id: string, patch: ElementPatch): ShedDocument {
  return mapElement(document, id, (element) => {
    const clean = sanitizePatch(element, patch)
    const { params, ...rest } = clean
    const nextParams = params ? sanitizeParams(element.params ?? defaultParams(), params) : element.params
    return {
      ...element,
      ...rest,
      params: nextParams,
    }
  })
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
  return mapElement(document, id, (element) => {
    const initial = defaultElement(element.type, element.id)
    return {
      ...initial,
      id: element.id,
      layer: element.layer,
    }
  })
}

export function setOrnament(document: ShedDocument, id: string, ornament: OrnamentId): ShedDocument {
  return updateElement(document, id, { ornament })
}

export function elementsInDrawOrder(document: ShedDocument): ArchitecturalElement[] {
  return document.scene.elements
    .map((element, index) => ({ element, index }))
    .sort((a, b) => a.element.layer - b.element.layer || a.index - b.index)
    .map((item) => item.element)
}

function withLayerOrder(document: ShedDocument, ordered: ArchitecturalElement[]): ShedDocument {
  const rank = new Map(ordered.map((element, index) => [element.id, index]))
  let changed = false
  const elements = document.scene.elements.map((element) => {
    const layer = rank.get(element.id)
    if (layer == null || layer === element.layer) return element
    changed = true
    return { ...element, layer }
  })
  if (!changed) return document
  return {
    ...document,
    scene: { ...document.scene, version: nextVersion(document), elements },
  }
}

export function bringForward(document: ShedDocument, id: string): ShedDocument {
  const ordered = elementsInDrawOrder(document)
  const index = ordered.findIndex((element) => element.id === id)
  if (index < 0 || index === ordered.length - 1) return document
  const next = ordered.slice()
  const [item] = next.splice(index, 1)
  if (!item) return document
  next.push(item)
  return withLayerOrder(document, next)
}

export function sendBackward(document: ShedDocument, id: string): ShedDocument {
  const ordered = elementsInDrawOrder(document)
  const index = ordered.findIndex((element) => element.id === id)
  if (index <= 0) return document
  const next = ordered.slice()
  const [item] = next.splice(index, 1)
  if (!item) return document
  next.unshift(item)
  return withLayerOrder(document, next)
}

export function changeLayer(document: ShedDocument, id: string, delta: number): ShedDocument {
  if (delta > 0) return bringForward(document, id)
  if (delta < 0) return sendBackward(document, id)
  return document
}

function nextElementId(document: ShedDocument, type: ElementType): string {
  const used = new Set(document.scene.elements.map((element) => element.id))
  let index = 1
  let id = `${type}-${index}`
  while (used.has(id)) {
    index += 1
    id = `${type}-${index}`
  }
  return id
}

export function addElement(document: ShedDocument, type: ElementType = 'tower'): ShedDocument {
  if (!isElementType(type)) return document
  if (document.scene.elements.length >= MAX_ELEMENTS) return document
  const index = document.scene.elements.length
  const element = defaultElement(type, nextElementId(document, type))
  element.x = clampPosition(0.28 + (index % 5) * 0.12)
  element.y = clampPosition(0.74 + (index % 3) * 0.05)
  element.layer = index
  return {
    ...document,
    scene: {
      ...document.scene,
      version: nextVersion(document),
      elements: [...document.scene.elements, element],
    },
  }
}

export function addTower(document: ShedDocument): ShedDocument {
  return addElement(document, 'tower')
}

export function deleteElement(document: ShedDocument, id: string): ShedDocument {
  if (!document.scene.elements.some((element) => element.id === id)) return document
  return {
    ...document,
    scene: {
      ...document.scene,
      version: nextVersion(document),
      elements: document.scene.elements.filter((element) => element.id !== id),
    },
  }
}

export function duplicateElement(document: ShedDocument, id: string): ShedDocument {
  if (document.scene.elements.length >= MAX_ELEMENTS) return document
  const source = document.scene.elements.find((element) => element.id === id)
  if (!source) return document
  const maxLayer = document.scene.elements.reduce((max, element) => Math.max(max, element.layer), 0)
  const copy: ArchitecturalElement = {
    ...source,
    params: { ...source.params },
    id: nextElementId(document, source.type),
    x: clampPosition(source.x + 0.06),
    y: clampPosition(source.y - 0.04),
    layer: Math.min(99, maxLayer + 1),
  }
  return {
    ...document,
    scene: {
      ...document.scene,
      version: nextVersion(document),
      elements: [...document.scene.elements, copy],
    },
  }
}

export function patchParam(document: ShedDocument, id: string, key: ParamKey, value: number): ShedDocument {
  return updateElement(document, id, { params: { [key]: value } })
}

export function setBuildingTransparency(document: ShedDocument, transparent: boolean): ShedDocument {
  if (document.scene.transparentBuildings === transparent) return document
  return {
    ...document,
    scene: {
      ...document.scene,
      version: nextVersion(document),
      transparentBuildings: transparent,
    },
  }
}
