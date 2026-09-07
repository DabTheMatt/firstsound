import { useEffect, useId, useRef, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { PARAMS } from '../../audio/parameters/definitions'
import { formatParamValue, fromNormalized, toNormalized } from '../../audio/parameters/mapping'
import type { ParamId } from '../../audio/parameters/types'
import { applySliderKey, formatAccessibleValue, paramDescription } from '../../a11y'
import { engine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
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
  const trackRef = useRef<HTMLDivElement>(null)
  const labelId = useId()
  const descId = useId()
  const spoken = formatAccessibleValue(shownValue, def, locale)
  const description = paramDescription(id, locale)

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const next = Math.min(1, Math.max(0, n + (event.deltaY > 0 ? -0.02 : 0.02)))
      engine.setParam(id, fromNormalized(next, def))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [id, def, n])

  const apply = (clientX: number, target: HTMLDivElement) => {
    const rect = target.getBoundingClientRect()
    const t = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    engine.setParam(id, fromNormalized(t, def))
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    const target = event.currentTarget
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

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = applySliderKey(event, n)
    if (!next) return
    event.preventDefault()
    if (next.kind === 'reset') engine.resetParam(id)
    else engine.setParam(id, fromNormalized(next.normalized, def))
  }

  return (
    <div className={styles.row}>
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
        onPointerDown={onPointerDown}
        onDoubleClick={() => engine.resetParam(id)}
        onKeyDown={onKeyDown}
      >
        <span className={styles.fill} style={{ width: `${shown * 100}%` }} />
      </div>
    </div>
  )
}