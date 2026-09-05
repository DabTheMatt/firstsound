import { useRef, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import {
  applyFeelingAmount,
  feelingAmount,
  restFeeling,
  SENSORY_FEELINGS,
  type SensoryFeeling,
} from '../sensoryFeelings'
import { defaultSensoryValues, type SensoryValues } from '../sensoryState'
import styles from './FeelingRail.module.css'

type Props = {
  values: SensoryValues
  activeId: string
  onActive: (id: string) => void
  onValues: (values: SensoryValues) => void
  onCommit: () => void
}

const DRAG_PX = 130

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

function levelText(feeling: SensoryFeeling, amount: number): string {
  if (feeling.kind === 'bipolar') {
    const pct = Math.round(Math.abs(amount) * 100)
    if (pct === 0) return 'rest'
    return amount < 0 ? `${pct} tight` : `${pct} open`
  }
  const pct = Math.round(amount * 100)
  return pct === 0 ? 'rest' : `${pct}`
}

function EffectMeter({ feeling, amount }: { feeling: SensoryFeeling; amount: number }) {
  const a = feeling.kind === 'bipolar' ? (amount + 1) / 2 : clamp(amount, 0, 1)
  if (feeling.visual === 'character') {
    const x = 2 + a * 32
    return (
      <svg className={styles.meter} viewBox="0 0 36 12" aria-hidden="true">
        <rect x="1" y="5" width="34" height="2" rx="1" className={styles.track} />
        <rect x="17" y="3" width="2" height="6" className={styles.tick} />
        <circle cx={x} cy="6" r="3" className={styles.knob} />
      </svg>
    )
  }
  if (feeling.visual === 'space') {
    const r1 = 3 + a * 2
    const r2 = 5 + a * 3
    const r3 = 7 + a * 4
    return (
      <svg className={styles.meter} viewBox="0 0 36 12" aria-hidden="true">
        <ellipse cx="18" cy="10" rx={r3} ry={r3 * 0.38} className={styles.arc} opacity={0.25 + a * 0.5} />
        <ellipse cx="18" cy="10" rx={r2} ry={r2 * 0.38} className={styles.arc} opacity={0.4 + a * 0.4} />
        <ellipse cx="18" cy="10" rx={r1} ry={r1 * 0.4} className={styles.knob} />
      </svg>
    )
  }
  if (feeling.visual === 'echo') {
    const taps = [a > 0.08, a > 0.36, a > 0.68]
    return (
      <svg className={styles.meter} viewBox="0 0 36 12" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <rect
            key={i}
            x={6 + i * 9}
            y={3 + i * 1.5}
            width="5"
            height={7 - i * 1.5}
            rx="1"
            className={taps[i] ? styles.knob : styles.track}
            opacity={taps[i] ? 1 - i * 0.22 : 0.35}
          />
        ))}
      </svg>
    )
  }
  if (feeling.visual === 'grain') {
    const n = Math.round(a * 5)
    return (
      <svg className={styles.meter} viewBox="0 0 36 12" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <circle
            key={i}
            cx={6 + i * 6}
            cy={6 + ((i * 3) % 5) - 2}
            r={i < n ? 2.1 : 1.2}
            className={i < n ? styles.knob : styles.track}
          />
        ))}
      </svg>
    )
  }
  if (feeling.visual === 'dirt') {
    const w = 4 + a * 28
    return (
      <svg className={styles.meter} viewBox="0 0 36 12" aria-hidden="true">
        <path
          d={`M1 9 L ${4 + a * 6} 4 L ${10 + a * 8} 8 L ${w} 3 L ${w} 10 L1 10 Z`}
          className={styles.jag}
        />
      </svg>
    )
  }
  const gap = 10 - a * 8
  return (
    <svg className={styles.meter} viewBox="0 0 36 12" aria-hidden="true">
      <path d={`M${12 - a * 4} 2 L${16 - a * 4} 6 L${12 - a * 4} 10`} className={styles.brace} />
      <rect x={18 - gap / 2} y="4" width={gap} height="4" rx="1" className={styles.knob} />
      <path d={`M${24 + a * 4} 2 L${20 + a * 4} 6 L${24 + a * 4} 10`} className={styles.brace} />
    </svg>
  )
}

