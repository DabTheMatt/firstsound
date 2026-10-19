import { clampUnit, clampVariant, defaultElement, VARIANT_COUNT, type ArchitecturalElement, type OrnamentId } from '../model'
import { plotById } from './map'
import {
  authorById,
  defaultCityDocument,
  isCityBuildingType,
  type CityBuilding,
  type CityBuildingType,
  type CityDocument,
} from './model'

const ROOFS = [0.34, 0.48, 0.62, 0.76, 0.55] as const
const ORNAMENTS: readonly OrnamentId[] = ['none', 'finial', 'rosette', 'star']

function nextVersion(document: CityDocument): number {
  return document.scene.version + 1
}

export function buildingOnPlot(document: CityDocument, plotId: string): CityBuilding | null {
  return document.scene.buildings.find((building) => building.plotId === plotId) ?? null
}

export function occupiedPlotIds(document: CityDocument): Set<string> {
  return new Set(document.scene.buildings.map((building) => building.plotId))
}

export type CityStats = {
  buildings: number
  students: number
  availablePlots: number
}

export function cityStats(document: CityDocument, plotCount: number): CityStats {
  return {
    buildings: document.scene.buildings.length,
    students: new Set(document.scene.buildings.map((building) => building.authorId)).size,
    availablePlots: Math.max(0, plotCount - document.scene.buildings.length),
  }
}

export type AuthorRank = {
  id: string
  name: string
  marker: string
  count: number
}

export function authorRanking(
  document: CityDocument,
  authors: readonly { id: string; name: string; marker: string }[],
): AuthorRank[] {
  const counts = new Map<string, number>()
  for (const author of authors) counts.set(author.id, 0)
  for (const building of document.scene.buildings) {
    counts.set(building.authorId, (counts.get(building.authorId) ?? 0) + 1)
  }
  const rows: AuthorRank[] = []
  for (const [id, count] of counts) {
    const known = authors.find((author) => author.id === id)
    rows.push({ id, name: known?.name ?? id, marker: known?.marker ?? '#817e76', count })
  }
  return rows.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

export function selectAuthor(document: CityDocument, authorId: string): CityDocument {
  if (!authorById(authorId) || document.scene.activeAuthorId === authorId) return document
  return {
    ...document,
    scene: { ...document.scene, version: nextVersion(document), activeAuthorId: authorId },
  }
}

/**
 * Puts one library building on an available virtual plot.
 * A second building on the same plot is refused. Position is the plot, not a drag coordinate.
 */
export function placeBuilding(document: CityDocument, plotId: string, type: CityBuildingType): CityDocument {
  if (!isCityBuildingType(type) || !plotById(plotId) || buildingOnPlot(document, plotId)) return document
  const authorId = authorById(document.scene.activeAuthorId)?.id ?? defaultCityDocument().scene.activeAuthorId
  const index = document.scene.buildings.length + plotId.length
  const base = defaultElement(type, `city-${plotId}`)
  const building: CityBuilding = {
    id: `city-${plotId}`,
    plotId,
    authorId,
    recordingId: null,
    type,
    variant: index % VARIANT_COUNT[type],
    height: clampUnit(base.height + ((index % 3) - 1) * 0.06),
    width: clampUnit(base.width + ((index % 4) - 1.5) * 0.04),
    roof: ROOFS[index % ROOFS.length]!,
    primary: base.primary,
    secondary: base.secondary,
    detail: base.detail,
    ornament: ORNAMENTS[index % ORNAMENTS.length]!,
  }
  return {
    ...document,
    scene: {
      ...document.scene,
      version: nextVersion(document),
      buildings: [...document.scene.buildings, building],
    },
  }
}

export function removeBuilding(document: CityDocument, plotId: string): CityDocument {
  if (!buildingOnPlot(document, plotId)) return document
  return {
    ...document,
    scene: {
      ...document.scene,
      version: nextVersion(document),
      buildings: document.scene.buildings.filter((building) => building.plotId !== plotId),
    },
  }
}

export function elementForBuilding(building: CityBuilding): ArchitecturalElement {
  const base = defaultElement(building.type, building.id)
  return {
    ...base,
    id: building.id,
    type: building.type,
    variant: clampVariant(building.type, building.variant),
    height: building.height,
    width: building.width,
    roof: building.roof,
    primary: building.primary,
    secondary: building.secondary,
    detail: building.detail,
    ornament: building.ornament,
  }
}
