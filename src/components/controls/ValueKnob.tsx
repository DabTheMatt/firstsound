import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { applySliderKey } from '../../a11y/keyboard'
import { focusParameterControl, useFocusedWheel } from './focusedWheel'
import { createCoarseGestureSession, fineDragSpan, isCoarsePointer } from './gestureIntent'
import { wheelToNormalized } from './scrub'
import {
  ACTIVE_LED_INSET_PX,
  ACTIVE_LED_SIZE_PX,
  arcPath,
  knobAngleDeg,
  knobValueArc,
  polar,
} from './knobGeom'
import { presentParamLabel } from './paramLabelFit'
import { useModulationParamId } from './LfoParamShell'
import { ParamActionPair } from '../random/ParamActionPair'
import styles from './Knob.module.css'

type Props = {
  label: string
  valueText: string
  valueTextAccessible?: string
  description?: string
  normalized: number
  visualNormalized?: number
  visualValueText?: string
  /** Stored (pre-LFO) readout shown between the dial and the live value. */
  baseValueText?: string
  compact?: boolean
  /** Smaller dial that stays visually secondary to a compact knob. */
  mini?: boolean
  /** Thin outer ring showing LFO ±depth around the stored zero. */
  lfoRange?: { min: number; max: number }
  /** Current modulated position on the same normalized scale. The needle stays on the center. */
  liveNormalized?: number
  onChange: (normalized: number) => void
  onReset?: () => void
  onGestureEnd?: () => void
  onTypedValue?: (text: string) => boolean
  min?: number
  max?: number
  now?: number
  bipolar?: boolean
  /** Tick on the value arc, e.g. Width 100%. */
  markerNormalized?: number
  /** Dial only. Mixer strips use this so the caption does not stack layout. */
  dialOnly?: boolean
}

const DRAG_PX = 140

