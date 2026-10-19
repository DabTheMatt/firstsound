/**
 * Build the checked-in Kraków Old Town map for SHED CITY.
 *
 * Reads an Overpass JSON dump when OSM_DIR is set, otherwise downloads a fresh
 * extract. Geometry is simplified once and committed; the app does not call
 * Overpass.
 *
 * Source: OpenStreetMap (ODbL 1.0). © OpenStreetMap contributors.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const BBOX = { south: 50.0564, west: 19.9275, north: 50.0672, east: 19.9472 }
const ORIGIN = { lon: 19.931, lat: 50.0668 }
const LAT0 = 50.0617
const M_LAT = 111132
const M_LON = 111132 * Math.cos((LAT0 * Math.PI) / 180)
const OVERPASS = 'https://overpass.openstreetmap.fr/api/interpreter'
const QUERY = `[out:json][timeout:180];
(
  way["highway"~"^(pedestrian|residential|living_street|unclassified|tertiary|secondary|primary)$"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  way["place"="square"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  way["leisure"="park"]["name"="Planty"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  way["historic"~"^(city_gate|monument|church)$"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  way["amenity"="place_of_worship"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  way["building"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
);
out tags geom;`

const LANDMARKS = [
  { key: 'sukiennice', osmId: 23256528, label: 'Sukiennice' },
  { key: 'mariacki', osmId: 26195267, label: 'Bazylika Mariacka' },
  { key: 'brama-florianska', osmId: 39357538, label: 'Brama Floriańska' },
  { key: 'ratusz', osmId: 25122842, label: 'Wieża Ratuszowa' },
  { key: 'wojciech', osmId: 29271113, label: 'Kościół św. Wojciecha' },
]

const LABEL_NAMES = [
  'Floriańska',
  'Grodzka',
  'Szewska',
  'Sławkowska',
  'św. Jana',
  'Świętego Jana',
  'Bracka',
  'Wiślna',
  'Sienna',
  'Stolarska',
  'Mikołajska',
  'Szpitalna',
  'św. Anny',
  'Świętej Anny',
  'Jagiellońska',
  'Gołębia',
  'Szczepańska',
  'Pijarska',
  'Kanonicza',
  'Senacka',
  'Franciszkańska',
  'Dominikańska',
  'Reformacka',
  'Świętego Krzyża',
  'Poselska',
]

/** Seeds only choose which real footprint to keep. They are not plot geometry. */
const PLOT_SEEDS = [
  [19.94015, 50.06355],
  [19.94055, 50.06305],
  [19.93955, 50.06415],
  [19.93815, 50.06355],
  [19.93935, 50.06285],
  [19.94155, 50.06315],
  [19.94085, 50.06155],
  [19.94185, 50.06195],
  [19.93955, 50.06035],
  [19.93795, 50.05985],
  [19.93715, 50.05915],
  [19.93625, 50.06045],
  [19.93515, 50.06085],
  [19.93535, 50.06235],
  [19.93415, 50.06185],
  [19.93395, 50.06115],
  [19.93585, 50.06315],
  [19.93655, 50.05855],
]

function project(lon, lat) {
  return [(lon - ORIGIN.lon) * M_LON, (ORIGIN.lat - lat) * M_LAT]
}

function unproject(x, y) {
  return [ORIGIN.lon + x / M_LON, ORIGIN.lat - y / M_LAT]
}

function dist(a, b) {
  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  return Math.hypot(dx, dy)
}

function ringArea(ring) {
  let area = 0
  for (let i = 0; i < ring.length - 1; i += 1) {
    area += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]
  }
  return Math.abs(area) / 2
}

function centroid(ring) {
  let x = 0
  let y = 0
  let area = 0
  for (let i = 0; i < ring.length - 1; i += 1) {
    const cross = ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]
    area += cross
    x += (ring[i][0] + ring[i + 1][0]) * cross
    y += (ring[i][1] + ring[i + 1][1]) * cross
  }
  if (Math.abs(area) < 1e-6) {
    const sx = ring.reduce((sum, point) => sum + point[0], 0)
    const sy = ring.reduce((sum, point) => sum + point[1], 0)
    return [sx / ring.length, sy / ring.length]
  }
  return [x / (3 * area), y / (3 * area)]
}

function pointInRing(point, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const xi = ring[i][0]
    const yi = ring[i][1]
    const xj = ring[j][0]
    const yj = ring[j][1]
    if (yi > point[1] !== yj > point[1] && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi || 1e-12) + xi) {
      inside = !inside
    }
  }
  return inside
}

function pointSegDist(point, a, b) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len = dx * dx + dy * dy
  if (len === 0) return dist(point, a)
  const t = Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / len))
  return dist(point, [a[0] + t * dx, a[1] + t * dy])
}

