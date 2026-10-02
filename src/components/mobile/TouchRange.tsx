import { useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { PARAMS } from '../../audio/parameters/definitions'
import { toNormalized } from '../../audio/parameters/mapping'
import type { ParamId } from '../../audio/parameters/types'
import { useEngine } from '../../hooks/useEngine'
import { ModulationAffordance } from '../modulation/ModulationAffordance'
import { ModulationMarks } from '../modulation/ModulationMarks'
import { parameterModulationState } from '../modulation/modulationModel'
import { classifyGesture } from './gestureIntent'
import styles from './TouchRange.module.css'

type Props = {
  label: string
  valueText: string
  normalized: number
  min: number
  max: number
  now: number
  onChange: (normalized: number) => void
  /** Shared LFO target. Omitted when this control cannot be modulated. */
  paramId?: ParamId
}

/** Full-width value control. A vertical touch scrolls; a horizontal touch edits. */
export function TouchRange({ label, valueText, normalized, min, max, now, onChange, paramId }: Props) {
  const snap = useEngine()
  const trackRef = useRef<HTMLDivElement>(null)
  const modulation = paramId
    ? parameterModulationState({
        lfos: snap.fxLfos,
        automation: snap.automation,
        paramId,
        baseNormalized: normalized,
        editorOpen: false,
      })
    : null
  const range = modulation?.range ?? null
  const live = paramId && range ? toNormalized(snap.liveParams[paramId], PARAMS[paramId]) : null
  const gesture = useRef<{ x: number; y: number; intent: 'pending' | 'scroll' | 'edit'; pointerId: number } | null>(
    null,
  )
  const shown = Math.min(1, Math.max(0, normalized))

  const apply = (clientX: number, target: HTMLDivElement) => {
    const rect = target.getBoundingClientRect()
    const t = Math.min(1, Math.max(0, (clientX - rect.left) / Math.max(1, rect.width)))
    onChange(t)
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const coarse = event.pointerType === 'touch' || event.pointerType === 'pen'
    if (!coarse) {
      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      apply(event.clientX, event.currentTarget)
      gesture.current = { x: event.clientX, y: event.clientY, intent: 'edit', pointerId: event.pointerId }
      return
    }
    gesture.current = { x: event.clientX, y: event.clientY, intent: 'pending', pointerId: event.pointerId }
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current
    if (!g || g.pointerId !== event.pointerId || g.intent === 'scroll') return
    if (g.intent === 'pending') {
      const next = classifyGesture(event.clientX - g.x, event.clientY - g.y)
      if (next === 'pending') return
      g.intent = next
      if (next === 'scroll') return
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    apply(event.clientX, event.currentTarget)
  }

  const end = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (gesture.current?.pointerId !== event.pointerId) return
    gesture.current = null
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      /* already released */
    }
  }

  return (
    <div className={styles.row} data-param-id={paramId} data-touch="true">
      <div className={styles.meta}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>{valueText}</span>
        {paramId ? (
          <span className={styles.modSlot}>
            <ModulationAffordance id={paramId} touch />
          </span>
        ) : null}
      </div>
      <div
        ref={trackRef}
        className={styles.track}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={Number(now.toFixed(3))}
        aria-valuetext={valueText}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={end}
        onPointerCancel={end}
      >
        {range ? (
          <ModulationMarks center={normalized} range={range} live={live} />
        ) : (
          <span className={styles.fill} style={{ width: `${shown * 100}%` }} />
        )}
      </div>
    </div>
  )
}
