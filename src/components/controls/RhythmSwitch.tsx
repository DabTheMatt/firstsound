import { type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import type { NoteKind } from '../../audio/fx/types'
import styles from './RhythmSwitch.module.css'

const OPTIONS: { value: NoteKind; label: string }[] = [
  { value: 'straight', label: 'Straight' },
  { value: 'dotted', label: 'Dotted' },
  { value: 'triplet', label: 'Triplet' },
]

type Props = {
  value: NoteKind
  disabled?: boolean
  onChange: (value: NoteKind) => void
}

function indexFromClientX(track: HTMLElement, clientX: number): number {
  const rect = track.getBoundingClientRect()
  const t = rect.width <= 0 ? 0 : (clientX - rect.left) / rect.width
  if (t < 1 / 3) return 0
  if (t < 2 / 3) return 1
  return 2
}

function RhythmIcon({ kind }: { kind: NoteKind }) {
  if (kind === 'dotted') {
    return (
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <ellipse cx="5.1" cy="12.1" rx="2.6" ry="1.8" transform="rotate(-18 5.1 12.1)" fill="currentColor" />
        <path d="M7.4 11.3 V2.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="12.3" cy="12.1" r="1.2" fill="currentColor" />
      </svg>
    )
  }
  if (kind === 'triplet') {
    return (
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <text x="8" y="5.2" textAnchor="middle" fontSize="6" fontFamily="sans-serif" fontWeight="700" fill="currentColor">
          3
        </text>
        <path d="M1.8 6.4 H14.2" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" />
        <path d="M1.8 6.4 V8 M14.2 6.4 V8" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" />
        <path d="M4.2 8.5 V13.2 M8 8.5 V13.2 M11.8 8.5 V13.2" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <ellipse cx="6.2" cy="12.1" rx="2.8" ry="1.9" transform="rotate(-18 6.2 12.1)" fill="currentColor" />
      <path d="M8.6 11.3 V2.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

/** Three-position rhythm switch: Straight, Dotted, Triplet. */
export function RhythmSwitch({ value, disabled, onChange }: Props) {
  const index = Math.max(0, OPTIONS.findIndex((option) => option.value === value))
  const pick = (next: number) => {
    if (disabled) return
    const option = OPTIONS[Math.min(OPTIONS.length - 1, Math.max(0, next))]
    if (!option || option.value === value) return
    onChange(option.value)
  }
  const onTrackPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled) return
    event.currentTarget.setPointerCapture(event.pointerId)
    pick(indexFromClientX(event.currentTarget, event.clientX))
  }
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault()
      pick(index + 1)
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault()
      pick(index - 1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      pick(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      pick(OPTIONS.length - 1)
    }
  }
  return (
    <div
      className={`${styles.rhythm} ${disabled ? styles.disabled : ''}`}
      role="radiogroup"
      aria-label="Rhythm"
      aria-disabled={disabled || undefined}
      onKeyDown={onKeyDown}
    >
      <div className={styles.positions}>
        {OPTIONS.map((option, i) => {
          const active = i === index
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={option.label}
              title={option.label}
              disabled={disabled}
              className={`${styles.pos} ${active ? styles.posOn : ''}`}
              onClick={() => pick(i)}
            >
              <RhythmIcon kind={option.value} />
            </button>
          )
        })}
      </div>
      <div className={styles.track} onPointerDown={onTrackPointer} onPointerMove={(event) => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
        pick(indexFromClientX(event.currentTarget, event.clientX))
      }}>
        <span
          className={styles.thumb}
          style={{ '--rhythm-index': index } as CSSProperties}
        />
      </div>
    </div>
  )
}
