import { catalogById, isCatalogId } from './construction/catalog'
import { issueIn } from './construction/graph'
import { POSITION_MAX, POSITION_MIN } from './construction/layout'
import {
  DEFAULT_DETAIL,
  DEFAULT_PRIMARY,
  DEFAULT_SECONDARY,
  PARAM_KEYS,
  SHED_FREE_SCHEMA,
  SHED_SCHEMA_VERSION,
  SHED_STORAGE_KEY,
  VARIANT_COUNT,
  clampUnit,
  clampVariant,
  defaultParams,
  defaultShedDocument,
  isAttachmentType,
  isColorTreatment,
  isConstructionDocument,
  isConstructionRole,
  isElementType,
  isInkStyle,
  isOrnamentId,
  type ArchitecturalElement,
  type AttachmentType,
  type ElementParams,
  type ElementType,
  type ShedDocument,
} from './model'

export type ShedLoadStatus = 'saved' | 'restored'

export type ShedLoad = {
  document: ShedDocument
  status: ShedLoadStatus
}

export const SHED_LEGACY_KEY = 'field.shed.legacy'
export const SHED_CONSTRUCTION_KEY = 'field.shed.construction'

const HEX = /^#[0-9a-f]{6}$/

/** Strict Mode reads storage twice. Remember a repair until the page reloads. */
let restoredOnThisPage = false

export function resetShedLoadNotice(): void {
  restoredOnThisPage = false
}

function hexColor(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const next = value.trim().toLowerCase()
  return HEX.test(next) ? next : null
}

function unit(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  if (value < 0 || value > 1) return null
  return value
}

function layerOf(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value)) return null
  if (value < 0 || value > 99) return null
  return value
}

function repairedUnit(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return clampUnit(value)
}

function repairedLayer(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  const next = Math.round(value)
  return Math.min(99, Math.max(0, next))
}

function repairedColor(value: unknown, fallback: string): string {
  return hexColor(value) ?? fallback
}

function repairedParams(value: unknown): ElementParams {
  const base = defaultParams()
  if (!value || typeof value !== 'object') return base
  const raw = value as Record<string, unknown>
  for (const key of PARAM_KEYS) {
    if (typeof raw[key] === 'number') base[key] = clampUnit(raw[key] as number)
  }
  return base
}

function strictParams(value: unknown): ElementParams | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  const next = defaultParams()
  for (const key of PARAM_KEYS) {
    const parsed = unit(raw[key])
    if (parsed == null) return null
    next[key] = parsed
  }
  return next
}

type ReadMode = 'strict' | 'recover'

function constructionPosition(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  if (value < POSITION_MIN || value > POSITION_MAX) return null
  return value
}

function repairedConstructionPosition(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(POSITION_MAX, Math.max(POSITION_MIN, value))
}

function connectionOf(
  raw: Record<string, unknown>,
  mode: ReadMode,
): Pick<ArchitecturalElement, 'catalogId' | 'role' | 'parentId' | 'attachmentType' | 'attachmentAnchor'> | null {
  if (!isCatalogId(raw.catalogId) || !isConstructionRole(raw.role)) return null
  const entry = catalogById(raw.catalogId)
  if (!entry || entry.role !== raw.role) return null
  const parentId = raw.parentId === null ? null : typeof raw.parentId === 'string' && raw.parentId.length > 0 ? raw.parentId : undefined
  if (parentId === undefined) return null
  if (parentId === null) {
    if (raw.attachmentType != null || raw.attachmentAnchor != null) return null
    return { catalogId: raw.catalogId, role: raw.role, parentId: null, attachmentType: null, attachmentAnchor: null }
  }
  if (!isAttachmentType(raw.attachmentType) || raw.attachmentAnchor !== raw.attachmentType) {
    if (mode === 'recover') return null
    return null
  }
  const attachmentType: AttachmentType = raw.attachmentType
  return {
    catalogId: raw.catalogId,
    role: raw.role,
    parentId,
    attachmentType,
    attachmentAnchor: attachmentType,
  }
}