function segmentsCross(a, b, c, d) {
  const cross = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
  const ab = cross(a, b, c)
  const cd = cross(a, b, d)
  const ef = cross(c, d, a)
  const gh = cross(c, d, b)
  return ab * cd < 0 && ef * gh < 0
}

function ringsOverlap(a, b) {
  for (const point of a) if (pointInRing(point, b)) return true
  for (const point of b) if (pointInRing(point, a)) return true
  for (let i = 0; i < a.length - 1; i += 1) {
    for (let j = 0; j < b.length - 1; j += 1) {
      if (segmentsCross(a[i], a[i + 1], b[j], b[j + 1])) return true
    }
  }
  return false
}

function minRingDistance(ring, path) {
  let best = Infinity
  for (const point of ring) {
    for (let i = 0; i < path.length - 1; i += 1) {
      best = Math.min(best, pointSegDist(point, path[i], path[i + 1]))
    }
  }
  return best
}

function douglasPeucker(points, epsilon) {
  if (points.length < 3) return points
  let max = 0
  let index = 0
  for (let i = 1; i < points.length - 1; i += 1) {
    const distance = pointSegDist(points[i], points[0], points[points.length - 1])
    if (distance > max) {
      max = distance
      index = i
    }
  }
  if (max <= epsilon) return [points[0], points[points.length - 1]]
  const left = douglasPeucker(points.slice(0, index + 1), epsilon)
  const right = douglasPeucker(points.slice(index), epsilon)
  return left.slice(0, -1).concat(right)
}

function close(points) {
  if (points.length < 3) return points
  const first = points[0]
  const last = points[points.length - 1]
  if (first[0] !== last[0] || first[1] !== last[1]) return [...points, first]
  return points
}

function simplifyRing(points, epsilon) {
  const opened = points[0][0] === points[points.length - 1][0] && points[0][1] === points[points.length - 1][1] ? points.slice(0, -1) : points
  if (opened.length < 4) return close(roundAll(opened))
  const simplified = douglasPeucker([...opened, opened[0]], epsilon)
  return close(roundAll(simplified.slice(0, -1)))
}

function simplifyPath(points, epsilon) {
  if (points.length < 2) return roundAll(points)
  return roundAll(douglasPeucker(points, epsilon))
}

function roundAll(points) {
  return points.map((point) => [Math.round(point[0] * 10) / 10, Math.round(point[1] * 10) / 10])
}

function wayPoints(element) {
  return (element.geometry ?? []).map((point) => project(point.lon, point.lat))
}

function convexHull(points) {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower = []
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) lower.pop()
    lower.push(point)
  }
  const upper = []
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    const point = sorted[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) upper.pop()
    upper.push(point)
  }
  return close(lower.slice(0, -1).concat(upper.slice(0, -1)))
}

function pathLength(path) {
  let length = 0
  for (let i = 0; i < path.length - 1; i += 1) length += dist(path[i], path[i + 1])
  return length
}

async function loadElements() {
  const dir = process.env.OSM_DIR
  if (dir) {
    const streets = JSON.parse(await readFile(resolve(dir, 'streets.json'), 'utf8'))
    const buildings = JSON.parse(await readFile(resolve(dir, 'buildings.json'), 'utf8'))
    const stamp = buildings.osm3s?.timestamp_osm_base ?? streets.osm3s?.timestamp_osm_base
    return { elements: [...streets.elements, ...buildings.elements], stamp }
  }
  const response = await fetch(OVERPASS, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'user-agent': 'FIELD-shed-city/0.42 (local cartographic prototype)',
    },
    body: `data=${encodeURIComponent(QUERY)}`,
  })
  if (!response.ok) throw new Error(`Overpass ${response.status}`)
  const payload = await response.json()
  return { elements: payload.elements, stamp: payload.osm3s?.timestamp_osm_base }
}

function dedupe(elements) {
  const seen = new Set()
  const next = []
  for (const element of elements) {
    const key = `${element.type}:${element.id}`
    if (seen.has(key)) continue
    seen.add(key)
    next.push(element)
  }
  return next
}

const { elements: rawElements, stamp } = await loadElements()
const elements = dedupe(rawElements)
const byId = new Map(elements.map((element) => [element.id, element]))

const plantyWay = byId.get(1221128266)
if (!plantyWay) throw new Error('Planty way 1221128266 is missing')
const planty = simplifyRing(wayPoints(plantyWay), 3.5)
const hull = convexHull(planty)

const squareIds = new Map([
  [201133718, 'Rynek Główny'],
  [122519148, 'Plac Mariacki'],
])
for (const element of elements) {
  const name = element.tags?.name
  if (element.tags?.place === 'square' && name === 'Mały Rynek') squareIds.set(element.id, name)
}

