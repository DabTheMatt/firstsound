/**
 * Local architectural document for SHED.
 *
 * One element shape covers every category. Category-specific knobs live in
 * `params`. The document is independent of FIELD's audio tracks and presets.
 */

export const SHED_SCHEMA_VERSION = 2 as const

export const SHED_STORAGE_KEY = 'field.shed.document'

export const SCENE_ID = 'shed-01'

export const ORNAMENT_IDS = ['none', 'finial', 'rosette', 'star'] as const

export type OrnamentId = (typeof ORNAMENT_IDS)[number]

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
export const DEFAULT_DETAIL = '#1c140f'

export const ARCHITECTURE_SWATCHES = [
  { id: 'brick', value: '#9c2f3c' },
  { id: 'ink', value: '#1c140f' },
  { id: 'parchment', value: '#f3e6c8' },
  { id: 'blue', value: '#5d7384' },
  { id: 'copper', value: '#6e8b74' },
  { id: 'gold', value: '#e0b15a' },
  { id: 'limestone', value: '#d7d0c3' },
  { id: 'gray', value: '#8a8178' },
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
    secondary: '#d7d0c3',
    detail: DEFAULT_DETAIL,
    width: 0.4,
    height: 0.56,
    roof: 0.3,
    variant: 1,
    ornament: 'none',
  },
  roof: {
    primary: '#6e8b74',
    secondary: '#8a8178',
    detail: DEFAULT_DETAIL,
    width: 0.64,
    height: 0.34,
    roof: 0.72,
    variant: 0,
    ornament: 'finial',
  },
  arcade: {
    primary: '#d7d0c3',
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
    secondary: '#d7d0c3',
    detail: DEFAULT_DETAIL,
    width: 0.5,
    height: 0.64,
    roof: 0.26,
    variant: 0,
    ornament: 'none',
  },
  attic: {
    primary: '#d7d0c3',
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
  }
}

export function defaultTower(id = 'tower-1'): ArchitecturalElement {
  return defaultElement('tower', id)
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
