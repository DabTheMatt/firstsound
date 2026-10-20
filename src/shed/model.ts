import { SHED_BLUE, SHED_BRICK, SHED_COPPER, SHED_GOLD, SHED_INK, SHED_LIMESTONE, SHED_PARCHMENT, SHED_WARM_GRAY } from './palette'
import { hashString } from './rendering/seed'

/**
 * Local architectural document for SHED.
 *
 * One element shape covers every category. Category-specific knobs live in
 * `params`. The document is independent of FIELD's audio tracks and presets.
 */

export const SHED_FREE_SCHEMA = 2 as const

export const SHED_SCHEMA_VERSION = 3 as const

export const ATTACHMENT_TYPES = ['LEFT', 'RIGHT', 'TOP'] as const

export type AttachmentType = (typeof ATTACHMENT_TYPES)[number]

export const CONSTRUCTION_ROLES = [
  'ground',
  'upper',
  'arcade',
  'attic',
  'roof',
  'tower',
  'helmet',
  'ornament',
  'gate',
] as const

export type ConstructionRole = (typeof CONSTRUCTION_ROLES)[number]

export const SCENE_COMPOSITIONS = ['free', 'construction'] as const

export type SceneComposition = (typeof SCENE_COMPOSITIONS)[number]

export const SHED_STORAGE_KEY = 'field.shed.document'

export const SCENE_ID = 'shed-01'

export const ORNAMENT_IDS = ['none', 'finial', 'rosette', 'star'] as const

export type OrnamentId = (typeof ORNAMENT_IDS)[number]

export const INK_STYLES = ['steady', 'studied', 'loose'] as const

export type InkStyle = (typeof INK_STYLES)[number]

export const COLOR_TREATMENTS = ['wash', 'reserve', 'layered'] as const

export type ColorTreatment = (typeof COLOR_TREATMENTS)[number]

export const DEFAULT_ABSTRACTION = 0.4

export const DEFAULT_INK_STYLE: InkStyle = 'studied'

export const DEFAULT_COLOR_TREATMENT: ColorTreatment = 'wash'

/** Showcase seed: needle helmet, paired windows, a left turret. */
export const DEFAULT_VISUAL_SEED = 17

export const ELEMENT_TYPES = ['tower', 'facade', 'roof', 'arcade', 'gate', 'attic', 'ornament'] as const

export type ElementType = (typeof ELEMENT_TYPES)[number]

export const VARIANT_COUNT: Record<ElementType, number> = {
  tower: 4,
  facade: 3,
  roof: 3,
  arcade: 3,
  gate: 3,
  attic: 2,
  ornament: 4,
}

export const PARAM_KEYS = [
  'proportion',
  'windows',
  'floors',
  'entrance',
  'gable',
  'arches',
  'archHeight',
  'column',
  'pitch',
  'roofline',
  'ridge',
  'parapet',
  'density',
  'passage',
  'crenellation',
] as const

export type ParamKey = (typeof PARAM_KEYS)[number]

export type ElementParams = Record<ParamKey, number>

export type ArchitecturalElement = {
  id: string
  type: ElementType
  x: number
  y: number
  layer: number
  height: number
  width: number
  /** Helmet or roof amount. Towers and roofs use it; other categories keep a default. */
  roof: number
  primary: string
  secondary: string
  detail: string
  ornament: OrnamentId
  /** Index into the category's architectural variants. */
  variant: number
  params: ElementParams
  /** Optional sketch-engine fields. Missing values stay missing so stored scenes are not rewritten. */
  visualSeed?: number
  abstraction?: number
  inkStyle?: InkStyle
  colorTreatment?: ColorTreatment
  /** Construction catalog id. Absent on free-composition elements. */
  catalogId?: string
  role?: ConstructionRole
  parentId?: string | null
  attachmentType?: AttachmentType | null
  /** Stable name of the anchor on the parent. Independent of the drawn pixels. */
  attachmentAnchor?: string | null
}

export type ShedScene = {
  id: string
  version: number
  elements: ArchitecturalElement[]
  /**
   * When false, building washes cover what is behind them.
   * Missing means clear, and is left unwritten so older scenes stay as stored.
   */
  transparentBuildings?: boolean
  /**
   * Missing means a free composition (schema 1 and 2).
   * Construction scenes say so explicitly.
   */
  composition?: SceneComposition
}

export type ShedDocument = {
  schema: typeof SHED_FREE_SCHEMA | typeof SHED_SCHEMA_VERSION
  scene: ShedScene
}

export const DEFAULT_PRIMARY = SHED_BRICK
export const DEFAULT_SECONDARY = SHED_COPPER
export const DEFAULT_DETAIL = SHED_INK

export const ARCHITECTURE_SWATCHES = [
  { id: 'brick', value: SHED_BRICK },
  { id: 'ink', value: SHED_INK },
  { id: 'parchment', value: SHED_PARCHMENT },
  { id: 'blue', value: SHED_BLUE },
  { id: 'copper', value: SHED_COPPER },
  { id: 'gold', value: SHED_GOLD },
  { id: 'limestone', value: SHED_LIMESTONE },
  { id: 'gray', value: SHED_WARM_GRAY },
] as const

export type SwatchId = (typeof ARCHITECTURE_SWATCHES)[number]['id']

type ElementLook = {
  primary: string
  secondary: string
  detail: string
  width: number
  height: number
  roof: number
  variant: number
  ornament: OrnamentId
}