const squares = []
for (const [id, name] of squareIds) {
  const element = byId.get(id)
  if (!element?.geometry) continue
  const ring = simplifyRing(wayPoints(element), 2)
  if (ring.length >= 4) squares.push({ id: `square-${id}`, name, ring })
}

const streets = []
for (const element of elements) {
  const tags = element.tags ?? {}
  if (!tags.highway || !element.geometry || element.geometry.length < 2) continue
  const path = simplifyPath(wayPoints(element), 2.2)
  if (pathLength(path) < 12) continue
  const mid = path[Math.floor(path.length / 2)]
  if (!pointInRing(mid, hull)) continue
  streets.push({
    id: element.id,
    name: tags.name ?? '',
    kind: tags.highway,
    path,
  })
}

const protectedRings = []
const landmarks = []
for (const landmark of LANDMARKS) {
  const element = byId.get(landmark.osmId)
  if (!element?.geometry) throw new Error(`Missing landmark ${landmark.key}`)
  const ring = simplifyRing(wayPoints(element), 1.2)
  protectedRings.push(ring)
  const [lon, lat] = unproject(...centroid(ring))
  landmarks.push({ key: landmark.key, osmId: landmark.osmId, name: landmark.label, lon: round6(lon), lat: round6(lat), ring })
}

const footprints = []
const plotCandidates = []
for (const element of elements) {
  const tags = element.tags ?? {}
  if (!tags.building || !element.geometry || element.geometry.length < 4) continue
  const raw = wayPoints(element)
  const ring = simplifyRing(raw, 1.4)
  if (ring.length < 4) continue
  const center = centroid(ring)
  if (!pointInRing(center, hull) || pointInRing(center, planty)) continue
  const area = ringArea(ring)
  if (area < 30) continue
  const landmark = LANDMARKS.find((item) => item.osmId === element.id)
  footprints.push({
    osmId: element.id,
    name: tags.name ?? '',
    role: landmark ? 'landmark' : 'block',
    ring,
  })
  const worship =
    tags.amenity === 'place_of_worship' ||
    tags.historic === 'city_gate' ||
    ['church', 'chapel', 'university', 'public', 'civic', 'government'].includes(tags.building)
  const namedInstitution = /collegium|ratusz|sukiennic|bazylika|kościół|kosciol|brama/i.test(tags.name ?? '')
  const onSquare = squares.some((square) => pointInRing(center, square.ring) || ringsOverlap(ring, square.ring))
  const onLandmark = protectedRings.some((protectedRing) => ringsOverlap(ring, protectedRing))
  const onStreet = streets.some((street) => minRingDistance(ring, street.path) < 1.2)
  if (worship || namedInstitution || landmark || onSquare || onLandmark || onStreet) continue
  if (area < 80 || area > 480) continue
  plotCandidates.push({ osmId: element.id, ring, center, area })
}

const plots = []
const used = new Set()
for (const [lon, lat] of PLOT_SEEDS) {
  const seed = project(lon, lat)
  let best = null
  let bestDistance = Infinity
  for (const candidate of plotCandidates) {
    if (used.has(candidate.osmId)) continue
    const gap = dist(seed, candidate.center)
    if (gap < bestDistance) {
      best = candidate
      bestDistance = gap
    }
  }
  if (!best || bestDistance > 42) continue
  const separated = plots.every((plot) => dist(plot.center, best.center) >= 38)
  if (!separated) continue
  used.add(best.osmId)
  const [centerLon, centerLat] = unproject(best.center[0], best.center[1])
  const near = nearestStreet(best.center)
  plots.push({
    plotId: `plot-${String(plots.length + 1).padStart(2, '0')}`,
    osmWayId: best.osmId,
    area: Math.round(best.area),
    near,
    lon: round6(centerLon),
    lat: round6(centerLat),
    center: [round1(best.center[0]), round1(best.center[1])],
    ring: best.ring,
  })
}

if (plots.length < 12) throw new Error(`Only ${plots.length} verified plots`)
for (const plot of plots) {
  if (pointInRing(plot.center, planty)) throw new Error(`${plot.plotId} sits in Planty`)
  if (squares.some((square) => pointInRing(plot.center, square.ring))) throw new Error(`${plot.plotId} sits in a square`)
  if (protectedRings.some((ring) => pointInRing(plot.center, ring))) throw new Error(`${plot.plotId} sits on a landmark`)
}

