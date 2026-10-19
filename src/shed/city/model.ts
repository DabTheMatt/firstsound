import type { ElementType, OrnamentId } from '../model'

/**
 * Local CITY document. Separate from the architecture sheet.
 * A sample author id is a prototype label, not an authenticated account.
 * recordingId is reserved for a later one-recording-one-building rule.
 * This document cannot enforce that rule across devices.
 */

export const CITY_SCHEMA_VERSION = 1 as const

export const CITY_STORAGE_KEY = 'field.shed.city'

export const CITY_SCENE_ID = 'shed-city-01'

export const SCENE_MODE_KEY = 'field.shed.sceneMode'

export const SCENE_MODES = ['architecture', 'city'] as const

export type ShedSceneMode = (typeof SCENE_MODES)[number]

export const CITY_BUILDING_TYPES = ['facade', 'tower', 'gate', 'attic'] as const

export type CityBuildingType = (typeof CITY_BUILDING_TYPES)[number]

export type SampleAuthor = {
  id: string
  name: string
  /** Marker ink only. Facades stay on the architectural palette. */
  marker: string
}

export const SAMPLE_AUTHORS: readonly SampleAuthor[] = [
  { id: 'anna-k', name: 'Anna K.', marker: '#8c4a42' },
  { id: 'michal-s', name: 'Michał S.', marker: '#3d5c72' },
  { id: 'kasia-l', name: 'Kasia L.', marker: '#6a6240' },
  { id: 'tomek-w', name: 'Tomek W.', marker: '#4f6858' },
  { id: 'zuzanna-p', name: 'Zuzanna P.', marker: '#7a5a48' },
]

export const DEFAULT_AUTHOR_ID = SAMPLE_AUTHORS[0]!.id

export type CityBuilding = {
  id: string
  plotId: string
  authorId: string
  recordingId: string | null
  type: CityBuildingType
  variant: number
  height: number
  width: number
  roof: number
  primary: string
  secondary: string
  detail: string
  ornament: OrnamentId
}

export type CityScene = {
  id: string
  version: number
  activeAuthorId: string
  buildings: CityBuilding[]
}

export type CityDocument = {
  schema: typeof CITY_SCHEMA_VERSION
  scene: CityScene
}

export function isCityBuildingType(value: unknown): value is CityBuildingType {
  return typeof value === 'string' && (CITY_BUILDING_TYPES as readonly string[]).includes(value)
}

export function isElementBuildingType(type: ElementType): type is CityBuildingType {
  return isCityBuildingType(type)
}

export function authorById(id: string): SampleAuthor | null {
  return SAMPLE_AUTHORS.find((author) => author.id === id) ?? null
}

export function authorName(id: string): string {
  return authorById(id)?.name ?? id
}

export function defaultCityDocument(): CityDocument {
  return {
    schema: CITY_SCHEMA_VERSION,
    scene: {
      id: CITY_SCENE_ID,
      version: 1,
      activeAuthorId: DEFAULT_AUTHOR_ID,
      buildings: [],
    },
  }
}