export function ValueKnob({
  label,
  valueText,
  valueTextAccessible,
  description,
  normalized,
  visualNormalized,
  visualValueText,
  baseValueText,
  compact = false,
  mini = false,
  lfoRange,
  liveNormalized,
  onChange,
  onReset,
  onGestureEnd,
  onTypedValue,
  min = 0,
  max = 1,
  now,
  bipolar = false,
  markerNormalized,
  dialOnly = false,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const dialRef = useRef<HTMLDivElement>(null)
  const valueRef = useRef(normalized)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [tipOpen, setTipOpen] = useState(false)
  const [adjusting, setAdjusting] = useState(false)
  const labelId = useId()
  const descId = useId()
  const spoken = valueTextAccessible ?? valueText

  useEffect(() => {
    valueRef.current = normalized
  }, [normalized])

  useFocusedWheel(
    dialRef,
    (event) => {
      const next = Math.min(
        1,
        Math.max(0, valueRef.current + wheelToNormalized(event.deltaY, event.shiftKey)),
      )
      valueRef.current = next
      onChange(next)
    },
    { blurRootRef: rootRef },
  )

  const markGesture = (role: '' | 'adjust') => {
    const root = rootRef.current
    if (!root) return
    if (role) root.dataset.gesture = role
    else delete root.dataset.gesture
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.currentTarget
    if (isCoarsePointer(event.pointerType)) {
      const armed = document.activeElement === target
      let current = normalized
      const session = createCoarseGestureSession(
        { clientX: event.clientX, clientY: event.clientY, timeStamp: event.timeStamp },
        {
          armed,
          axis: 'either',
          onScroll: () => {
            if (armed) target.blur()
          },
          onAdjustStart: () => {
            markGesture('adjust')
            setAdjusting(true)
            focusParameterControl(target)
            try {
              target.setPointerCapture(event.pointerId)
            } catch {
              /* pointer already gone */
            }
          },
          onAdjust: (info) => {
            const span = fineDragSpan(DRAG_PX, info.fine)
            const dominant = Math.abs(info.dy) >= Math.abs(info.dx) ? info.dy : info.dx
            current = Math.min(1, Math.max(0, current + dominant / span))
            onChange(current)
          },
          onTap: () => {
            const prev = target.dataset.lastTap
            if (armed && prev && event.timeStamp - Number(prev) < 400) {
              onReset?.()
              target.dataset.lastTap = ''
              return
            }
            target.dataset.lastTap = String(event.timeStamp)
            focusParameterControl(target)
          },
          onEnd: ({ adjusted }) => {
            markGesture('')
            setAdjusting(false)
            if (adjusted) onGestureEnd?.()
          },
        },
      )
      const up = (upEvent: PointerEvent) => {
        try {
          target.releasePointerCapture(upEvent.pointerId)
        } catch {
          /* capture already released */
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
    let lastY = event.clientY
    let current = normalized
    const started = event.timeStamp
    setAdjusting(true)

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
      setAdjusting(false)
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
      const span = fineDragSpan(DRAG_PX, moveEvent.shiftKey)
      current = Math.min(1, Math.max(0, current + dy / span))
      onChange(current)
    }
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', up)
    target.addEventListener('pointercancel', up)
    target.addEventListener('lostpointercapture', up)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      setDraft(valueText)
      setEditing(true)
      return
    }
    if (event.key === 'Escape') {
      setTipOpen(false)
      return
    }
    const next = applySliderKey(event, valueRef.current)
    if (!next) return
    event.preventDefault()
    if (next.kind === 'reset') onReset?.()
    else onChange(next.normalized)
  }

  const shown = visualNormalized ?? normalized
  const shownText = visualValueText ?? valueText
  const paramId = useModulationParamId()
  const cx = 42
  const cy = 42
  const r = 24
  const rangeR = 36
  const tipDeg = knobAngleDeg(shown)
  const needle = polar(cx, cy, r - 6, tipDeg)
  const track = arcPath(cx, cy, r, 135, 405)
  const valueArc = knobValueArc(shown, bipolar)
  const fill = arcPath(cx, cy, r, valueArc.startDeg, valueArc.endDeg)
  const rangeStartDeg = lfoRange ? knobAngleDeg(lfoRange.min) : 0
  const rangeEndDeg = lfoRange ? knobAngleDeg(lfoRange.max) : 0
  const rangeArc = lfoRange ? arcPath(cx, cy, rangeR, rangeStartDeg, rangeEndDeg) : ''
  const rangeStart = lfoRange ? polar(cx, cy, rangeR, rangeStartDeg) : null
  const rangeEnd = lfoRange ? polar(cx, cy, rangeR, rangeEndDeg) : null
  const zeroTick = lfoRange ? polar(cx, cy, rangeR, knobAngleDeg(normalized)) : null
  const liveDeg =
    lfoRange && liveNormalized != null && Number.isFinite(liveNormalized)
      ? knobAngleDeg(Math.min(1, Math.max(0, liveNormalized)))
      : null
  const liveTickInner = liveDeg == null ? null : polar(cx, cy, rangeR - 4, liveDeg)
  const liveTickOuter = liveDeg == null ? null : polar(cx, cy, rangeR + 3.5, liveDeg)
  const marker =
    markerNormalized == null ? null : polar(cx, cy, r + 6, knobAngleDeg(markerNormalized))
  const caption = presentParamLabel(label)
  const captionClass =
    caption.fit === 'tight'
      ? styles.labelFitTight
      : caption.fit === 'compact'
        ? styles.labelFitCompact
        : caption.fit === 'snug'
          ? styles.labelFitSnug
          : ''

  return (
      <div
        ref={rootRef}
        className={`${styles.knob} ${dialOnly ? styles.dialOnly : mini ? styles.mini : compact ? styles.compact : ''} ${adjusting ? styles.adjusting : ''}`}
        title={description}
        onMouseEnter={() => setTipOpen(true)}
        onMouseLeave={() => setTipOpen(false)}
      >
      {adjusting ? (
        <span className={styles.dragReadout} role="status">
          <span>{label}</span>
          <strong>{shownText}</strong>
        </span>
      ) : null}
      <p className={captionClass ? `${styles.label} ${captionClass}` : styles.label} id={labelId} title={label}>
        {caption.text}
      </p>
      {description ? (
        <p id={descId} className="sr-only">
          {description}
        </p>
      ) : null}
      {description && tipOpen ? (
        <span className={styles.tip} role="tooltip">
          {description}
        </span>
      ) : null}
      <div className={styles.dialWrap}>
      <div
        ref={dialRef}
        role="slider"
        tabIndex={0}
        className={styles.dial}
        aria-labelledby={labelId}
        aria-describedby={description ? descId : undefined}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={now ?? Number(shown.toFixed(3))}
        aria-valuetext={spoken}
        onPointerDown={onPointerDown}
        onDoubleClick={() => onReset?.()}
        onKeyDown={onKeyDown}
        onFocus={() => setTipOpen(true)}
        onBlur={() => setTipOpen(false)}
      >
        <span
          className={styles.activeLed}
          data-active-led=""
          aria-hidden="true"
          style={{
            top: ACTIVE_LED_INSET_PX,
            right: ACTIVE_LED_INSET_PX,
            width: ACTIVE_LED_SIZE_PX,
            height: ACTIVE_LED_SIZE_PX,
          }}
        />
        <svg width="84" height="84" viewBox="0 0 84 84" aria-hidden="true">
          <circle cx={cx} cy={cy} r={r} fill="var(--bg-control)" />
          <circle
            className={styles.focusRing}
            cx={cx}
            cy={cy}
            r={31}
            fill="none"
            stroke="var(--accent-primary)"
            strokeWidth="1.5"
          />
          <path
            d={track}
            fill="none"
            stroke="var(--border-strong)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {fill ? (
            <path
              className={styles.valueArc}
              d={fill}
              fill="none"
              stroke="var(--knob-arc, var(--accent-primary))"
              strokeWidth="3"
              strokeLinecap="round"
            />
          ) : null}
          {lfoRange ? (
            <path
              d={arcPath(cx, cy, rangeR, 135, 405)}
              fill="none"
              stroke="var(--border-default)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ) : null}
          {rangeArc ? (
            <path
              d={rangeArc}
              fill="none"
              stroke="var(--accent-primary)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ) : null}
          {rangeStart ? <circle cx={rangeStart.x} cy={rangeStart.y} r="2" fill="var(--accent-primary)" /> : null}
          {rangeEnd ? <circle cx={rangeEnd.x} cy={rangeEnd.y} r="2" fill="var(--accent-primary)" /> : null}
          {zeroTick ? (
            <circle cx={zeroTick.x} cy={zeroTick.y} r="2.25" fill="var(--text-primary)" />
          ) : null}
          {liveTickInner && liveTickOuter ? (
            <line
              x1={liveTickInner.x}
              y1={liveTickInner.y}
              x2={liveTickOuter.x}
              y2={liveTickOuter.y}
              stroke="var(--accent-primary)"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          ) : null}
          {marker ? (
            <circle cx={marker.x} cy={marker.y} r="2.4" fill="var(--text-muted)" />
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
      </div>
      <span className={styles.modSlot}>
        {paramId ? <ParamActionPair id={paramId} compact /> : null}
      </span>
      </div>
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
        <>
          {baseValueText ? (
            <p className={styles.baseValue} title="Stored value (LFO zero)">
              {baseValueText}
            </p>
          ) : null}
          <p
            className={styles.value}
            onDoubleClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              setDraft('')
              setEditing(true)
            }}
            title="Double-click to type a value"
          >
            {shownText}
          </p>
        </>
      )}
    </div>
  )
}
