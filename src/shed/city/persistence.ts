import { SHED_BRICK, SHED_INK, SHED_LIMESTONE } from '../palette'
import { clampUnit, clampVariant, isOrnamentId, VARIANT_COUNT } from '../model'
import { plotById } from './map'
import {
  CITY_SCHEMA_VERSION,
  CITY_STORAGE_KEY,
  DEFAULT_AUTHOR_ID,
  authorById,
  defaultCityDocument,
  isCityBuildingType,
  type CityBuilding,
  type CityDocument,
} from './model'

export type CityLoadStatus = 'saved' | 'restored'

export type CityLoad = {
  document: CityDocument
  status: CityLoadStatus
}

const HEX = /^#[0-9a-f]{6}$/
const TOKEN = /^[A-Za-z0-9_-]{1,80}$/

let restoredOnThisPage = false

export function resetCityLoadNotice(): void {
  restoredOnThisPage = false
}

function storage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null
    return localStorage
  } catch {
    return null
  }
}

function hexColor(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const next = value.trim().toLowerCase()
  return HEX.test(next) ? next : null
}

function token(value: unknown): string | null {
  if (typeof value !== 'string' || !TOKEN.test(value)) return null
  return value
}

function recordingId(value: unknown): string | null | undefined {
  if (value == null || value === '') return null
  return token(value)
}

type ReadMode = 'strict' | 'recover'

function readBuilding(value: unknown, mode: ReadMode): CityBuilding | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  const id = token(raw.id)
  const plotId = typeof raw.plotId === 'string' ? raw.plotId : null
  const authorId = token(raw.authorId)
  const recording = recordingId(raw.recordingId)
  if (!id || !plotId || !plotById(plotId) || !authorId || recording === undefined) return null
  if (!isCityBuildingType(raw.type) || !isOrnamentId(raw.ornament)) return null
  const primary = hexColor(raw.primary)
  const secondary = hexColor(raw.secondary)
  const detail = hexColor(raw.detail)
  if (mode === 'strict') {
    if (!primary || !secondary || !detail) return null
    if (typeof raw.variant !== 'number' || !Number.isInteger(raw.variant)) return null
    if (raw.variant < 0 || raw.variant >= VARIANT_COUNT[raw.type]) return null
    if (typeof raw.height !== 'number' || typeof raw.width !== 'number' || typeof raw.roof !== 'number') return null
    if (raw.height < 0 || raw.height > 1 || raw.width < 0 || raw.width > 1 || raw.roof < 0 || raw.roof > 1) return null
    return {
      id,
      plotId,
      authorId,
      recordingId: recording,
      type: raw.type,
      variant: raw.variant,
      height: raw.height,
      width: raw.width,
      roof: raw.roof,
      primary,
      secondary,
      detail,
      ornament: raw.ornament,
    }
  }
  return {
    id,
    plotId,
    authorId,
    recordingId: recording,
    type: raw.type,
    variant: clampVariant(raw.type, typeof raw.variant === 'number' ? raw.variant : 0),
    height: clampUnit(typeof raw.height === 'number' ? raw.height : 0.5),
    width: clampUnit(typeof raw.width === 'number' ? raw.width : 0.45),
    roof: clampUnit(typeof raw.roof === 'number' ? raw.roof : 0.4),
    primary: primary ?? SHED_BRICK,
    secondary: secondary ?? SHED_LIMESTONE,
    detail: detail ?? SHED_INK,
    ornament: raw.ornament,
  }
}

function uniqueBuildings(buildings: CityBuilding[]): CityBuilding[] {
  const plots = new Set<string>()
  const ids = new Set<string>()
  const recordings = new Set<string>()
  const next: CityBuilding[] = []
  for (const building of buildings) {
    if (plots.has(building.plotId) || ids.has(building.id)) continue
    if (building.recordingId && recordings.has(building.recordingId)) continue
    plots.add(building.plotId)
    ids.add(building.id)
    if (building.recordingId) recordings.add(building.recordingId)
    next.push(building)
  }
  return next
}

function readDocument(value: unknown, mode: ReadMode): CityDocument | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  if (raw.schema !== CITY_SCHEMA_VERSION) return null
  if (!raw.scene || typeof raw.scene !== 'object') return null
  const scene = raw.scene as Record<string, unknown>
  if (typeof scene.id !== 'string' || scene.id.length < 1 || scene.id.length > 80) return null
  if (typeof scene.version !== 'number' || !Number.isFinite(scene.version) || scene.version < 0) return null
  if (!Array.isArray(scene.buildings)) return null
  const buildings: CityBuilding[] = []
  for (const item of scene.buildings) {
    const building = readBuilding(item, mode)
    if (!building) {
      if (mode === 'strict') return null
      continue
    }
    buildings.push(building)
  }
  const unique = uniqueBuildings(buildings)
  if (mode === 'strict' && unique.length !== scene.buildings.length) return null
  const active = token(scene.activeAuthorId)
  const activeAuthorId = active && authorById(active) ? active : mode === 'strict' ? null : DEFAULT_AUTHOR_ID
  if (!activeAuthorId) return null
  return {
    schema: CITY_SCHEMA_VERSION,
    scene: {
      id: scene.id,
      version: scene.version,
      activeAuthorId,
      buildings: unique,
    },
  }
}

export function parseCityDocument(value: unknown): CityDocument | null {
  return readDocument(value, 'strict')
}

export function recoverCityDocument(value: unknown): CityDocument | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  if (raw.schema !== CITY_SCHEMA_VERSION) return null
  return readDocument(value, 'recover')
}

export function serializeCityDocument(document: CityDocument): string {
  return JSON.stringify(document)
}

function storedSchema(store: Storage): number | null {
  try {
    const raw = store.getItem(CITY_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { schema?: unknown }
    return typeof parsed.schema === 'number' ? parsed.schema : null
  } catch {
    return null
  }
}

export function persistCityDocument(document: CityDocument): boolean {
  const store = storage()
  if (!store) return false
  try {
    const schema = storedSchema(store)
    if (schema != null && schema > CITY_SCHEMA_VERSION) return false
    store.setItem(CITY_STORAGE_KEY, serializeCityDocument(document))
    return true
  } catch {
    return false
  }
}

export function loadCityDocument(): CityLoad {
  const fallback = defaultCityDocument()
  const store = storage()
  if (!store) return { document: fallback, status: 'saved' }
  let raw: string | null = null
  try {
    raw = store.getItem(CITY_STORAGE_KEY)
  } catch {
    return { document: fallback, status: 'restored' }
  }
  if (!raw) return { document: fallback, status: restoredOnThisPage ? 'restored' : 'saved' }
  try {
    const parsed = JSON.parse(raw) as { schema?: unknown }
    if (typeof parsed.schema === 'number' && parsed.schema > CITY_SCHEMA_VERSION) {
      restoredOnThisPage = true
      return { document: fallback, status: 'restored' }
    }
    const recovered = recoverCityDocument(parsed)
    if (!recovered) {
      restoredOnThisPage = true
      persistCityDocument(fallback)
      return { document: fallback, status: 'restored' }
    }
    const migrated = serializeCityDocument(recovered) !== JSON.stringify(parsed)
    if (migrated) persistCityDocument(recovered)
    return { document: recovered, status: restoredOnThisPage ? 'restored' : 'saved' }
  } catch {
    restoredOnThisPage = true
    persistCityDocument(fallback)
    return { document: fallback, status: 'restored' }
  }
}
