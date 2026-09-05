import { useRef, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import type { SensoryDialSpec } from '../sensoryParameters'
import { dialAmount, valueFromDial } from '../sensoryState'
import styles from './SensoryDial.module.css'

type Props = {
  spec: SensoryDialSpec
  axisValue: number
  onChange: (axisValue: number) => void
  onCommit: () => void
}

const START_DEG = 225
const SWEEP = 270

function amountFromPointer(clientX: number, clientY: number, el: HTMLElement): number {
  const rect = el.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  let cssDeg = (Math.atan2(clientX - cx, -(clientY - cy)) * 180) / Math.PI
  if (cssDeg < 0) cssDeg += 360
  const fromStart = (cssDeg - START_DEG + 360) % 360
  return Math.min(1, Math.max(0, fromStart / SWEEP))
}

export function SensoryDial({ spec, axisValue, onChange, onCommit }: Props) {
  const dragging = useRef(false)
  const amount = dialAmount(axisValue, spec.pole)
  const angle = START_DEG + amount * SWEEP

  const apply = (next: number) => {
    onChange(valueFromDial(next, spec.pole))
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragging.current = true
    apply(amountFromPointer(event.clientX, event.clientY, event.currentTarget))
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    apply(amountFromPointer(event.clientX, event.clientY, event.currentTarget))
  }

  const end = () => {
    if (!dragging.current) return
    dragging.current = false
    onCommit()
  }

  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 0.02 : 0.08
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault()
      apply(amount + step)
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault()
      apply(amount - step)
    } else if (event.key === 'Home') {
      event.preventDefault()
      apply(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      apply(1)
    }
  }

  return (
    <div className={`${styles.wrap} ${styles[spec.tone]}`}>
      <div
        className={styles.dial}
        role="slider"
        tabIndex={0}
        aria-label={`${spec.label}, ${spec.whisper}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(amount * 100)}
        aria-valuetext={spec.label}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={end}
        onPointerCancel={end}
        onKeyDown={onKey}
        onKeyUp={(event) => {
          if (event.key.startsWith('Arrow') || event.key === 'Home' || event.key === 'End') onCommit()
        }}
      >
        <span className={styles.ring} aria-hidden="true" />
        <span className={styles.dot} style={{ transform: `rotate(${angle}deg)` }} aria-hidden="true" />
      </div>
      <p className={styles.label}>{spec.label}</p>
      <p className={styles.whisper}>{spec.whisper}</p>
    </div>
  )
}