const labels = []
const labeled = new Set()
for (const street of [...streets].sort((a, b) => pathLength(b.path) - pathLength(a.path))) {
  if (!street.name || labeled.has(street.name)) continue
  if (!LABEL_NAMES.some((name) => name.toLowerCase() === street.name.toLowerCase())) continue
  const path = street.path
  let best = 0
  let index = 0
  for (let i = 0; i < path.length - 1; i += 1) {
    const length = dist(path[i], path[i + 1])
    if (length > best) {
      best = length
      index = i
    }
  }
  const a = path[index]
  const b = path[Math.min(index + 1, path.length - 1)]
  const angle = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI
  const readable = angle > 90 || angle < -90 ? angle + 180 : angle
  labels.push({
    name: street.name,
    x: round1((a[0] + b[0]) / 2),
    y: round1((a[1] + b[1]) / 2),
    rotate: Math.round(readable),
  })
  labeled.add(street.name)
}
const rynek = squares.find((square) => square.name === 'Rynek Główny')
if (rynek) {
  const center = centroid(rynek.ring)
  labels.push({ name: 'Rynek Główny', x: round1(center[0]), y: round1(center[1]), rotate: 0 })
}
const north = planty.reduce((best, point) => (point[1] < best[1] ? point : best), planty[0])
labels.push({ name: 'Planty', x: round1(north[0]), y: round1(north[1] + 16), rotate: 0 })

let minX = Infinity
let minY = Infinity
let maxX = -Infinity
let maxY = -Infinity
for (const point of hull) {
  minX = Math.min(minX, point[0])
  minY = Math.min(minY, point[1])
  maxX = Math.max(maxX, point[0])
  maxY = Math.max(maxY, point[1])
}
const bounds = {
  minX: Math.floor(minX - 24),
  minY: Math.floor(minY - 24),
  maxX: Math.ceil(maxX + 24),
  maxY: Math.ceil(maxY + 24),
}

const map = {
  meta: {
    source: 'OpenStreetMap',
    sourceUrl: 'https://www.openstreetmap.org',
    license: 'Open Database License 1.0',
    licenseUrl: 'https://opendatacommons.org/licenses/odbl/1-0/',
    attribution: '© OpenStreetMap contributors',
    retrieved: '2026-10-19',
    osmTimestamp: stamp ?? '2026-10-19T20:29:21Z',
    coverage: 'Kraków Old Town, primarily the area enclosed by Planty',
    bbox: [BBOX.west, BBOX.south, BBOX.east, BBOX.north],
    projection:
      'Local equirectangular meters. Origin lon 19.931 lat 50.0668. X grows east. Y grows south, matching SVG.',
    origin: ORIGIN,
    metersPerDegreeLat: round1(M_LAT),
    metersPerDegreeLon: round1(M_LON),
    overpass: OVERPASS,
    processing: [
      'Downloaded ways inside the Old Town bbox from Overpass (highways, Planty, squares, worship, historic gates, buildings).',
      'Projected WGS84 lon/lat into local meters.',
      'Simplified lines with Douglas–Peucker (streets 2.2 m, Planty 3.5 m, footprints 1.4 m).',
      'Kept features whose midpoint lies inside the convex hull of Planty.',
      'Virtual plots are a hand-checked subset of real building footprints. Seeds only pick which footprint; the ring is the OSM way.',
      'Rejected footprints that meet a street, a public square, or a protected landmark (Sukiennice, St. Mary’s, St. Florian’s Gate, the Town Hall Tower, St. Adalbert’s).',
      'Plot identifiers are prototype ids. They are not cadastral parcel numbers.',
    ],
    plotNotice: 'Virtual SHED plots are game locations. They are not official property boundaries.',
  },
  bounds,
  planty,
  squares,
  streets: streets.map(({ id, name, kind, path }) => ({ id, name, kind, path })),
  landmarks,
  footprints: footprints.map(({ osmId, name, role, ring }) => ({ osmId, name, role, ring })),
  labels,
  plots: plots.map(({ plotId, osmWayId, area, near, lon, lat, center, ring }) => ({
    plotId,
    osmWayId,
    area,
    near,
    lon,
    lat,
    center,
    ring,
  })),
}

const target = resolve('src/shed/city/krakowOldTown.json')
await mkdir(dirname(target), { recursive: true })
await writeFile(target, `${JSON.stringify(map)}\n`)

console.log(`plots ${plots.length} streets ${streets.length} footprints ${footprints.length} labels ${labels.length}`)
for (const plot of plots) {
  console.log(`${plot.plotId} way ${plot.osmWayId} ${plot.area}m2 near ${plot.near || '—'} ${plot.lat.toFixed(5)}, ${plot.lon.toFixed(5)}`)
}
console.log('bytes', JSON.stringify(map).length)

function round1(value) {
  return Math.round(value * 10) / 10
}

function round6(value) {
  return Math.round(value * 1e6) / 1e6
}

function nearestStreet(center) {
  let name = ''
  let best = 80
  for (const street of streets) {
    if (!street.name || street.name === 'Rynek Główny') continue
    const gap = minRingDistance([center], street.path)
    if (gap < best) {
      best = gap
      name = street.name
    }
  }
  return name
}
