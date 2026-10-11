import { announce } from '../../a11y/liveRegion'
import { engine } from '../../hooks/useEngine'
import { speakEditTime } from '../../edit/dragFree/timeEntry'
import { useI18n } from '../../i18n'
import { timeToFrac, type View } from '../waveform/viewport'
import type { AudioMarker } from '../../audio/markers/markers'
import { markerLabelVisibility, markerLeftPercent } from './placement'
import styles from '../waveform/Waveform.module.css'

type Props = {
  view: View
  markers: readonly AudioMarker[]
  selectedId: string | null
}

/** Decorative waveform flags. The marker list owns the accessible actions. */
export function WaveformMarkers({ view, markers, selectedId }: Props) {
  const { t, locale } = useI18n()
  const placed = markers
    .map((marker) => ({ marker, fraction: timeToFrac(marker.timeSeconds, view) }))
    .filter((item) => item.fraction >= -0.02 && item.fraction <= 1.02)
  const labels = new Set(markerLabelVisibility(placed.map((item) => ({ id: item.marker.id, fraction: item.fraction }))))
  if (placed.length === 0) return null
  return (
    <>
      {placed.map(({ marker }) => {
        const selected = marker.id === selectedId
        return (
          <div
            key={marker.id}
            className={selected ? `${styles.userMarker} ${styles.userMarkerOn}` : styles.userMarker}
            data-user-marker={marker.id}
            data-marker-selected={selected ? 'true' : undefined}
            style={{ left: `${markerLeftPercent(marker.timeSeconds, view)}%` }}
            aria-hidden="true"
            onPointerDown={(event) => {
              event.stopPropagation()
            }}
            onClick={(event) => {
              event.stopPropagation()
              const found = engine.goToUserMarker(marker.id)
              if (!found) return
              announce(t.markers.pointLabel(found.name, speakEditTime(found.timeSeconds, locale)))
            }}
          >
            <span className={styles.userMarkerFlag} />
            {labels.has(marker.id) ? <span className={styles.userMarkerLabel}>{marker.name}</span> : null}
          </div>
        )
      })}
    </>
  )
}
