import { useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { announce } from '../../a11y/liveRegion'
import { engine } from '../../hooks/useEngine'
import { speakEditTime } from '../../edit/dragFree/timeEntry'
import { useI18n } from '../../i18n'
import { timeToFrac, type View } from '../waveform/viewport'
import type { AudioMarker } from '../../audio/markers/markers'
import { markerLabelVisibility, markerLeftPercent, markerTimeFromClientX } from './placement'
import styles from '../waveform/Waveform.module.css'

type Props = {
  view: View
  markers: readonly AudioMarker[]
  selectedId: string | null
  duration: number
  onCommit: () => void
}

type Drag = {
  id: string
  name: string
  pointerId: number
  originX: number
  originTime: number
  lastTime: number
  moved: boolean
}

const DRAG_SLOP = 4

/** Decorative waveform flags. The marker list owns the accessible actions. */
export function WaveformMarkers({ view, markers, selectedId, duration, onCommit }: Props) {
  const { t, locale } = useI18n()
  const dragRef = useRef<Drag | null>(null)
  const placed = markers
    .map((marker) => ({ marker, fraction: timeToFrac(marker.timeSeconds, view) }))
    .filter((item) => item.fraction >= -0.02 && item.fraction <= 1.02)
  const labels = new Set(markerLabelVisibility(placed.map((item) => ({ id: item.marker.id, fraction: item.fraction }))))
  if (placed.length === 0) return null

  const finishDrag = (event: ReactPointerEvent<HTMLElement>, seekIfClick: boolean) => {
    const drag = dragRef.current
    if (!drag || event.pointerId !== drag.pointerId) return
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (drag.moved && Math.abs(drag.lastTime - drag.originTime) > 0.0005) {
      onCommit()
      announce(t.markers.retimed(drag.name, speakEditTime(drag.lastTime, locale)))
      return
    }
    if (!seekIfClick || drag.moved) return
    const found = engine.goToUserMarker(drag.id)
    if (!found) return
    announce(t.markers.pointLabel(found.name, speakEditTime(found.timeSeconds, locale)))
  }

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
          >
            <span
              className={styles.userMarkerFlag}
              data-marker-flag=""
              onPointerDown={(event) => {
                if (event.button !== 0) return
                event.preventDefault()
                event.stopPropagation()
                event.currentTarget.setPointerCapture(event.pointerId)
                dragRef.current = {
                  id: marker.id,
                  name: marker.name,
                  pointerId: event.pointerId,
                  originX: event.clientX,
                  originTime: marker.timeSeconds,
                  lastTime: marker.timeSeconds,
                  moved: false,
                }
              }}
              onPointerMove={(event) => {
                const drag = dragRef.current
                if (!drag || event.pointerId !== drag.pointerId) return
                event.preventDefault()
                event.stopPropagation()
                if (!drag.moved && Math.abs(event.clientX - drag.originX) < DRAG_SLOP) return
                drag.moved = true
                const overlay = event.currentTarget.closest('[data-wave-overlay]')
                if (!(overlay instanceof HTMLElement)) return
                const rect = overlay.getBoundingClientRect()
                const time = markerTimeFromClientX(event.clientX, rect, view, duration)
                if (Math.abs(time - drag.lastTime) < 0.0005) return
                const result = engine.updateUserMarker(drag.id, { timeSeconds: time })
                if (!result.ok) return
                drag.lastTime = time
              }}
              onPointerUp={(event) => {
                event.stopPropagation()
                finishDrag(event, true)
              }}
              onPointerCancel={(event) => {
                event.stopPropagation()
                finishDrag(event, false)
              }}
            >
              <span className={styles.userMarkerGem} data-marker-gem="" />
            </span>
            {labels.has(marker.id) ? <span className={styles.userMarkerLabel}>{marker.name}</span> : null}
          </div>
        )
      })}
    </>
  )
}
