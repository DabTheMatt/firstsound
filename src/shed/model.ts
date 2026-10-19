import { SHED_BRICK, SHED_COPPER } from './palette'
import { hashString } from './rendering/seed'

/**
 * Local architectural document for the SHED prototype.
 *
 * The model is independent of FIELD's audio tracks and presets.
 * A later stage can add recording, author, dates, and connections
 * beside these fields without reusing the mix model. Those are not stored yet.
 */

export const SHED_SCHEMA_VERSION = 2 as const
export const SHED_SCHEMA_V1 = 1 as const

export type ShedSchemaVersion = typeof SHED_SCHEMA_V1 | typeof SHED_SCHEMA_VERSION

export const SHED_STORAGE_KEY = 'field.shed.document'

export const SCENE_ID = 'shed-01'

export const ORNAMENT_IDS = ['none', 'finial', 'rosette', 'star'] as const

export type OrnamentId = (typeof ORNAMENT_IDS)[number]

export const INK_STYLES = ['steady', 'studied', 'loose'] as const

export type InkStyle = (typeof INK_STYLES)[number]

export const COLOR_TREATMENTS = ['wash', 'reserve', 'layered'] as const

export type ColorTreatment = (typeof COLOR_TREATMENTS)[number]

/** Internal sketch controls. They are not exposed in the editing panel yet. */
export const DEFAULT_ABSTRACTION = 0.4
export const DEFAULT_INK_STYLE: InkStyle = 'studied'
export const DEFAULT_COLOR_TREATMENT: ColorTreatment = 'wash'
/** Tuned so a fresh sheet opens on the taller St. Mary's needle. */
export const DEFAULT_VISUAL_SEED = 17

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
  /** Stable drawing seed. Omitted on documents saved before the sketch engine. */
  visualSeed?: number
  abstraction?: number
  inkStyle?: InkStyle
  colorTreatment?: ColorTreatment
}

export type ShedScene = {
  id: string
  version: number
  elements: ArchitecturalElement[]
}

export type ShedDocument = {
  schema: ShedSchemaVersion
  scene: ShedScene
}

export const DEFAULT_PRIMARY = SHED_BRICK
export const DEFAULT_SECONDARY = SHED_COPPER

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
    visualSeed: id === 'tower-1' ? DEFAULT_VISUAL_SEED : hashString(id) % 100_000,
    abstraction: DEFAULT_ABSTRACTION,
    inkStyle: DEFAULT_INK_STYLE,
    colorTreatment: DEFAULT_COLOR_TREATMENT,
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

export function isInkStyle(value: unknown): value is InkStyle {
  return typeof value === 'string' && (INK_STYLES as readonly string[]).includes(value)
}

export function isColorTreatment(value: unknown): value is ColorTreatment {
  return typeof value === 'string' && (COLOR_TREATMENTS as readonly string[]).includes(value)
}
