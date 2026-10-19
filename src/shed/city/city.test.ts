import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SHED_STORAGE_KEY } from '../model'
import { defaultCamera } from '../view'
import { cityViewTransform, nextCityZoom } from './camera'
import { CityScene } from './CityScene'
import { authorRanking, cityStats, placeBuilding, removeBuilding, selectAuthor } from './commands'
import { buildingScale, buildingTransform, neighborPlot, pointInRing, projectLonLat } from './geo'
import { krakowOldTown, plotById, projectStoredPlot } from './map'
import { CITY_STORAGE_KEY, DEFAULT_AUTHOR_ID, SAMPLE_AUTHORS, defaultCityDocument } from './model'
import { loadCityDocument, parseCityDocument, persistCityDocument, recoverCityDocument, resetCityLoadNotice } from './persistence'
import { parseSceneMode } from './sceneMode'
import shedViewSource from '../ShedView.tsx?raw'
import styles from './CityView.module.css'

function memoryStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
    removeItem: (key: string) => {
      values.delete(key)
    },
    clear: () => values.clear(),
  }
}

describe('Kraków city map', () => {
  it('keeps real OpenStreetMap landmarks and streets', () => {
    expect(krakowOldTown.meta.source).toBe('OpenStreetMap')
    expect(krakowOldTown.meta.license).toContain('Open Database License')
    expect(krakowOldTown.meta.attribution).toContain('OpenStreetMap')
    expect(krakowOldTown.meta.retrieved).toBe('2026-10-19')
    expect(krakowOldTown.meta.plotNotice).toContain('not official')
    const byKey = Object.fromEntries(krakowOldTown.landmarks.map((landmark) => [landmark.key, landmark]))
    expect(byKey['brama-florianska']?.lat).toBeCloseTo(50.0648, 3)
    expect(byKey['brama-florianska']?.lon).toBeCloseTo(19.9413, 3)
    expect(byKey.mariacki?.lat).toBeCloseTo(50.0617, 3)
    expect(byKey.sukiennice?.lon).toBeCloseTo(19.9373, 3)
    expect(krakowOldTown.streets.some((street) => street.name === 'Floriańska')).toBe(true)
    expect(krakowOldTown.streets.some((street) => street.name === 'Grodzka')).toBe(true)
    expect(krakowOldTown.squares.some((square) => square.name === 'Rynek Główny')).toBe(true)
    expect(krakowOldTown.planty.length).toBeGreaterThan(20)
    expect(krakowOldTown.plots.length).toBeGreaterThanOrEqual(12)
    expect(krakowOldTown.plots.length).toBeLessThan(40)
  })

  it('projects stored plot centers back onto the same scene point', () => {
    for (const plot of krakowOldTown.plots) {
      const projected = projectStoredPlot(plot)
      expect(projected[0]).toBeCloseTo(plot.center[0], 0)
      expect(projected[1]).toBeCloseTo(plot.center[1], 0)
      expect(projectLonLat(plot.lon, plot.lat)[0]).toBeCloseTo(plot.center[0], 0)
      for (const square of krakowOldTown.squares) {
        expect(pointInRing(plot.center, square.ring)).toBe(false)
      }
      expect(pointInRing(plot.center, krakowOldTown.planty)).toBe(false)
    }
    const ids = new Set(krakowOldTown.plots.map((plot) => plot.plotId))
    expect(ids.size).toBe(krakowOldTown.plots.length)
  })
})

