import { useRef, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import {
  applyFeelingAmount,
  feelingAmount,
  SENSORY_FEELINGS,
  type SensoryFeeling,
} from '../sensoryFeelings'
import type { SensoryValues } from '../sensoryState'
import styles from './FeelingRail.module.css'

type Props = {
  values: SensoryValues
  activeId: string
  onActive: (id: string) => void
  onValues: (values: SensoryValues) => void
  onCommit: () => void
}

const DRAG_PX = 110

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

export function FeelingRail({ values, activeId, onActive, onValues, onCommit }: Props) {
  const drag = useRef<{ pointerId: number; originY: number; originAmount: number; feeling: SensoryFeeling } | null>(
    null,
  )

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
    if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
      event.preventDefault()
      onActive(feeling.id)
      onValues(applyFeelingAmount(values, feeling, clamp01(amount + step)))
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
      event.preventDefault()
      onActive(feeling.id)
      onValues(applyFeelingAmount(values, feeling, clamp01(amount - step)))
    }
  }

  return (
    <div className={styles.rail} role="listbox" aria-label="Feelings">
      {SENSORY_FEELINGS.map((feeling) => {
        const on = feeling.id === activeId
        const amount = feelingAmount(values, feeling)
        return (
          <button
            key={feeling.id}
            type="button"
            role="option"
            className={`${styles.item} ${on ? styles.on : ''}`}
            aria-selected={on}
            aria-label={feeling.ariaLabel}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(amount * 100)}
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
              const next = clamp01(state.originAmount + (state.originY - event.clientY) / DRAG_PX)
              onValues(applyFeelingAmount(values, state.feeling, next))
            }}
            onPointerUp={end}
            onPointerCancel={end}
            onKeyDown={(event) => onKey(event, feeling)}
            onKeyUp={(event) => {
              if (event.key.startsWith('Arrow')) onCommit()
            }}
          >
            {on ? <span className={styles.dot} aria-hidden="true" /> : <span className={styles.gap} aria-hidden="true" />}
            <span>{feeling.label}</span>
          </button>
        )
      })}
    </div>
  )
}
