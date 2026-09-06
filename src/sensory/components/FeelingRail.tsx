import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import {
  applyFeelingAmount,
  feelingAmount,
  restFeeling,
  SENSORY_FEELINGS,
  type SensoryFeeling,
} from '../sensoryFeelings'
import { AXIS_LFO_BY_ID, axisLfoActive } from '../mapping/axisLfos'
import { engine } from '../../hooks/useEngine'
import { defaultSensoryValues, type SensoryValues } from '../sensoryState'
import { FeelingIcon } from './FeelingIcon'
import styles from './FeelingRail.module.css'

type Props = {
  values: SensoryValues
  activeId: string | null
  onActive: (id: string | null) => void
  onValues: (values: SensoryValues) => void
  onCommit: () => void
}

const DRAG_PX = 220

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

export function FeelingRail({ values, activeId, onActive, onValues, onCommit }: Props) {
  const drag = useRef<{
    pointerId: number
    originY: number
    originAmount: number
    feeling: SensoryFeeling
  } | null>(null)
  const focused = Boolean(activeId)
  const [livePanPct, setLivePanPct] = useState(0)

  useEffect(() => {
    if (values.pan < 0.02) return
    let frame = 0
    let last = 0
    const tick = (now: number) => {
      if (now - last >= 80) {
        last = now
        setLivePanPct(engine.getSnapshot().liveParams.pan)
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [values.pan])

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
    <div className={`${styles.rail} ${focused ? styles.focused : ''}`} role="listbox" aria-label="Effect feelings">
      <button
        type="button"
        className={styles.rest}
        aria-label="Rest all sensory effects to the starting position"
        onClick={() => {
          onActive(null)
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
        const lfoOn = Boolean(AXIS_LFO_BY_ID[feeling.id] && axisLfoActive(amount))
        return (
          <button
            key={feeling.id}
            type="button"
            role="option"
            data-axis={feeling.id}
            className={`${styles.item} ${on ? styles.on : ''} ${focused && !on ? styles.dim : ''} ${Math.abs(amount) > 0.04 ? styles.lit : ''} ${lfoOn ? styles.lfoOn : ''}`}
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
            <FeelingIcon feeling={feeling} amount={amount} livePanPct={values.pan < 0.02 ? 0 : livePanPct} />
            {lfoOn ? <span className={styles.lfoMark} aria-hidden="true" /> : null}
            <span className={styles.copy}>
              <span className={styles.label}>{feeling.label}</span>
              <span className={styles.rangeHint}>
                {feeling.from}–{feeling.to}
              </span>
              <span className={styles.level}>{levelText(feeling, amount)}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