function readElement(value: unknown, seen: Set<string>, mode: ReadMode, construction = false): ArchitecturalElement | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  if (typeof raw.id !== 'string' || raw.id.length < 1 || raw.id.length > 80) return null
  if (seen.has(raw.id)) return null
  if (!isElementType(raw.type)) return null
  const type: ElementType = raw.type

  if (mode === 'strict') {
    const x = construction ? constructionPosition(raw.x) : unit(raw.x)
    const y = construction ? constructionPosition(raw.y) : unit(raw.y)
    const height = unit(raw.height)
    const width = unit(raw.width)
    const roof = unit(raw.roof)
    const layer = layerOf(raw.layer)
    const primary = hexColor(raw.primary)
    const secondary = hexColor(raw.secondary)
    const detail = hexColor(raw.detail)
    const variant = typeof raw.variant === 'number' && Number.isInteger(raw.variant) ? raw.variant : null
    const params = strictParams(raw.params)
    if (x == null || y == null || height == null || width == null || roof == null || layer == null) return null
    if (!primary || !secondary || !detail || !isOrnamentId(raw.ornament) || variant == null || !params) return null
    if (variant < 0 || variant >= VARIANT_COUNT[type]) return null
    const link = construction ? connectionOf(raw, mode) : null
    if (construction && !link) return null
    seen.add(raw.id)
    return {
      id: raw.id,
      type,
      x,
      y,
      layer,
      height,
      width,
      roof,
      primary,
      secondary,
      detail,
      ornament: raw.ornament,
      variant,
      params,
      ...sketchFields(raw),
      ...(link ?? {}),
    }
  }

  const link = construction ? connectionOf(raw, mode) : null
  if (construction && !link) return null
  const fallback = defaultParams()
  seen.add(raw.id)
  return {
    id: raw.id,
    type,
    x: construction ? repairedConstructionPosition(raw.x, 0.5) : clampPosition(repairedUnit(raw.x, 0.5)),
    y: construction ? repairedConstructionPosition(raw.y, 0.8) : clampPosition(repairedUnit(raw.y, 0.78)),
    layer: repairedLayer(raw.layer, 1),
    height: repairedUnit(raw.height, 0.5),
    width: repairedUnit(raw.width, 0.45),
    roof: repairedUnit(raw.roof, 0.4),
    primary: repairedColor(raw.primary, DEFAULT_PRIMARY),
    secondary: repairedColor(raw.secondary, DEFAULT_SECONDARY),
    detail: repairedColor(raw.detail, DEFAULT_DETAIL),
    ornament: isOrnamentId(raw.ornament) ? raw.ornament : 'finial',
    variant: clampVariant(type, typeof raw.variant === 'number' ? raw.variant : 0),
    params: repairedParams(raw.params ?? fallback),
    ...sketchFields(raw),
    ...(link ?? {}),
  }
}

/** Keep a valid sketch seed. Drop anything else so a bad optional field cannot reject the scene. */
function sketchFields(
  raw: Record<string, unknown>,
): Partial<Pick<ArchitecturalElement, 'visualSeed' | 'abstraction' | 'inkStyle' | 'colorTreatment'>> {
  const fields: Partial<Pick<ArchitecturalElement, 'visualSeed' | 'abstraction' | 'inkStyle' | 'colorTreatment'>> = {}
  if (typeof raw.visualSeed === 'number' && Number.isFinite(raw.visualSeed)) {
    const seed = Math.round(raw.visualSeed)
    if (seed >= 0 && seed <= 1_000_000_000) fields.visualSeed = seed
  }
  if (typeof raw.abstraction === 'number' && Number.isFinite(raw.abstraction) && raw.abstraction >= 0 && raw.abstraction <= 1) {
    fields.abstraction = raw.abstraction
  }
  if (isInkStyle(raw.inkStyle)) fields.inkStyle = raw.inkStyle
  if (isColorTreatment(raw.colorTreatment)) fields.colorTreatment = raw.colorTreatment
  return fields
}

/**
 * SHED 01 stored a tower without detail, variant, or params.
 * Those documents stay readable and come back as schema 2.
 */
function migrateV1Element(value: unknown, seen: Set<string>, mode: ReadMode): ArchitecturalElement | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  if (raw.type !== 'tower') return null
  return readElement(
    {
      ...raw,
      detail: raw.detail ?? DEFAULT_DETAIL,
      variant: typeof raw.variant === 'number' ? raw.variant : 0,
      params: raw.params ?? defaultParams(),
    },
    seen,
    mode,
  )
}

function sceneId(value: unknown): string | null {
  if (typeof value !== 'string' || value.length < 1 || value.length > 80) return null
  return value
}

function withoutLinks(element: ArchitecturalElement): ArchitecturalElement {
  const next = { ...element }
  delete next.catalogId
  delete next.role
  delete next.parentId
  delete next.attachmentType
  delete next.attachmentAnchor
  return next
}

function readDocument(value: unknown, mode: ReadMode): ShedDocument | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  const schema = raw.schema
  if (schema !== 1 && schema !== SHED_FREE_SCHEMA && schema !== SHED_SCHEMA_VERSION) return null
  if (!raw.scene || typeof raw.scene !== 'object') return null
  const scene = raw.scene as Record<string, unknown>
  const id = sceneId(scene.id)
  if (!id) return null
  if (typeof scene.version !== 'number' || !Number.isFinite(scene.version) || scene.version < 0) return null
  if (!Array.isArray(scene.elements)) return null
  if (schema === 1 && scene.elements.length < 1) return null
  const construction = schema === SHED_SCHEMA_VERSION
  if (construction && scene.composition !== 'construction') return null

  const seen = new Set<string>()
  const elements: ArchitecturalElement[] = []
  for (const item of scene.elements) {
    const element = schema === 1 ? migrateV1Element(item, seen, mode) : readElement(item, seen, mode, construction)
    if (!element) {
      if (mode === 'strict') return null
      continue
    }
    elements.push(element)
  }
  if (mode === 'strict' && schema === 1 && elements.length < 1) return null
  if (mode === 'strict' && elements.length !== scene.elements.length) return null
  const transparentBuildings = scene.transparentBuildings
  const transparency = transparentBuildings === true || transparentBuildings === false ? { transparentBuildings } : {}
  if (construction) {
    if (issueIn(elements)) {
      if (mode === 'strict') return null
      return {
        schema: SHED_FREE_SCHEMA,
        scene: { id, version: scene.version, elements: elements.map(withoutLinks), ...transparency },
      }
    }
    return {
      schema: SHED_SCHEMA_VERSION,
      scene: { id, version: scene.version, composition: 'construction', elements, ...transparency },
    }
  }
  return {
    schema: SHED_FREE_SCHEMA,
    scene: {
      id,
      version: scene.version,
      elements,
      ...transparency,
    },
  }
}

