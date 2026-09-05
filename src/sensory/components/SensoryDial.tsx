import { useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
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
const DRAG_PX = 120

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

export function SensoryDial({ spec, axisValue, onChange, onCommit }: Props) {
  const [held, setHeld] = useState(false)
  const drag = useRef<{
    pointerId: number
    originY: number
    originAmount: number
  } | null>(null)
  const bipolar = spec.kind === 'bipolar'
  const amount = bipolar ? (axisValue + 1) / 2 : dialAmount(axisValue, spec.pole)
  const angle = START_DEG + amount * SWEEP
  const from = spec.negativeLabel ?? spec.label
  const to = spec.positiveLabel ?? spec.label

  const applyAmount = (nextAmount: number) => {
    const a = clamp01(nextAmount)
    if (bipolar) onChange(a * 2 - 1)
    else onChange(valueFromDial(a, spec.pole))
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = {
      pointerId: event.pointerId,
      originY: event.clientY,
      originAmount: amount,
    }
    setHeld(true)
  }

  const end = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = drag.current
    if (!state || state.pointerId !== event.pointerId) return
    drag.current = null
    setHeld(false)
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      /* already released */
    }
    onCommit()
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = drag.current
    if (!state || state.pointerId !== event.pointerId) return
    if (event.buttons === 0) {
      end(event)
      return
    }
    const delta = (state.originY - event.clientY) / DRAG_PX
    applyAmount(state.originAmount + delta)
  }

  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 0.02 : 0.08
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault()
      applyAmount(amount + step)
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault()
      applyAmount(amount - step)
    } else if (event.key === 'Home') {
      event.preventDefault()
      applyAmount(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      applyAmount(1)
    }
  }

  const valueNow = bipolar ? Math.round(axisValue * 100) : Math.round(amount * 100)
  const valueText =
    amount < 0.08 ? from : amount > 0.92 ? to : `${from} to ${to}`

  return (
    <div className={`${styles.wrap} ${styles[spec.tone]}`}>
      <div
        className={`${styles.dial} ${held ? styles.held : ''}`}
        role="slider"
        tabIndex={0}
        aria-label={spec.ariaLabel ?? `${from} to ${to}`}
        aria-valuemin={bipolar ? -100 : 0}
        aria-valuemax={100}
        aria-valuenow={valueNow}
        aria-valuetext={valueText}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={() => {
          if (!drag.current) return
          drag.current = null
          setHeld(false)
          onCommit()
        }}
        onKeyDown={onKey}
        onKeyUp={(event) => {
          if (event.key.startsWith('Arrow') || event.key === 'Home' || event.key === 'End') onCommit()
        }}
      >
        <span className={styles.ring} aria-hidden="true" />
        <span className={styles.dot} style={{ transform: `rotate(${angle}deg)` }} aria-hidden="true" />
      </div>
      <p className={styles.pair}>
        <span>{from}</span>
        <span className={styles.dash}>—</span>
        <span>{to}</span>
      </p>
    </div>
  )
}