export function FeelingRail({ values, activeId, onActive, onValues, onCommit }: Props) {
  const drag = useRef<{
    pointerId: number
    originY: number
    originAmount: number
    feeling: SensoryFeeling
  } | null>(null)

  const end = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const state = drag.current
    if (!state || state.pointerId !== event.pointerId) return
    drag.current = null
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      /* already released */
    }
    onCommit()
  }

  const onKey = (event: KeyboardEvent<HTMLButtonElement>, feeling: SensoryFeeling) => {
    const step = event.shiftKey ? 0.04 : 0.12
    const amount = feelingAmount(values, feeling)
    const lo = feeling.kind === 'bipolar' ? -1 : 0
    if (event.key === 'Home' || event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      onActive(feeling.id)
      onValues(restFeeling(values, feeling))
      return
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
      event.preventDefault()
      onActive(feeling.id)
      onValues(applyFeelingAmount(values, feeling, clamp(amount + step, lo, 1)))
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
      event.preventDefault()
      onActive(feeling.id)
      onValues(applyFeelingAmount(values, feeling, clamp(amount - step, lo, 1)))
    }
  }

  return (
    <div className={styles.rail} role="listbox" aria-label="Effect feelings">
      <button
        type="button"
        className={styles.rest}
        aria-label="Rest all sensory effects to the starting position"
        onClick={() => {
          onValues(defaultSensoryValues())
          onCommit()
        }}
      >
        rest
      </button>
      {SENSORY_FEELINGS.map((feeling) => {
        const on = feeling.id === activeId
        const amount = feelingAmount(values, feeling)
        const now = feeling.kind === 'bipolar' ? Math.round(((amount + 1) / 2) * 100) : Math.round(amount * 100)
        return (
          <button
            key={feeling.id}
            type="button"
            role="option"
            className={`${styles.item} ${on ? styles.on : ''} ${Math.abs(amount) > 0.04 ? styles.lit : ''}`}
            aria-selected={on}
            aria-label={feeling.ariaLabel}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={now}
            aria-valuetext={levelText(feeling, amount)}
            title={`${feeling.from} → ${feeling.to}. Double-click to rest.`}
            onPointerDown={(event) => {
              if (event.button !== 0) return
              event.preventDefault()
              event.currentTarget.setPointerCapture(event.pointerId)
              onActive(feeling.id)
              drag.current = {
                pointerId: event.pointerId,
                originY: event.clientY,
                originAmount: feelingAmount(values, feeling),
                feeling,
              }
            }}
            onPointerMove={(event) => {
              const state = drag.current
              if (!state || state.pointerId !== event.pointerId) return
              if (event.buttons === 0) {
                end(event)
                return
              }
              const lo = state.feeling.kind === 'bipolar' ? -1 : 0
              const next = clamp(state.originAmount + (state.originY - event.clientY) / DRAG_PX, lo, 1)
              onValues(applyFeelingAmount(values, state.feeling, next))
            }}
            onPointerUp={end}
            onPointerCancel={end}
            onDoubleClick={(event) => {
              event.preventDefault()
              onActive(feeling.id)
              onValues(restFeeling(values, feeling))
              onCommit()
            }}
            onKeyDown={(event) => onKey(event, feeling)}
            onKeyUp={(event) => {
              if (event.key.startsWith('Arrow') || event.key === 'Home') onCommit()
            }}
          >
            <EffectMeter feeling={feeling} amount={amount} />
            <span className={styles.copy}>
              <span className={styles.label}>{feeling.label}</span>
              <span className={styles.level}>{levelText(feeling, amount)}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
