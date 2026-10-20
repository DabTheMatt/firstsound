import type { AttachmentType, ConstructionRole, ElementType, OrnamentId } from '../model'

export const CATALOG_GROUPS = ['foundations', 'floors', 'arcades', 'attics', 'roofs', 'towers', 'ornaments'] as const

export type CatalogGroup = (typeof CATALOG_GROUPS)[number]

export type CatalogEntry = {
  id: string
  type: ElementType
  variant: number
  role: ConstructionRole
  group: CatalogGroup
  anchors: readonly AttachmentType[]
  foundation: boolean
  silhouette: boolean
  ornament?: OrnamentId
  width?: number
  height?: number
  roof?: number
}

const SIDE = ['LEFT', 'RIGHT', 'TOP'] as const satisfies readonly AttachmentType[]
const TOP_ONLY = ['TOP'] as const satisfies readonly AttachmentType[]

export const CATALOG: readonly CatalogEntry[] = [
  { id: 'townhouse-base', type: 'facade', variant: 0, role: 'ground', group: 'foundations', anchors: SIDE, foundation: true, silhouette: true, width: 0.42, height: 0.5 },
  { id: 'renaissance-base', type: 'facade', variant: 0, role: 'ground', group: 'foundations', anchors: SIDE, foundation: true, silhouette: true, width: 0.78, height: 0.4 },
  { id: 'gothic-base', type: 'facade', variant: 0, role: 'ground', group: 'foundations', anchors: SIDE, foundation: true, silhouette: true, width: 0.36, height: 0.62 },
  { id: 'gate-base', type: 'gate', variant: 0, role: 'gate', group: 'foundations', anchors: SIDE, foundation: true, silhouette: true, width: 0.48, height: 0.66 },
  { id: 'defensive-gate', type: 'gate', variant: 0, role: 'gate', group: 'foundations', anchors: SIDE, foundation: true, silhouette: true, width: 0.62, height: 0.58 },
  { id: 'townhouse-floor', type: 'facade', variant: 0, role: 'upper', group: 'floors', anchors: SIDE, foundation: false, silhouette: true, width: 0.4, height: 0.36 },
  { id: 'renaissance-floor', type: 'facade', variant: 0, role: 'upper', group: 'floors', anchors: SIDE, foundation: false, silhouette: true, width: 0.74, height: 0.34 },
  { id: 'gothic-windows', type: 'facade', variant: 0, role: 'upper', group: 'floors', anchors: SIDE, foundation: false, silhouette: true, width: 0.38, height: 0.46 },
  { id: 'balcony-floor', type: 'facade', variant: 0, role: 'upper', group: 'floors', anchors: SIDE, foundation: false, silhouette: true, width: 0.46, height: 0.4 },
  { id: 'single-arch', type: 'arcade', variant: 0, role: 'arcade', group: 'arcades', anchors: SIDE, foundation: true, silhouette: true, width: 0.36, height: 0.4 },
  { id: 'three-arch', type: 'arcade', variant: 0, role: 'arcade', group: 'arcades', anchors: SIDE, foundation: true, silhouette: true, width: 0.7, height: 0.36 },
  { id: 'courtyard-arcade', type: 'arcade', variant: 0, role: 'arcade', group: 'arcades', anchors: SIDE, foundation: true, silhouette: true, width: 0.8, height: 0.34 },
  { id: 'pointed-arcade', type: 'arcade', variant: 0, role: 'arcade', group: 'arcades', anchors: SIDE, foundation: true, silhouette: true, width: 0.64, height: 0.46 },
  { id: 'sukiennice-attic', type: 'attic', variant: 0, role: 'attic', group: 'attics', anchors: TOP_ONLY, foundation: false, silhouette: true, width: 0.82, height: 0.28 },
  { id: 'stepped-attic', type: 'attic', variant: 0, role: 'attic', group: 'attics', anchors: TOP_ONLY, foundation: false, silhouette: true, width: 0.56, height: 0.32 },
  { id: 'parapet', type: 'attic', variant: 0, role: 'attic', group: 'attics', anchors: TOP_ONLY, foundation: false, silhouette: true, width: 0.7, height: 0.24 },
  { id: 'gothic-roof', type: 'roof', variant: 0, role: 'roof', group: 'roofs', anchors: TOP_ONLY, foundation: false, silhouette: true, width: 0.5, height: 0.42, roof: 0.9 },
  { id: 'townhouse-roof', type: 'roof', variant: 0, role: 'roof', group: 'roofs', anchors: TOP_ONLY, foundation: false, silhouette: true, width: 0.46, height: 0.36, roof: 0.7 },
  { id: 'renaissance-roof', type: 'roof', variant: 0, role: 'roof', group: 'roofs', anchors: TOP_ONLY, foundation: false, silhouette: true, width: 0.72, height: 0.26, roof: 0.35 },
  { id: 'small-roof', type: 'roof', variant: 0, role: 'roof', group: 'roofs', anchors: TOP_ONLY, foundation: false, silhouette: true, width: 0.28, height: 0.22, roof: 0.55 },
  { id: 'mariacki-tall', type: 'tower', variant: 0, role: 'tower', group: 'towers', anchors: SIDE, foundation: false, silhouette: false, width: 0.4, height: 0.72, roof: 0.7 },
  { id: 'mariacki-low', type: 'tower', variant: 1, role: 'tower', group: 'towers', anchors: SIDE, foundation: false, silhouette: false, width: 0.4, height: 0.62, roof: 0.45 },
  { id: 'wawel-tower', type: 'tower', variant: 2, role: 'tower', group: 'towers', anchors: SIDE, foundation: false, silhouette: false, width: 0.48, height: 0.58, roof: 0.32 },
  { id: 'defensive-tower', type: 'tower', variant: 3, role: 'tower', group: 'towers', anchors: SIDE, foundation: false, silhouette: false, width: 0.44, height: 0.6, roof: 0.2 },
  { id: 'gothic-helmet', type: 'roof', variant: 0, role: 'helmet', group: 'towers', anchors: TOP_ONLY, foundation: false, silhouette: true, width: 0.34, height: 0.48, roof: 0.95 },
  { id: 'krakow-crown', type: 'roof', variant: 0, role: 'helmet', group: 'towers', anchors: TOP_ONLY, foundation: false, silhouette: true, width: 0.4, height: 0.4, roof: 0.8 },
  { id: 'wawel-helmet', type: 'roof', variant: 0, role: 'helmet', group: 'towers', anchors: TOP_ONLY, foundation: false, silhouette: true, width: 0.46, height: 0.28, roof: 0.4 },
  { id: 'finial', type: 'ornament', variant: 0, role: 'ornament', group: 'ornaments', anchors: [], foundation: false, silhouette: false, ornament: 'finial', width: 0.22, height: 0.28 },
  { id: 'star', type: 'ornament', variant: 0, role: 'ornament', group: 'ornaments', anchors: [], foundation: false, silhouette: true, ornament: 'star', width: 0.24, height: 0.28 },
  { id: 'rosette', type: 'ornament', variant: 1, role: 'ornament', group: 'ornaments', anchors: [], foundation: false, silhouette: false, ornament: 'rosette', width: 0.24, height: 0.28 },
  { id: 'crest', type: 'ornament', variant: 0, role: 'ornament', group: 'ornaments', anchors: [], foundation: false, silhouette: true, ornament: 'finial', width: 0.34, height: 0.24 },
  { id: 'relief', type: 'ornament', variant: 0, role: 'ornament', group: 'ornaments', anchors: [], foundation: false, silhouette: true, ornament: 'rosette', width: 0.3, height: 0.26 },
]

export const CATALOG_IDS = CATALOG.map((entry) => entry.id)

export type CatalogId = (typeof CATALOG)[number]['id']

const BY_ID = new Map(CATALOG.map((entry) => [entry.id, entry]))

export function catalogById(id: string | undefined): CatalogEntry | undefined {
  if (!id) return undefined
  return BY_ID.get(id)
}

export function isCatalogId(value: unknown): value is string {
  return typeof value === 'string' && BY_ID.has(value)
}
