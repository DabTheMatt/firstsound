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
import { panNorm } from '../visualization/sensoryVisualState'
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

function fill01(feeling: SensoryFeeling, amount: number): number {
  return feeling.kind === 'bipolar' ? (amount + 1) / 2 : clamp(amount, 0, 1)
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

function EffectMeter({ feeling, amount, livePanPct }: { feeling: SensoryFeeling; amount: number; livePanPct: number }) {
  const a = fill01(feeling, amount)
  if (feeling.visual === 'character') {
    const y = 52 - a * 44
    return (
      <svg className={styles.meter} viewBox="0 0 28 56" aria-hidden="true">
        <rect x="12" y="6" width="4" height="44" rx="2" className={styles.track} />
        <rect x="11" y="26" width="6" height="3" className={styles.tick} />
        <circle cx="14" cy={y} r="6" className={styles.knob} />
      </svg>
    )
  }
  if (feeling.visual === 'space') {
    const r = 4 + a * 10
    return (
      <svg className={styles.meter} viewBox="0 0 28 56" aria-hidden="true">
        <ellipse cx="14" cy="40" rx={r + 6} ry={(r + 6) * 0.38} className={styles.arc} opacity={0.25 + a * 0.5} />
        <ellipse cx="14" cy="40" rx={r + 2} ry={(r + 2) * 0.38} className={styles.arc} opacity={0.45 + a * 0.4} />
        <ellipse cx="14" cy="40" rx={Math.max(3, r * 0.45)} ry={Math.max(2, r * 0.2)} className={styles.knob} />
      </svg>
    )
  }
  if (feeling.visual === 'echo') {
    const taps = [a > 0.06, a > 0.34, a > 0.66]
    return (
      <svg className={styles.meter} viewBox="0 0 28 56" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <rect
            key={i}
            x={5 + i * 7}
            y={12 + i * 6}
            width="5"
            height={32 - i * 8}
            rx="1.5"
            className={taps[i] ? styles.knob : styles.track}
            opacity={taps[i] ? 1 - i * 0.18 : 0.3}
          />
        ))}
      </svg>
    )
  }
  if (feeling.visual === 'grain') {
    const n = Math.max(1, Math.round(1 + a * 6))
    return (
      <svg className={styles.meter} viewBox="0 0 28 56" aria-hidden="true">
        {Array.from({ length: 7 }, (_, i) => (
          <rect
            key={i}
            x={4 + i * 3.2}
            y="8"
            width="2.2"
            height="40"
            className={i < n ? styles.knob : styles.track}
            opacity={i < n ? 1 : 0.28}
          />
        ))}
      </svg>
    )
  }
  if (feeling.visual === 'dirt') {
    const h = 8 + a * 36
    return (
      <svg className={styles.meter} viewBox="0 0 28 56" aria-hidden="true">
        <path d={`M4 48 L8 ${48 - h * 0.4} L14 ${48 - h} L20 ${48 - h * 0.55} L24 48 Z`} className={styles.jag} />
      </svg>
    )
  }
  if (feeling.visual === 'tight') {
    const gap = 16 - a * 12
    return (
      <svg className={styles.meter} viewBox="0 0 28 56" aria-hidden="true">
        <path d={`M${8 - a * 3} 10 L${12 - a * 3} 28 L${8 - a * 3} 46`} className={styles.brace} />
        <rect x={14 - gap / 2} y="18" width={gap} height="20" rx="2" className={styles.knob} />
        <path d={`M${20 + a * 3} 10 L${16 + a * 3} 28 L${20 + a * 3} 46`} className={styles.brace} />
      </svg>
    )
  }
  if (feeling.visual === 'mod') {
    const amp = 3 + a * 8
    const d = `M4 28 C 8 ${28 - amp}, 12 ${28 + amp}, 16 28 S 24 ${28 - amp}, 24 28`
    return (
      <svg className={styles.meter} viewBox="0 0 28 56" aria-hidden="true">
        <path d={d} className={styles.wave} />
        <path d={`M4 ${28 + 10 - a * 6} C 8 38, 12 18, 16 28 S 24 38, 24 ${28 + 10 - a * 6}`} className={styles.waveSoft} />
      </svg>
    )
  }
  if (feeling.visual === 'pan') {
    const x = 14 + panNorm(livePanPct) * 10
    return (
      <svg className={styles.meter} viewBox="0 0 28 56" aria-hidden="true">
        <path d="M6 28 H22" className={styles.waveSoft} />
        <circle cx={x} cy="28" r={5 + a * 2} className={styles.knob} />
        <circle cx="14" cy="28" r="2.2" className={styles.track} />
      </svg>
    )
  }
  return (
    <svg className={styles.meter} viewBox="0 0 28 56" aria-hidden="true">
      <circle cx={10 - a * 4} cy="28" r={5 + a} className={styles.knob} opacity={0.55 + a * 0.4} />
      <circle cx={18 + a * 4} cy="28" r={5 + a} className={styles.knob} opacity={0.55 + a * 0.4} />
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
            <EffectMeter feeling={feeling} amount={amount} livePanPct={values.pan < 0.02 ? 0 : livePanPct} />
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
