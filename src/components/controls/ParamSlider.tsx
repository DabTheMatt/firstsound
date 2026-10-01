import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { PARAMS } from '../../audio/parameters/definitions'
import { formatParamValue, fromNormalized, toNormalized } from '../../audio/parameters/mapping'
import type { ParamId } from '../../audio/parameters/types'
import { applySliderKey, formatAccessibleValue, paramDescription } from '../../a11y'
import { engine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import { focusParameterControl, useFocusedWheel } from './focusedWheel'
import { createCoarseGestureSession, isCoarsePointer } from './gestureIntent'
import styles from './ParamSlider.module.css'

type Props = {
  id: ParamId
  value: number
  liveValue?: number
}

export function ParamSlider({ id, value, liveValue }: Props) {
  const { paramLabel, locale } = useI18n()
  const def = PARAMS[id]
  const n = toNormalized(value, def)
  const shown = toNormalized(liveValue ?? value, def)
  const shownValue = liveValue ?? value
  const rowRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [adjusting, setAdjusting] = useState(false)
  const labelId = useId()
  const descId = useId()
  const spoken = formatAccessibleValue(shownValue, def, locale)
  const description = paramDescription(id, locale)
  const nRef = useRef(n)
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
    const target = event.currentTarget
    if (isCoarsePointer(event.pointerType)) {
      const armed = document.activeElement === target
      const session = createCoarseGestureSession(
        { clientX: event.clientX, clientY: event.clientY, timeStamp: event.timeStamp },
        {
          armed,
          axis: 'horizontal',
          onScroll: () => {
            if (armed) target.blur()
          },
          onAdjustStart: (info) => {
            target.dataset.gesture = 'adjust'
            setAdjusting(true)
            focusParameterControl(target)
            try {
              target.setPointerCapture(event.pointerId)
            } catch {
              /* pointer already gone */
            }
            apply(info.clientX, target)
          },
          onAdjust: (info) => apply(info.clientX, target),
          onTap: () => focusParameterControl(target),
          onEnd: () => {
            delete target.dataset.gesture
            setAdjusting(false)
          },
        },
      )
      const up = (upEvent: PointerEvent) => {
        try {
          target.releasePointerCapture(upEvent.pointerId)
        } catch {
          /* already released */
        }
        target.removeEventListener('pointermove', move)
        target.removeEventListener('pointerup', up)
        target.removeEventListener('pointercancel', up)
        session.end(upEvent.type === 'pointercancel' ? 'cancel' : 'up')
      }
      const move = (moveEvent: PointerEvent) => {
        if (moveEvent.buttons === 0 && session.role === 'adjust') {
          up(moveEvent)
          return
        }
        session.move({
          clientX: moveEvent.clientX,
          clientY: moveEvent.clientY,
          timeStamp: moveEvent.timeStamp,
          shiftKey: moveEvent.shiftKey,
        })
      }
      target.addEventListener('pointermove', move)
      target.addEventListener('pointerup', up)
      target.addEventListener('pointercancel', up)
      return
    }

    event.preventDefault()
    focusParameterControl(target)
    target.setPointerCapture(event.pointerId)
    setAdjusting(true)
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
      setAdjusting(false)
    }
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', up)
    target.addEventListener('pointercancel', up)
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
      <div className={styles.meta}>
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
        {adjusting ? (
          <span className={styles.dragReadout} role="status">
            <span>{paramLabel(id)}</span>
            <strong>{formatParamValue(shownValue, def)}</strong>
          </span>
        ) : null}
        </span>
      </div>
      <p id={descId} className="sr-only">
        {description}
      </p>
      <div
        ref={trackRef}
        className={styles.track}
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
        onDoubleClick={() => engine.resetParam(id)}
        onKeyDown={onKeyDown}
      >
        <span className={styles.fill} style={{ width: `${shown * 100}%` }} />
      </div>
    </div>
  )
}