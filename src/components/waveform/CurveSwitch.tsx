import { useEffect, useRef, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import type { AutomationCurve } from '../../audio/automation/automation'
import { focusParameterControl, useFocusedWheel } from '../controls/focusedWheel'
import {
  CURVE_DETENT_BEARING,
  CURVE_ICON_RADIUS,
  CURVE_SWITCH_BOX,
  CURVE_SWITCH_ORDER,
  clampCurveIndex,
  curveDetentPoint,
  curveIndexFor,
  curveIndexFromDrag,
  curveIndexFromPointer,
} from './curveSwitch'
import styles from './CurveSwitch.module.css'

export type CurveSwitchLabels = {
  step: string
  linear: string
  smooth: string
  group: string
  idle: string
}

type Props = {
  value: AutomationCurve | null
  disabled?: boolean
  labels: CurveSwitchLabels
  accent?: string
  onChange: (curve: AutomationCurve) => void
  onCommit?: () => void
}

const ICON_PATH: Record<AutomationCurve, string> = {
  step: 'M2.2 12.6 H6.4 V8.2 H10.2 V3.8 H13.8',
  linear: 'M3.2 12.8 L12.8 3.2',
  smooth: 'M1.6 8 C3.6 3.2 5.6 3.2 8 8 C10.4 12.8 12.4 12.8 14.4 8',
}

function CurveIcon({ curve }: { curve: AutomationCurve }) {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
      <path
        d={ICON_PATH[curve]}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Compact three-position rotary for one automation segment. */
export function CurveSwitch({ value, disabled = false, labels, accent, onChange, onCommit }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const index = value == null ? 1 : curveIndexFor(value)
  const indexRef = useRef(index)
  const valueRef = useRef(value)
  const disabledRef = useRef(disabled)
  const onChangeRef = useRef(onChange)
  const onCommitRef = useRef(onCommit)
  const dragRef = useRef<{ y: number; index: number; moved: boolean } | null>(null)
  const suppressClick = useRef(false)

  useEffect(() => {
    indexRef.current = index
    valueRef.current = value
    disabledRef.current = disabled
    onChangeRef.current = onChange
    onCommitRef.current = onCommit
  }, [index, value, disabled, onChange, onCommit])

  useFocusedWheel(
    rootRef,
    (event) => {
      if (disabledRef.current || valueRef.current == null) return
      const dir = event.deltaY < 0 ? 1 : event.deltaY > 0 ? -1 : 0
      if (!dir) return
      const next = clampCurveIndex(indexRef.current + dir)
      if (next === indexRef.current) return
      indexRef.current = next
      const curve = CURVE_SWITCH_ORDER[next]!
      valueRef.current = curve
      onChangeRef.current(curve)
      onCommitRef.current?.()
    },
    { blurRootRef: rootRef },
  )

  const apply = (nextIndex: number, commit: boolean) => {
    if (disabledRef.current) return
    const curve = CURVE_SWITCH_ORDER[clampCurveIndex(nextIndex)]!
    if (curve !== valueRef.current) {
      valueRef.current = curve
      onChangeRef.current(curve)
    }
    if (commit) onCommitRef.current?.()
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || event.button !== 0) return
    event.preventDefault()
    focusParameterControl(event.currentTarget)
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { y: event.clientY, index: indexRef.current, moved: false }
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || !event.currentTarget.hasPointerCapture(event.pointerId)) return
    const next = curveIndexFromDrag(drag.index, event.clientY - drag.y)
    if (next !== drag.index) drag.moved = true
    if (!drag.moved) return
    apply(next, false)
  }

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    dragRef.current = null
    if (!drag) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (!drag.moved) {
      const mark = (event.target as HTMLElement | null)?.closest?.('[data-curve-pos]')
      const pos = mark?.getAttribute('data-curve-pos')
      const fromMark = CURVE_SWITCH_ORDER.indexOf(pos as AutomationCurve)
      if (fromMark >= 0) {
        apply(fromMark, true)
        return
      }
      const rect = event.currentTarget.getBoundingClientRect()
      const nearest = curveIndexFromPointer(
        event.clientX - (rect.left + CURVE_SWITCH_BOX.cx),
        event.clientY - (rect.top + CURVE_SWITCH_BOX.cy),
      )
      if (nearest != null) apply(nearest, true)
      return
    }
    suppressClick.current = true
    onCommitRef.current?.()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return
    let next = indexRef.current
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next += 1
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next -= 1
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = CURVE_SWITCH_ORDER.length - 1
    else return
    event.preventDefault()
    apply(next, true)
  }

  const currentLabel = value == null ? labels.idle : labels[value]
  const idle = disabled || value == null

  return (
    <div
      ref={rootRef}
      className={`${styles.switch} ${idle ? styles.disabled : ''}`}
      style={!idle && accent ? ({ color: accent } as CSSProperties) : undefined}
      role="radiogroup"
      tabIndex={0}
      aria-label={idle ? `${labels.group}. ${labels.idle}` : `${labels.group}: ${currentLabel}`}
      aria-disabled={idle || undefined}
      data-curve-switch="true"
      data-curve-value={value ?? 'none'}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
    >
      <span className={styles.dial} aria-hidden="true" />
      <span
        className={styles.needle}
        aria-hidden="true"
        style={{ transform: `rotate(${CURVE_DETENT_BEARING[index]}deg)` }}
      />
      <span className={styles.hub} aria-hidden="true" />
      {CURVE_SWITCH_ORDER.map((curve, i) => {
        const point = curveDetentPoint(i, CURVE_SWITCH_BOX.cx, CURVE_SWITCH_BOX.cy, CURVE_ICON_RADIUS)
        const checked = !idle && i === index
        return (
          <button
            key={curve}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={labels[curve]}
            title={labels[curve]}
            tabIndex={-1}
            data-curve-pos={curve}
            className={`${styles.mark} ${checked ? styles.markOn : ''}`}
            style={{ left: point.x, top: point.y }}
            onClick={() => {
              if (suppressClick.current) {
                suppressClick.current = false
                return
              }
              if (idle) return
              apply(i, true)
            }}
          >
            <CurveIcon curve={curve} />
          </button>
        )
      })}
      <span className="sr-only">{`${labels.step}, ${labels.linear}, ${labels.smooth}`}</span>
    </div>
  )
}