describe('CITY document', () => {
  it('places one building on a free plot and refuses a second', () => {
    const first = placeBuilding(defaultCityDocument(), 'plot-02', 'facade')
    expect(first.scene.buildings).toHaveLength(1)
    expect(first.scene.buildings[0]?.plotId).toBe('plot-02')
    expect(first.scene.buildings[0]?.recordingId).toBeNull()
    expect(first.scene.buildings[0]?.authorId).toBe(DEFAULT_AUTHOR_ID)
    const again = placeBuilding(first, 'plot-02', 'tower')
    expect(again).toBe(first)
    const elsewhere = placeBuilding(selectAuthor(first, 'kasia-l'), 'plot-10', 'tower')
    expect(elsewhere.scene.buildings).toHaveLength(2)
    expect(elsewhere.scene.buildings[1]?.authorId).toBe('kasia-l')
    expect(elsewhere.scene.buildings[0]?.type).not.toBe(elsewhere.scene.buildings[1]?.type)
    const freed = removeBuilding(elsewhere, 'plot-02')
    expect(freed.scene.buildings.map((building) => building.plotId)).toEqual(['plot-10'])
    expect(placeBuilding(freed, 'plot-02', 'gate').scene.buildings).toHaveLength(2)
    expect(placeBuilding(first, 'not-a-plot', 'facade')).toBe(first)
  })

  it('counts buildings, students, and free plots without scoring points', () => {
    const anna = placeBuilding(defaultCityDocument(), 'plot-01', 'facade')
    const both = placeBuilding(selectAuthor(anna, 'tomek-w'), 'plot-14', 'attic')
    const stats = cityStats(both, krakowOldTown.plots.length)
    expect(stats).toEqual({ buildings: 2, students: 2, availablePlots: krakowOldTown.plots.length - 2 })
    const ranking = authorRanking(both, SAMPLE_AUTHORS)
    expect(ranking[0]?.count).toBe(1)
    expect(ranking.find((row) => row.id === 'anna-k')?.count).toBe(1)
    expect(ranking.find((row) => row.id === 'zuzanna-p')?.count).toBe(0)
    expect(selectAuthor(both, 'not-a-person')).toBe(both)
  })

  it('keeps a building anchored to its plot at every zoom', () => {
    const plot = plotById('plot-02')
    expect(plot).not.toBeNull()
    const scale = buildingScale({ width: 280, height: 420 }, plot!.ring)
    const placed = buildingTransform(plot!.center, 140, 400, scale)
    expect(placed.startsWith(`translate(${plot!.center[0].toFixed(1)} ${plot!.center[1].toFixed(1)})`)).toBe(true)
    expect(placed).not.toContain('zoom')
    const near = cityViewTransform({ zoom: 1, panX: 0, panY: 0 })
    const far = cityViewTransform({ zoom: nextCityZoom(1, 'in'), panX: 12, panY: -8 })
    expect(near).not.toBe(far)
    expect(far).toContain('scale(')
    expect(placed).not.toContain('scale(3)')
  })

  it('moves keyboard focus to a neighboring plot', () => {
    const next = neighborPlot(krakowOldTown.plots, 'plot-02', 'ArrowUp')
    expect(next).not.toBeNull()
    expect(next?.plotId).not.toBe('plot-02')
    expect(neighborPlot(krakowOldTown.plots, 'plot-02', 'Enter')).toBeNull()
  })
})