export function parseShedDocument(value: unknown): ShedDocument | null {
  return readDocument(value, 'strict')
}

export function recoverShedDocument(value: unknown): ShedDocument | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  if (raw.schema !== 1 && raw.schema !== SHED_FREE_SCHEMA && raw.schema !== SHED_SCHEMA_VERSION) return null
  return readDocument(value, 'recover')
}

export function serializeShedDocument(document: ShedDocument): string {
  return JSON.stringify(document)
}

function storage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null
    return localStorage
  } catch {
    return null
  }
}

function storedSchema(store: Storage): number | null {
  try {
    const raw = store.getItem(SHED_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { schema?: unknown }
    return typeof parsed.schema === 'number' ? parsed.schema : null
  } catch {
    return null
  }
}

export function persistShedDocument(document: ShedDocument): boolean {
  const store = storage()
  if (!store) return false
  try {
    const schema = storedSchema(store)
    if (schema != null && schema > SHED_SCHEMA_VERSION) return false
    store.setItem(SHED_STORAGE_KEY, serializeShedDocument(document))
    return true
  } catch {
    return false
  }
}

/** Reads the namespaced SHED document. Invalid JSON restores the default scene. */
export function loadShedDocument(): ShedLoad {
  const fallback = defaultShedDocument()
  const store = storage()
  if (!store) return { document: fallback, status: 'saved' }
  let raw: string | null = null
  try {
    raw = store.getItem(SHED_STORAGE_KEY)
  } catch {
    return { document: fallback, status: 'restored' }
  }
  if (!raw) return { document: fallback, status: restoredOnThisPage ? 'restored' : 'saved' }
  try {
    const parsed = JSON.parse(raw) as { schema?: unknown }
    if (typeof parsed.schema === 'number' && parsed.schema > SHED_SCHEMA_VERSION) {
      restoredOnThisPage = true
      return { document: fallback, status: 'restored' }
    }
    const recovered = recoverShedDocument(parsed)
    if (!recovered) {
      restoredOnThisPage = true
      persistShedDocument(fallback)
      return { document: fallback, status: 'restored' }
    }
    const migrated = serializeShedDocument(recovered) !== JSON.stringify(parsed)
    if (migrated) persistShedDocument(recovered)
    return { document: recovered, status: restoredOnThisPage ? 'restored' : 'saved' }
  } catch {
    restoredOnThisPage = true
    persistShedDocument(fallback)
    return { document: fallback, status: 'restored' }
  }
}

export function clampPosition(value: number): number {
  return Math.min(0.96, Math.max(0.04, clampUnit(value)))
}

export function hasLegacySheet(): boolean {
  const store = storage()
  if (!store) return false
  try {
    return store.getItem(SHED_LEGACY_KEY) != null
  } catch {
    return false
  }
}

/** Archives the free sheet and opens the connected build. The free sheet can be restored. */
export function beginConnectedBuild(current: ShedDocument): ShedDocument {
  const store = storage()
  if (!isConstructionDocument(current) && store) {
    try {
      store.setItem(SHED_LEGACY_KEY, serializeShedDocument(current))
      const saved = store.getItem(SHED_CONSTRUCTION_KEY)
      if (saved) {
        const recovered = recoverShedDocument(JSON.parse(saved) as unknown)
        if (recovered && isConstructionDocument(recovered)) return recovered
      }
    } catch {
      return defaultShedDocument()
    }
  }
  return defaultShedDocument()
}

/** Puts the free sheet back and keeps the connected build beside it. */
export function restoreFreeSheet(current: ShedDocument): ShedDocument | null {
  const store = storage()
  if (!store) return null
  try {
    if (isConstructionDocument(current)) store.setItem(SHED_CONSTRUCTION_KEY, serializeShedDocument(current))
    const saved = store.getItem(SHED_LEGACY_KEY)
    if (!saved) return null
    const recovered = recoverShedDocument(JSON.parse(saved) as unknown)
    if (!recovered || isConstructionDocument(recovered)) return null
    return recovered
  } catch {
    return null
  }
}
