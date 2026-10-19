/** Local equirectangular meters for the Kraków sheet. Y grows south, like SVG. */
export const CITY_ORIGIN = { lon: 19.931, lat: 50.0668 } as const

const LAT0 = 50.0617
export const METERS_PER_DEGREE_LAT = 111132
export const METERS_PER_DEGREE_LON = 111132 * Math.cos((LAT0 * Math.PI) / 180)

export type MapPoint = [number, number]

export function projectLonLat(lon: number, lat: number): MapPoint {
  return [(lon - CITY_ORIGIN.lon) * METERS_PER_DEGREE_LON, (CITY_ORIGIN.lat - lat) * METERS_PER_DEGREE_LAT]
}

export function pointInRing(point: MapPoint, ring: readonly MapPoint[]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const xi = ring[i]![0]
    const yi = ring[i]![1]
    const xj = ring[j]![0]
    const yj = ring[j]![1]
    if (yi > point[1] !== yj > point[1] && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi || 1e-12) + xi) {
      inside = !inside
    }
  }
  return inside
}

export function ringPath(ring: readonly MapPoint[], close = true): string {
  const body = ring.map((point, index) => `${index === 0 ? 'M' : 'L'}${point[0].toFixed(1)} ${point[1].toFixed(1)}`).join(' ')
  return close ? `${body} Z` : body
}

export function ringSpan(ring: readonly MapPoint[]): { width: number; height: number } {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [x, y] of ring) {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  return { width: Math.max(0, maxX - minX), height: Math.max(0, maxY - minY) }
}

/**
 * Map-space scale for one drawing. Zoom is not an input: the camera scales the
 * whole sheet, so the building stays on its plot.
 */
export function buildingScale(graphic: { width: number; height: number }, ring: readonly MapPoint[]): number {
  const span = ringSpan(ring)
  const footprint = Math.max(span.width, span.height, 8)
  const target = Math.min(34, Math.max(16, footprint * 1.08))
  const widthScale = target / Math.max(graphic.width, 1)
  const heightCap = Math.min(52, Math.max(22, footprint * 1.85))
  const height = graphic.height * widthScale
  if (height > heightCap) return heightCap / Math.max(graphic.height, 1)
  return widthScale
}

export function buildingTransform(center: MapPoint, anchorX: number, anchorY: number, scale: number): string {
  return `translate(${center[0].toFixed(1)} ${center[1].toFixed(1)}) scale(${scale.toFixed(4)}) translate(${(-anchorX).toFixed(1)} ${(-anchorY).toFixed(1)})`
}

const STEP: Record<string, MapPoint> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
}

/** Next virtual plot in a compass direction. Scene Y grows south. */
export function neighborPlot<T extends { plotId: string; center: MapPoint }>(
  plots: readonly T[],
  plotId: string,
  key: string,
): T | null {
  const step = STEP[key]
  const current = plots.find((plot) => plot.plotId === plotId)
  if (!step || !current) return null
  let best: T | null = null
  let bestScore = Infinity
  for (const plot of plots) {
    if (plot.plotId === plotId) continue
    const vx = plot.center[0] - current.center[0]
    const vy = plot.center[1] - current.center[1]
    const along = vx * step[0] + vy * step[1]
    if (along <= 6) continue
    const lateral = Math.abs(vx * step[1] - vy * step[0])
    const score = along + lateral * 0.7
    if (score < bestScore) {
      best = plot
      bestScore = score
    }
  }
  return best
}