describe('CITY persistence', () => {
  beforeEach(() => {
    resetCityLoadNotice()
  })

  it('stores the city apart from the architecture document', () => {
    const store = memoryStorage()
    store.setItem(SHED_STORAGE_KEY, '{"schema":2,"scene":{"id":"shed-01","version":4,"elements":[]}}')
    vi.stubGlobal('localStorage', store)
    const placed = placeBuilding(defaultCityDocument(), 'plot-07', 'gate')
    expect(persistCityDocument(placed)).toBe(true)
    expect(loadCityDocument().document.scene.buildings[0]?.plotId).toBe('plot-07')
    expect(store.getItem(SHED_STORAGE_KEY)).toContain('"shed-01"')
    expect(store.getItem(CITY_STORAGE_KEY)).not.toContain('shed-01')
    vi.unstubAllGlobals()
  })

  it('drops a second occupancy and a repeated recording inside one document', () => {
    const placed = placeBuilding(defaultCityDocument(), 'plot-03', 'facade')
    const building = { ...placed.scene.buildings[0]!, recordingId: 'rec-1' }
    const duplicated = {
      schema: 1,
      scene: {
        ...placed.scene,
        buildings: [building, { ...building, id: 'city-plot-04', plotId: 'plot-04', recordingId: 'rec-1' }, { ...building }],
      },
    }
    expect(parseCityDocument(duplicated)).toBeNull()
    const recovered = recoverCityDocument(duplicated)
    expect(recovered?.scene.buildings).toHaveLength(1)
    expect(recovered?.scene.buildings[0]?.plotId).toBe('plot-03')
  })

  it('leaves a newer city schema untouched', () => {
    const store = memoryStorage()
    store.setItem(CITY_STORAGE_KEY, JSON.stringify({ schema: 9, scene: { id: 'future' } }))
    store.setItem(SHED_STORAGE_KEY, 'keep-architecture')
    vi.stubGlobal('localStorage', store)
    resetCityLoadNotice()
    const loaded = loadCityDocument()
    expect(loaded.status).toBe('restored')
    expect(loaded.document.scene.buildings).toHaveLength(0)
    expect(store.getItem(CITY_STORAGE_KEY)).toContain('"schema":9')
    expect(persistCityDocument(defaultCityDocument())).toBe(false)
    expect(store.getItem(SHED_STORAGE_KEY)).toBe('keep-architecture')
    vi.unstubAllGlobals()
  })
})

describe('CITY scene switch', () => {
  it('parses the two modes and leaves architecture as the default', () => {
    expect(parseSceneMode('city')).toBe('city')
    expect(parseSceneMode('architecture')).toBe('architecture')
    expect(parseSceneMode('map')).toBe('architecture')
    expect(shedViewSource).toContain("sceneMode === 'city'")
    expect(shedViewSource).not.toContain('useEngine')
    expect(shedViewSource).not.toContain("from '../audio")
    expect(styles.sheet).toBeTruthy()
    expect(styles.scene).toBeTruthy()
  })

  it('draws the loaded map and an occupied plot', () => {
    const document = placeBuilding(selectAuthor(defaultCityDocument(), 'michal-s'), 'plot-02', 'facade')
    const plot = plotById('plot-02')!
    const props = {
      document,
      selectedPlotId: 'plot-02',
      camera: defaultCamera(),
      sceneLabel: 'Kraków sound city',
      labelFor: () => 'Available virtual plot near Floriańska',
      onSelect: () => undefined,
      onDeselect: () => undefined,
      onDelete: () => undefined,
      onPan: () => undefined,
      onZoom: () => undefined,
    }
    const fitted = renderToStaticMarkup(createElement(CityScene, props))
    const zoomed = renderToStaticMarkup(createElement(CityScene, { ...props, camera: { zoom: 3, panX: 20, panY: -10 } }))
    const anchor = `translate(${plot.center[0].toFixed(1)} ${plot.center[1].toFixed(1)})`
    expect(fitted).toContain('data-map-source="OpenStreetMap"')
    expect(fitted).toContain('data-city-landmark="brama-florianska"')
    expect(fitted).toContain('data-city-landmark="sukiennice"')
    expect(fitted).toContain('data-city-street="Floriańska"')
    expect(fitted).toContain('data-city-street="Grodzka"')
    expect(fitted).toContain('data-city-square="Rynek Główny"')
    expect(fitted).toContain('data-city-planty=""')
    expect(fitted).toContain('data-plot-status="occupied"')
    expect(fitted).toContain('data-city-building="city-plot-02"')
    expect(fitted).toContain('data-author-highlight="true"')
    expect(fitted).toContain('#a65a4d')
    expect(fitted).toContain(anchor)
    expect(zoomed).toContain(anchor)
    expect(zoomed).not.toBe(fitted)
  })
})
