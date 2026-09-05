import { useRef, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import type { SensoryAxisDef } from '../sensoryParameters'
import styles from './SensoryAxis.module.css'

type Props = {
  def: SensoryAxisDef
  value: number
  onChange: (value: number) => void
  onCommit: () => void
  compact?: boolean
}

export function SensoryAxis({ def, value, onChange, onCommit, compact = false }: Props) {
  const drag = useRef<{ x: number; value: number } | null>(null)
  const t = (value + 1) / 2

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    const rect = event.currentTarget.getBoundingClientRect()
    const next = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1
    onChange(Math.min(1, Math.max(-1, next)))
    drag.current = { x: event.clientX, value: next }
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    const rect = event.currentTarget.getBoundingClientRect()
    const next = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1
    onChange(Math.min(1, Math.max(-1, next)))
  }

  const end = () => {
    if (!drag.current) return
    drag.current = null
    onCommit()
  }

  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 0.02 : 0.08
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault()
      onChange(Math.max(-1, value - step))
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault()
      onChange(Math.min(1, value + step))
    } else if (event.key === 'Home') {
      event.preventDefault()
      onChange(-1)
    } else if (event.key === 'End') {
      event.preventDefault()
      onChange(1)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onCommit()
    }
  }

  return (
    <div className={`${styles.axis} ${compact ? styles.compact : ''}`}>
      <div
        className={styles.field}
        role="slider"
        tabIndex={0}
        aria-label={def.ariaLabel}
        aria-valuemin={-100}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
        aria-valuetext={value > 0.04 ? def.positiveLabel : value < -0.04 ? def.negativeLabel : 'balanced'}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={end}
        onPointerCancel={end}
        onKeyDown={onKey}
        onKeyUp={(event) => {
          if (event.key.startsWith('Arrow') || event.key === 'Home' || event.key === 'End') onCommit()
        }}
      >
        <span className={`${styles.word} ${value < -0.08 ? styles.active : ''}`}>{def.negativeLabel}</span>
        <span className={styles.track} aria-hidden="true">
          <span className={styles.fill} style={{ left: `${t * 100}%` }} />
        </span>
        <span className={`${styles.word} ${value > 0.08 ? styles.active : ''}`}>{def.positiveLabel}</span>
      </div>
    </div>
  )
}
