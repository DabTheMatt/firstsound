import { useEffect, useId, useRef, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { PARAMS } from '../../audio/parameters/definitions'
import { formatParamValue, fromNormalized, toNormalized } from '../../audio/parameters/mapping'
import type { ParamId } from '../../audio/parameters/types'
import { applySliderKey, formatAccessibleValue, paramDescription } from '../../a11y'
import { engine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import { focusParameterControl, useFocusedWheel } from './focusedWheel'
import { classifyGesture } from '../mobile/gestureIntent'
import styles from './ParamSlider.module.css'

type Props = {
  id: ParamId
  value: number
  liveValue?: number
  /** Touch: vertical movement scrolls, horizontal movement edits, a tap focuses. */
  gestureSafe?: boolean
  onFocusRequest?: () => void
}

export function ParamSlider({ id, value, liveValue, gestureSafe = false, onFocusRequest }: Props) {
  const { paramLabel, locale } = useI18n()
  const def = PARAMS[id]
  const n = toNormalized(value, def)
  const shown = toNormalized(liveValue ?? value, def)
  const shownValue = liveValue ?? value
  const rowRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const labelId = useId()
  const descId = useId()
  const spoken = formatAccessibleValue(shownValue, def, locale)
  const description = paramDescription(id, locale)
  const nRef = useRef(n)
  const gesture = useRef<{
    x: number
    y: number
    intent: 'pending' | 'scroll' | 'edit'
    pointerId: number
  } | null>(null)
  useEffect(() => {
    nRef.current = n
  }, [n])

  useFocusedWheel(
    trackRef,
    (event) => {
      const next = Math.min(1, Math.max(0, nRef.current + (event.deltaY > 0 ? -0.02 : 0.02)))
      nRef.current = next
      engine.setParam(id, fromNormalized(next, def))
    },
    { blurRootRef: rowRef },
  )

  const apply = (clientX: number, target: HTMLDivElement) => {
    const rect = target.getBoundingClientRect()
    const t = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    engine.setParam(id, fromNormalized(t, def))
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const coarse = event.pointerType === 'touch' || event.pointerType === 'pen'
    if (gestureSafe && coarse) {
      gesture.current = { x: event.clientX, y: event.clientY, intent: 'pending', pointerId: event.pointerId }
      return
    }
    event.preventDefault()
    const target = event.currentTarget
    focusParameterControl(target)
    target.setPointerCapture(event.pointerId)
    apply(event.clientX, target)
    const move = (e: PointerEvent) => {
      if (e.buttons === 0) {
        up(e)
        return
      }
      apply(e.clientX, target)
    }
    const up = (e: PointerEvent) => {
      try {
        target.releasePointerCapture(e.pointerId)
      } catch {
        /* already released */
      }
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerup', up)
      target.removeEventListener('pointercancel', up)
    }
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', up)
    target.addEventListener('pointercancel', up)
  }

  const onSafePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const active = gesture.current
    if (!active || active.pointerId !== event.pointerId || active.intent === 'scroll') return
    if (active.intent === 'pending') {
      const next = classifyGesture(event.clientX - active.x, event.clientY - active.y)
      if (next === 'pending') return
      active.intent = next
      if (next === 'scroll') return
      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    apply(event.clientX, event.currentTarget)
  }

  const finishSafe = (event: ReactPointerEvent<HTMLDivElement>) => {
    const active = gesture.current
    if (!active || active.pointerId !== event.pointerId) return
    const tapped = active.intent === 'pending'
    gesture.current = null
    if (tapped) onFocusRequest?.()
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      /* already released */
    }
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = applySliderKey(event, n)
    if (!next) return
    event.preventDefault()
    if (next.kind === 'reset') engine.resetParam(id)
    else engine.setParam(id, fromNormalized(next.normalized, def))
  }

  return (
    <div ref={rowRef} className={styles.row}>
      <div
        className={styles.meta}
        onClick={() => onFocusRequest?.()}
        role={onFocusRequest ? 'button' : undefined}
        tabIndex={onFocusRequest ? 0 : undefined}
        onKeyDown={(event) => {
          if (!onFocusRequest) return
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onFocusRequest()
          }
        }}
      >
        <span className={styles.label} id={labelId}>
          {paramLabel(id)}
        </span>
        <span className={styles.readouts}>
          {liveValue != null ? (
            <span className={styles.baseValue} title="Stored value (LFO zero)">
              {formatParamValue(value, def)}
            </span>
          ) : null}
          <span className={styles.value}>{formatParamValue(shownValue, def)}</span>
        </span>
      </div>
      <p id={descId} className="sr-only">
        {description}
      </p>
      <div
        ref={trackRef}
        className={`${styles.track} ${gestureSafe ? styles.safe : ''}`}
        role="slider"
        tabIndex={0}
        aria-labelledby={labelId}
        aria-describedby={descId}
        aria-valuemin={def.min}
        aria-valuemax={def.max}
        aria-valuenow={Number(shownValue.toFixed(3))}
        aria-valuetext={spoken}
        title={description}
        onPointerDown={onPointerDown}
        onPointerMove={gestureSafe ? onSafePointerMove : undefined}
        onPointerUp={gestureSafe ? finishSafe : undefined}
        onPointerCancel={gestureSafe ? finishSafe : undefined}
        onDoubleClick={() => engine.resetParam(id)}
        onKeyDown={onKeyDown}
      >
        <span className={styles.fill} style={{ width: `${shown * 100}%` }} />
      </div>
    </div>
  )
}