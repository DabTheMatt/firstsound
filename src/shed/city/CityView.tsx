import { useCallback, useId, useState } from 'react'
import { useI18n } from '../../i18n'
import { defaultCamera, type SceneCamera } from '../view'
import { clampCityCamera, nextCityZoom, panCity } from './camera'
import { CityScene } from './CityScene'
import { authorRanking, buildingOnPlot, cityStats } from './commands'
import { krakowOldTown, plotById, type CityPlot } from './map'
import { authorName, CITY_BUILDING_TYPES, SAMPLE_AUTHORS, type CityBuildingType } from './model'
import { useCityDocument } from './useCityDocument'
import styles from './CityView.module.css'

export function CityView() {
  const { t } = useI18n()
  const copy = t.shed.city
  const city = useCityDocument()
  const [selectedPlotId, setSelectedPlotId] = useState<string | null>(null)
  const [camera, setCamera] = useState<SceneCamera>(() => defaultCamera())
  const [buildingType, setBuildingType] = useState<CityBuildingType>('facade')
  const [authorsOpen, setAuthorsOpen] = useState(() => {
    if (typeof matchMedia !== 'function') return true
    return !matchMedia('(max-width: 800px)').matches
  })
  const authorListId = useId()
  const stats = cityStats(city.document, krakowOldTown.plots.length)
  const ranking = authorRanking(city.document, SAMPLE_AUTHORS)
  const selectedPlot = selectedPlotId ? plotById(selectedPlotId) : null
  const selectedBuilding = selectedPlot ? buildingOnPlot(city.document, selectedPlot.plotId) : null
  const statusText = city.status === 'restored' ? copy.restored : copy.saved

  const zoomBy = useCallback((direction: 'in' | 'out' | 'reset') => {
    setCamera((current) => {
      if (direction === 'reset') return defaultCamera()
      return clampCityCamera({ ...current, zoom: nextCityZoom(current.zoom, direction) })
    })
  }, [])

  const labelFor = useCallback(
    (plot: CityPlot, occupied: boolean) => {
      if (!occupied) return copy.availablePlot(plot.near)
      const building = buildingOnPlot(city.document, plot.plotId)
      const type = building ? t.shed.categories[building.type] : copy.buildingType
      return copy.occupiedPlot(type, building ? authorName(building.authorId) : '')
    },
    [city.document, copy, t.shed.categories],
  )

  const remove = (plotId: string) => {
    city.release(plotId)
  }

  return (
    <div
      className={styles.root}
      data-shed-city-view=""
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !selectedPlotId) return
        if (event.target instanceof Element && event.target.closest('select')) return
        event.preventDefault()
        setSelectedPlotId(null)
      }}
    >
      <div className={styles.mapWrap}>
        <div className={styles.stage}>
        <CityScene
          document={city.document}
          selectedPlotId={selectedPlot?.plotId ?? null}
          camera={camera}
          sceneLabel={copy.scene}
          labelFor={labelFor}
          onSelect={(plotId) => setSelectedPlotId(plotId)}
          onDeselect={() => setSelectedPlotId(null)}
          onDelete={remove}
          onPan={(panX, panY) => setCamera((current) => clampCityCamera({ ...current, panX, panY }))}
          onZoom={(direction) => zoomBy(direction)}
        />
        <div className={styles.toolbar} role="toolbar" aria-label={copy.zoomToolbar}>
          <button type="button" className={styles.tool} onClick={() => zoomBy('in')}>
            {t.shed.zoomIn}
          </button>
          <button type="button" className={styles.tool} onClick={() => zoomBy('out')}>
            {t.shed.zoomOut}
          </button>
          <button type="button" className={styles.tool} onClick={() => zoomBy('reset')}>
            {t.shed.resetView}
          </button>
          <button type="button" className={styles.tool} onClick={() => setCamera((current) => panCity(current, 'left'))}>
            {t.shed.panLeftShort}
          </button>
          <button type="button" className={styles.tool} onClick={() => setCamera((current) => panCity(current, 'right'))}>
            {t.shed.panRightShort}
          </button>
          <button type="button" className={styles.tool} onClick={() => setCamera((current) => panCity(current, 'up'))}>
            {t.shed.panUpShort}
          </button>
          <button type="button" className={styles.tool} onClick={() => setCamera((current) => panCity(current, 'down'))}>
            {t.shed.panDownShort}
          </button>
          <p className={styles.status} role="status">
            {statusText}
          </p>
        </div>
        </div>
        <aside className={styles.authors} aria-label={copy.authors}>
          <div className={styles.stats} aria-label={copy.stats}>
            <span data-city-stat="buildings">
              {copy.buildings} {stats.buildings}
            </span>
            <span data-city-stat="students">
              {copy.students} {stats.students}
            </span>
            <span data-city-stat="plots">
              {copy.availablePlots} {stats.availablePlots}
            </span>
          </div>
          <button
            type="button"
            className={styles.tool}
            aria-expanded={authorsOpen}
            aria-controls={authorListId}
            onClick={() => setAuthorsOpen((open) => !open)}
          >
            {authorsOpen ? copy.hideRanking : copy.showRanking}
          </button>
          {authorsOpen ? (
            <ol id={authorListId} className={styles.ranking}>
              {ranking.map((author) => (
                <li key={author.id}>
                  <button
                    type="button"
                    className={styles.author}
                    aria-pressed={city.document.scene.activeAuthorId === author.id}
                    onClick={() => city.setAuthor(author.id)}
                  >
                    <span className={styles.marker} style={{ background: author.marker }} aria-hidden="true" />
                    <span>{author.name}</span>
                    <span className={styles.count}>{author.count}</span>
                  </button>
                </li>
              ))}
            </ol>
          ) : null}
          <p className={styles.note}>{copy.authorsNote}</p>
          <p className={styles.attribution}>
            <a href={krakowOldTown.meta.licenseUrl}>{krakowOldTown.meta.attribution}</a>
            <span>{copy.plotsNote}</span>
          </p>
        </aside>
      </div>
      {selectedPlot ? (
        <aside
          className={styles.sheet}
          data-shed-panel=""
          aria-label={selectedBuilding ? copy.occupiedPlot(t.shed.categories[selectedBuilding.type], authorName(selectedBuilding.authorId)) : copy.build}
        >
          <div className={styles.sheetHead}>
            <h2>{selectedBuilding ? t.shed.categories[selectedBuilding.type] : copy.build}</h2>
            <button type="button" className={styles.tool} onClick={() => setSelectedPlotId(null)}>
              {copy.close}
            </button>
          </div>
          <p className={styles.meta}>{copy.location(selectedPlot.near)}</p>
          <p className={styles.note}>{copy.plotsNote}</p>
          {selectedBuilding ? (
            <>
              <p className={styles.meta}>
                {copy.author}: {authorName(selectedBuilding.authorId)}
              </p>
              <p className={styles.meta}>
                {copy.recording}: {selectedBuilding.recordingId ?? copy.noRecording}
              </p>
              <button type="button" className={styles.tool} onClick={() => remove(selectedPlot.plotId)}>
                {copy.removeBuilding}
              </button>
            </>
          ) : (
            <>
              <label className={styles.field}>
                <span>{copy.prototypeAuthor}</span>
                <select
                  value={city.document.scene.activeAuthorId}
                  onChange={(event) => city.setAuthor(event.target.value)}
                >
                  {SAMPLE_AUTHORS.map((author) => (
                    <option key={author.id} value={author.id}>
                      {author.name}
                    </option>
                  ))}
                </select>
              </label>
              <fieldset className={styles.types}>
                <legend>{copy.buildingType}</legend>
                <div className={styles.typeRow}>
                  {CITY_BUILDING_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      className={styles.tool}
                      aria-pressed={buildingType === type}
                      onClick={() => setBuildingType(type)}
                    >
                      {t.shed.categories[type]}
                    </button>
                  ))}
                </div>
              </fieldset>
              <button type="button" className={styles.place} onClick={() => city.place(selectedPlot.plotId, buildingType)}>
                {copy.place}
              </button>
            </>
          )}
          <p className={styles.srOnly}>{copy.savedHint}</p>
        </aside>
      ) : null}
    </div>
  )
}
