import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { PARAMS } from '../../audio/parameters/definitions'
import {
  formatParamValue,
  fromNormalized,
  toNormalized,
} from '../../audio/parameters/mapping'
import type { ParamId } from '../../audio/parameters/types'
import { engine } from '../../hooks/useEngine'
import { wheelToNormalized } from './scrub'
import styles from './Knob.module.css'

type Props = {
  id: ParamId
  value: number
}

const DRAG_PX = 140

export function Knob({ id, value }: Props) {
  const def = PARAMS[id]
  const normalized = toNormalized(value, def)
  const dialRef = useRef<HTMLButtonElement>(null)
  const valueRef = useRef(normalized)
  valueRef.current = normalized

  useEffect(() => {
    const el = dialRef.current
    if (!el) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const next = Math.min(
        1,
        Math.max(0, valueRef.current + wheelToNormalized(event.deltaY, event.shiftKey)),
      )
      engine.setParam(id, fromNormalized(next, def))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [id, def])

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    const target = event.currentTarget
    target.setPointerCapture(event.pointerId)
    let lastY = event.clientY
    let current = normalized
    const started = event.timeStamp

    const up = (upEvent: PointerEvent) => {
      try {
        target.releasePointerCapture(upEvent.pointerId)
      } catch {
        /* capture already released */
      }
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerup', up)
      target.removeEventListener('pointercancel', up)
      target.removeEventListener('lostpointercapture', up)
      // Double tap / quick second press resets — only count real pointer-ups.
      if (
        upEvent.type === 'pointerup' &&
        upEvent.timeStamp - started < 220 &&
        Math.abs(upEvent.clientY - event.clientY) < 6
      ) {
        const prev = target.dataset.lastTap
        if (prev && upEvent.timeStamp - Number(prev) < 400) {
          engine.resetParam(id)
          target.dataset.lastTap = ''
          return
        }
        target.dataset.lastTap = String(upEvent.timeStamp)
      }
    }
    const move = (moveEvent: PointerEvent) => {
      // If the button was released outside the window, the pointerup can be
      // lost; stop as soon as we see the pointer moving with no button held.
      if (moveEvent.buttons === 0) {
        up(moveEvent)
        return
      }
      const dy = lastY - moveEvent.clientY
      lastY = moveEvent.clientY
      current = Math.min(1, Math.max(0, current + dy / DRAG_PX))
      engine.setParam(id, fromNormalized(current, def))
    }
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', up)
    target.addEventListener('pointercancel', up)
    target.addEventListener('lostpointercapture', up)
  }

  const r = 26
  const cx = 36
  const cy = 36
  const circ = 2 * Math.PI * r
  const sweep = circ * 0.75
  const filled = sweep * normalized
  const angle = -225 + normalized * 270
  const rad = (angle * Math.PI) / 180
  const nx = cx + Math.cos(rad) * (r - 6)
  const ny = cy + Math.sin(rad) * (r - 6)

  return (
    <div className={styles.knob}>
      <p className={styles.label}>{def.label}</p>
      <button
        ref={dialRef}
        type="button"
        className={styles.dial}
        aria-label={`${def.label} ${formatParamValue(value, def)}`}
        aria-valuemin={def.min}
        aria-valuemax={def.max}
        aria-valuenow={Number(value.toFixed(3))}
        aria-valuetext={formatParamValue(value, def)}
        onPointerDown={onPointerDown}
        onDoubleClick={() => engine.resetParam(id)}
      >
        <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true">
          <circle cx={cx} cy={cy} r={r} fill="#25282a" />
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="#3a3e41"
            strokeWidth="3"
            strokeDasharray={`${sweep} ${circ}`}
            strokeDashoffset={sweep * 0.125}
            strokeLinecap="round"
            transform={`rotate(135 ${cx} ${cy})`}
          />
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="3"
            strokeDasharray={`${filled} ${circ}`}
            strokeDashoffset={sweep * 0.125}
            strokeLinecap="round"
            transform={`rotate(135 ${cx} ${cy})`}
          />
          <line
            x1={cx}
            y1={cy}
            x2={nx}
            y2={ny}
            stroke="#f3f3f3"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
      <p className={styles.value}>{formatParamValue(value, def)}</p>
    </div>
  )
}
