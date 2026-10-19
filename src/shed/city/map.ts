import raw from './krakowOldTown.json'
import { projectLonLat, type MapPoint } from './geo'

export type CityMapMeta = {
  source: string
  sourceUrl: string
  license: string
  licenseUrl: string
  attribution: string
  retrieved: string
  osmTimestamp: string
  coverage: string
  bbox: number[]
  projection: string
  origin: { lon: number; lat: number }
  plotNotice: string
}

export type CityStreet = {
  id: number
  name: string
  kind: string
  path: MapPoint[]
}

export type CityRing = {
  id?: string
  name: string
  ring: MapPoint[]
}

export type CityLandmark = {
  key: string
  osmId: number
  name: string
  lon: number
  lat: number
  ring: MapPoint[]
}

export type CityFootprint = {
  osmId: number
  name: string
  role: string
  ring: MapPoint[]
}

export type CityLabel = {
  name: string
  x: number
  y: number
  rotate: number
}

export type CityPlot = {
  plotId: string
  osmWayId: number
  area: number
  near: string
  lon: number
  lat: number
  center: MapPoint
  ring: MapPoint[]
}

export type KrakowMap = {
  meta: CityMapMeta
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
  planty: MapPoint[]
  squares: CityRing[]
  streets: CityStreet[]
  landmarks: CityLandmark[]
  footprints: CityFootprint[]
  labels: CityLabel[]
  plots: CityPlot[]
}

export const krakowOldTown = raw as unknown as KrakowMap

export const CITY_BOUNDS = krakowOldTown.bounds
export const CITY_WIDTH = CITY_BOUNDS.maxX - CITY_BOUNDS.minX
export const CITY_HEIGHT = CITY_BOUNDS.maxY - CITY_BOUNDS.minY

const plotsById = new Map(krakowOldTown.plots.map((plot) => [plot.plotId, plot]))

export function plotById(plotId: string): CityPlot | null {
  return plotsById.get(plotId) ?? null
}

export function projectStoredPlot(plot: CityPlot): MapPoint {
  return projectLonLat(plot.lon, plot.lat)
}
