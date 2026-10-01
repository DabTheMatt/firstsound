import { useRef, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import type { AutomationCurve } from '../../audio/automation/automation'
import styles from './SegmentCurveControl.module.css'

const ORDER = ['step', 'linear', 'smooth'] as const satisfies readonly AutomationCurve[]

const ICON_PATH: Record<AutomationCurve, string> = {
  step: 'M2.2 12.6 H6.4 V8.2 H10.2 V3.8 H13.8',
  linear: 'M3.2 12.8 L12.8 3.2',
  smooth: 'M1.6 8 C3.6 3.2 5.6 3.2 8 8 C10.4 12.8 12.4 12.8 14.4 8',
}

export type SegmentCurveLabels = {
  step: string
  linear: string
  smooth: string
  group: string
}

type Props = {
  value: AutomationCurve
  labels: SegmentCurveLabels
  accent?: string
  caption?: string
  showLabels?: boolean
  onChange: (curve: AutomationCurve) => void
  onCommit?: () => void
}

function CurveIcon({ curve }: { curve: AutomationCurve }) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        d={ICON_PATH[curve]}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Compact step / linear / smooth icons for one automation segment. */
export function SegmentCurveControl({ value, labels, accent, caption, showLabels = false, onChange, onCommit }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)

  const choose = (curve: AutomationCurve) => {
    if (curve !== value) onChange(curve)
    onCommit?.()
    const button = rootRef.current?.querySelector<HTMLButtonElement>(`[data-curve="${curve}"]`)
    button?.focus()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = ORDER.indexOf(value)
    let next = index
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = Math.min(ORDER.length - 1, index + 1)
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = Math.max(0, index - 1)
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = ORDER.length - 1
    else return
    event.preventDefault()
    event.stopPropagation()
    const curve = ORDER[next]
    if (curve) choose(curve)
  }

  const stopGraphGesture = (event: PointerEvent<HTMLDivElement>) => {
    event.stopPropagation()
  }

  return (
    <div
      ref={rootRef}
      className={styles.wrap}
      style={accent ? ({ '--lane': accent } as CSSProperties) : undefined}
      data-segment-curve="true"
      data-curve-value={value}
      onPointerDown={stopGraphGesture}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      {caption ? <span className={styles.caption}>{caption}</span> : null}
      <div
        className={styles.group}
        role="radiogroup"
        aria-label={labels.group}
        onKeyDown={onKeyDown}
      >
        {ORDER.map((curve) => {
          const checked = curve === value
          return (
            <button
              key={curve}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={labels[curve]}
              title={labels[curve]}
              tabIndex={checked ? 0 : -1}
              data-curve={curve}
              className={`${styles.option} ${checked ? styles.on : ''} ${showLabels ? styles.labeled : ''}`}
              onClick={() => choose(curve)}
            >
              <CurveIcon curve={curve} />
              {showLabels ? <span>{labels[curve]}</span> : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