const LOOK: Record<ElementType, ElementLook> = {
  tower: {
    primary: DEFAULT_PRIMARY,
    secondary: DEFAULT_SECONDARY,
    detail: DEFAULT_DETAIL,
    width: 0.46,
    height: 0.62,
    roof: 0.5,
    variant: 0,
    ornament: 'finial',
  },
  facade: {
    primary: DEFAULT_PRIMARY,
    secondary: SHED_LIMESTONE,
    detail: DEFAULT_DETAIL,
    width: 0.4,
    height: 0.56,
    roof: 0.3,
    variant: 1,
    ornament: 'none',
  },
  roof: {
    primary: SHED_COPPER,
    secondary: SHED_WARM_GRAY,
    detail: DEFAULT_DETAIL,
    width: 0.64,
    height: 0.34,
    roof: 0.72,
    variant: 0,
    ornament: 'finial',
  },
  arcade: {
    primary: SHED_LIMESTONE,
    secondary: DEFAULT_PRIMARY,
    detail: DEFAULT_DETAIL,
    width: 0.72,
    height: 0.38,
    roof: 0.2,
    variant: 0,
    ornament: 'none',
  },
  gate: {
    primary: DEFAULT_PRIMARY,
    secondary: SHED_LIMESTONE,
    detail: DEFAULT_DETAIL,
    width: 0.5,
    height: 0.64,
    roof: 0.26,
    variant: 0,
    ornament: 'none',
  },
  attic: {
    primary: SHED_LIMESTONE,
    secondary: DEFAULT_SECONDARY,
    detail: DEFAULT_DETAIL,
    width: 0.8,
    height: 0.3,
    roof: 0.2,
    variant: 0,
    ornament: 'rosette',
  },
  ornament: {
    primary: DEFAULT_SECONDARY,
    secondary: DEFAULT_PRIMARY,
    detail: DEFAULT_DETAIL,
    width: 0.26,
    height: 0.3,
    roof: 0.2,
    variant: 0,
    ornament: 'finial',
  },
}

export function defaultParams(): ElementParams {
  return {
    proportion: 0.55,
    windows: 0.5,
    floors: 0.55,
    entrance: 0.35,
    gable: 0.45,
    arches: 0.55,
    archHeight: 0.62,
    column: 0.38,
    pitch: 0.66,
    roofline: 0.35,
    ridge: 0.4,
    parapet: 0.55,
    density: 0.55,
    passage: 0.62,
    crenellation: 0.7,
  }
}

export function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

export function clampVariant(type: ElementType, value: number): number {
  const count = VARIANT_COUNT[type]
  if (!Number.isFinite(value)) return 0
  const index = Math.round(value)
  return Math.min(count - 1, Math.max(0, index))
}

export function isOrnamentId(value: unknown): value is OrnamentId {
  return typeof value === 'string' && (ORNAMENT_IDS as readonly string[]).includes(value)
}

export function isElementType(value: unknown): value is ElementType {
  return typeof value === 'string' && (ELEMENT_TYPES as readonly string[]).includes(value)
}

export function isAttachmentType(value: unknown): value is AttachmentType {
  return typeof value === 'string' && (ATTACHMENT_TYPES as readonly string[]).includes(value)
}

export function isConstructionRole(value: unknown): value is ConstructionRole {
  return typeof value === 'string' && (CONSTRUCTION_ROLES as readonly string[]).includes(value)
}

export function isSceneComposition(value: unknown): value is SceneComposition {
  return typeof value === 'string' && (SCENE_COMPOSITIONS as readonly string[]).includes(value)
}

export function isConstructionDocument(document: ShedDocument): boolean {
  return document.schema === SHED_SCHEMA_VERSION && document.scene.composition === 'construction'
}

export function isInkStyle(value: unknown): value is InkStyle {
  return typeof value === 'string' && (INK_STYLES as readonly string[]).includes(value)
}

export function isColorTreatment(value: unknown): value is ColorTreatment {
  return typeof value === 'string' && (COLOR_TREATMENTS as readonly string[]).includes(value)
}

export function defaultElement(type: ElementType = 'tower', id = `${type}-1`): ArchitecturalElement {
  const look = LOOK[type]
  return {
    id,
    type,
    x: type === 'tower' && id === 'tower-1' ? 0.5 : 0.5,
    y: type === 'tower' && id === 'tower-1' ? 0.8 : 0.78,
    layer: 1,
    height: look.height,
    width: look.width,
    roof: look.roof,
    primary: look.primary,
    secondary: look.secondary,
    detail: look.detail,
    ornament: look.ornament,
    variant: look.variant,
    params: defaultParams(),
    ...sketchDefaults(type, id),
  }
}

function sketchDefaults(
  type: ElementType,
  id: string,
): Pick<ArchitecturalElement, 'visualSeed' | 'abstraction' | 'inkStyle' | 'colorTreatment'> | Record<string, never> {
  if (type !== 'tower') return {}
  return {
    visualSeed: id === 'tower-1' ? DEFAULT_VISUAL_SEED : hashString(id) % 100_000,
    abstraction: DEFAULT_ABSTRACTION,
    inkStyle: DEFAULT_INK_STYLE,
    colorTreatment: DEFAULT_COLOR_TREATMENT,
  }
}

export function defaultTower(id = 'tower-1'): ArchitecturalElement {
  return defaultElement('tower', id)
}

/** Schema 2 sheet: free placement, including the original St. Mary's tower study. */
export function freeShedDocument(): ShedDocument {
  return {
    schema: SHED_FREE_SCHEMA,
    scene: {
      id: SCENE_ID,
      version: 1,
      elements: [defaultTower()],
    },
  }
}

/** A new architecture sheet. Construction starts empty, on the ground line. */
export function defaultShedDocument(): ShedDocument {
  return {
    schema: SHED_SCHEMA_VERSION,
    scene: {
      id: SCENE_ID,
      version: 1,
      composition: 'construction',
      elements: [],
    },
  }
}
