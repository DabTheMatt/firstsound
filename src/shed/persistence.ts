import {
  SHED_SCHEMA_VERSION,
  SHED_STORAGE_KEY,
  clampUnit,
  defaultShedDocument,
  isOrnamentId,
  type ArchitecturalElement,
  type ShedDocument,
} from './model'

export type ShedLoadStatus = 'saved' | 'restored'

export type ShedLoad = {
  document: ShedDocument
  status: ShedLoadStatus
}

const MAX_ELEMENTS = 32
const HEX = /^#[0-9a-f]{6}$/

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

function readElement(value: unknown, seen: Set<string>): ArchitecturalElement | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  if (typeof raw.id !== 'string' || raw.id.length < 1 || raw.id.length > 80) return null
  if (seen.has(raw.id)) return null
  if (raw.type !== 'tower') return null
  const x = unit(raw.x)
  const y = unit(raw.y)
  const height = unit(raw.height)
  const width = unit(raw.width)
  const roof = unit(raw.roof)
  const layer = layerOf(raw.layer)
  const primary = hexColor(raw.primary)
  const secondary = hexColor(raw.secondary)
  if (x == null || y == null || height == null || width == null || roof == null || layer == null) return null
  if (!primary || !secondary || !isOrnamentId(raw.ornament)) return null
  seen.add(raw.id)
  return {
    id: raw.id,
    type: 'tower',
    x,
    y,
    layer,
    height,
    width,
    roof,
    primary,
    secondary,
    ornament: raw.ornament,
  }
}

export function parseShedDocument(value: unknown): ShedDocument | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  if (raw.schema !== SHED_SCHEMA_VERSION) return null
  if (!raw.scene || typeof raw.scene !== 'object') return null
  const scene = raw.scene as Record<string, unknown>
  if (typeof scene.id !== 'string' || scene.id.length < 1 || scene.id.length > 80) return null
  if (typeof scene.version !== 'number' || !Number.isFinite(scene.version) || scene.version < 0) return null
  if (!Array.isArray(scene.elements) || scene.elements.length < 1 || scene.elements.length > MAX_ELEMENTS) return null
  const seen = new Set<string>()
  const elements: ArchitecturalElement[] = []
  for (const item of scene.elements) {
    const element = readElement(item, seen)
    if (!element) return null
    elements.push(element)
  }
  return {
    schema: SHED_SCHEMA_VERSION,
    scene: {
      id: scene.id,
      version: scene.version,
      elements,
    },
  }
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

export function persistShedDocument(document: ShedDocument): boolean {
  const store = storage()
  if (!store) return false
  try {
    store.setItem(SHED_STORAGE_KEY, serializeShedDocument(document))
    return true
  } catch {
    return false
  }
}

/** Reads the namespaced SHED document. Invalid JSON or shape restores the default scene. */
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
  if (!raw) return { document: fallback, status: 'saved' }
  try {
    const parsed = parseShedDocument(JSON.parse(raw) as unknown)
    if (!parsed) {
      persistShedDocument(fallback)
      return { document: fallback, status: 'restored' }
    }
    return { document: parsed, status: 'saved' }
  } catch {
    persistShedDocument(fallback)
    return { document: fallback, status: 'restored' }
  }
}

export function clampPosition(value: number): number {
  return Math.min(0.96, Math.max(0.04, clampUnit(value)))
}
