import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { wheelToNormalized } from './scrub'
import { arcPath, knobAngleDeg, knobValueArc, polar } from './knobGeom'
import styles from './Knob.module.css'

type Props = {
  label: string
  valueText: string
  normalized: number
  visualNormalized?: number
  visualValueText?: string
  /** Thin outer ring showing LFO ±depth around the stored zero. */
  lfoRange?: { min: number; max: number }
  onChange: (normalized: number) => void
  onReset?: () => void
  onGestureEnd?: () => void
  onTypedValue?: (text: string) => boolean
  min?: number
  max?: number
  now?: number
  bipolar?: boolean
}

const DRAG_PX = 140

export function ValueKnob({
  label,
  valueText,
  normalized,
  visualNormalized,
  visualValueText,
  lfoRange,
  onChange,
  onReset,
  onGestureEnd,
  onTypedValue,
  min = 0,
  max = 1,
  now,
  bipolar = false,
}: Props) {
  const dialRef = useRef<HTMLButtonElement>(null)
  const valueRef = useRef(normalized)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(valueText)

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

  const shown = visualNormalized ?? normalized
  const shownText = visualValueText ?? valueText
  const r = 26
  const rangeR = 31
  const cx = 36
  const cy = 36
  const tipDeg = knobAngleDeg(shown)
  const needle = polar(cx, cy, r - 6, tipDeg)
  const track = arcPath(cx, cy, r, 135, 405)
  const valueArc = knobValueArc(lfoRange ? normalized : shown, bipolar)
  const fill = arcPath(cx, cy, r, valueArc.startDeg, valueArc.endDeg)
  const rangeArc = lfoRange
    ? arcPath(cx, cy, rangeR, knobAngleDeg(lfoRange.min), knobAngleDeg(lfoRange.max))
    : ''
  const zeroTick = lfoRange ? polar(cx, cy, rangeR, knobAngleDeg(normalized)) : null

  return (
    <div className={styles.knob}>
      <p className={styles.label}>{label}</p>
      <button
        ref={dialRef}
        type="button"
        className={styles.dial}
        aria-label={`${label} ${shownText}`}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={now ?? Number(shown.toFixed(3))}
        aria-valuetext={shownText}
        onPointerDown={onPointerDown}
        onDoubleClick={() => onReset?.()}
      >
        <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true">
          <circle cx={cx} cy={cy} r={r} fill="var(--bg-control)" />
          <path
            d={track}
            fill="none"
            stroke="var(--border-default)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {fill ? (
            <path
              d={fill}
              fill="none"
              stroke="var(--accent-primary)"
              strokeWidth="3"
              strokeLinecap="round"
            />
          ) : null}
          {rangeArc ? (
            <path
              d={rangeArc}
              fill="none"
              stroke="var(--accent-primary)"
              strokeWidth="1.25"
              strokeLinecap="round"
              opacity="0.85"
            />
          ) : null}
          {zeroTick ? (
            <circle cx={zeroTick.x} cy={zeroTick.y} r="1.75" fill="var(--accent-primary)" />
          ) : null}
          <line
            x1={cx}
            y1={cy}
            x2={needle.x}
            y2={needle.y}
            stroke="var(--text-primary)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
      {editing ? (
        <input
          className={styles.valueInput}
          value={draft}
          autoFocus
          aria-label={`${label} value`}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => setEditing(false)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              const ok = onTypedValue?.(draft)
              if (ok !== false) setEditing(false)
            } else if (event.key === 'Escape') {
              event.preventDefault()
              setEditing(false)
            }
          }}
        />
      ) : (
        <p
          className={styles.value}
          onDoubleClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            setDraft(shownText)
            setEditing(true)
          }}
          title="Double-click to type a value"
        >
          {shownText}
        </p>
      )}
    </div>
  )
}
