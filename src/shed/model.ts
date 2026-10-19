/**
 * Local architectural document for the SHED prototype.
 *
 * The model is independent of FIELD's audio tracks and presets.
 * A later stage can add recording, author, dates, and connections
 * beside these fields without reusing the mix model. Those are not stored yet.
 */

export const SHED_SCHEMA_VERSION = 1 as const

export const SHED_STORAGE_KEY = 'field.shed.document'

export const SCENE_ID = 'shed-01'

export const ORNAMENT_IDS = ['none', 'finial', 'rosette', 'star'] as const

export type OrnamentId = (typeof ORNAMENT_IDS)[number]

export type ElementType = 'tower'

export type ArchitecturalElement = {
  id: string
  type: ElementType
  x: number
  y: number
  layer: number
  height: number
  width: number
  roof: number
  primary: string
  secondary: string
  ornament: OrnamentId
}

export type ShedScene = {
  id: string
  version: number
  elements: ArchitecturalElement[]
}

export type ShedDocument = {
  schema: typeof SHED_SCHEMA_VERSION
  scene: ShedScene
}

export const DEFAULT_PRIMARY = '#9c2f3c'
export const DEFAULT_SECONDARY = '#e0b15a'

export function defaultTower(id = 'tower-1'): ArchitecturalElement {
  return {
    id,
    type: 'tower',
    x: 0.5,
    y: 0.8,
    layer: 1,
    height: 0.62,
    width: 0.46,
    roof: 0.5,
    primary: DEFAULT_PRIMARY,
    secondary: DEFAULT_SECONDARY,
    ornament: 'finial',
  }
}

export function defaultShedDocument(): ShedDocument {
  return {
    schema: SHED_SCHEMA_VERSION,
    scene: {
      id: SCENE_ID,
      version: 1,
      elements: [defaultTower()],
    },
  }
}

export function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

export function isOrnamentId(value: unknown): value is OrnamentId {
  return typeof value === 'string' && (ORNAMENT_IDS as readonly string[]).includes(value)
}
