import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { wheelToNormalized } from './scrub'
import styles from './Knob.module.css'

type Props = {
  label: string
  valueText: string
  normalized: number
  onChange: (normalized: number) => void
  onReset?: () => void
  onGestureEnd?: () => void
  min?: number
  max?: number
  now?: number
}

const DRAG_PX = 140

export function ValueKnob({
  label,
  valueText,
  normalized,
  onChange,
  onReset,
  onGestureEnd,
  min = 0,
  max = 1,
  now,
}: Props) {
  const dialRef = useRef<HTMLButtonElement>(null)
  const valueRef = useRef(normalized)

  useEffect(() => {
    valueRef.current = normalized
  }, [normalized])

  useEffect(() => {
    const el = dialRef.current
    if (!el) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const next = Math.min(
        1,
        Math.max(0, valueRef.current + wheelToNormalized(event.deltaY, event.shiftKey)),
      )
      onChange(next)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onChange])

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
      if (upEvent.type === 'pointerup') onGestureEnd?.()
      if (
        upEvent.type === 'pointerup' &&
        upEvent.timeStamp - started < 220 &&
        Math.abs(upEvent.clientY - event.clientY) < 6
      ) {
        const prev = target.dataset.lastTap
        if (prev && upEvent.timeStamp - Number(prev) < 400) {
          onReset?.()
          target.dataset.lastTap = ''
          return
        }
        target.dataset.lastTap = String(upEvent.timeStamp)
      }
    }
    const move = (moveEvent: PointerEvent) => {
      if (moveEvent.buttons === 0) {
        up(moveEvent)
        return
      }
      const dy = lastY - moveEvent.clientY
      lastY = moveEvent.clientY
      current = Math.min(1, Math.max(0, current + dy / DRAG_PX))
      onChange(current)
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
      <p className={styles.label}>{label}</p>
      <button
        ref={dialRef}
        type="button"
        className={styles.dial}
        aria-label={`${label} ${valueText}`}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={now ?? Number(normalized.toFixed(3))}
        aria-valuetext={valueText}
        onPointerDown={onPointerDown}
        onDoubleClick={() => onReset?.()}
      >
        <svg width="72" height="58" viewBox="0 7 72 58" aria-hidden="true">
          <circle cx={cx} cy={cy} r={r} fill="var(--bg-control)" />
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="var(--border-default)"
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
            stroke="var(--accent-primary)"
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
            stroke="var(--text-primary)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
      <p className={styles.value}>{valueText}</p>
    </div>
  )
}
