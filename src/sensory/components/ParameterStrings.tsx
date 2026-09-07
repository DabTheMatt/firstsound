import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import {
  applyFeelingAmount,
  feelingAmount,
  RAIL_AXIS_IDS,
  restFeeling,
  SENSORY_FEELINGS,
} from '../sensoryFeelings'
import { AXIS_LFO_BY_ID, axisLfoActive, resolvedAxisLfo } from '../mapping/axisLfos'
import type { SensoryAxisId } from '../sensoryParameters'
import type { SensoryValues } from '../sensoryState'
import { applySliderKey, formatPercentValue, sensoryDescription } from '../../a11y'
import { useI18n } from '../../i18n'
import {
  amountToT,
  layoutParameterStrings,
  nearestString,
  pointAlong,
  projectT,
  stringIntersections,
  stringLabelPose,
  tToAmount,
  type ParameterStringGeom,
} from '../visualization/parameterStrings'
import styles from './ParameterStrings.module.css'

type Props = {
  values: SensoryValues
  activeId: SensoryAxisId | null
  editingId: SensoryAxisId | null
  /** When false, strings stay hidden even while a rail is being edited. */
  visible?: boolean
  onActive: (id: SensoryAxisId | null) => void
  onEditing: (id: SensoryAxisId | null) => void
  onValues: (values: SensoryValues) => void
  onCommit: () => void
  interactive?: boolean
}

const HIT_PX = 18

function feelingOf(id: SensoryAxisId) {
  return SENSORY_FEELINGS.find((f) => f.id === id)!
}

export function ParameterStrings({
  values,
  activeId,
  editingId,
  visible = false,
  onActive,
  onEditing,
  onValues,
  onCommit,
  interactive = true,
}: Props) {
  const { t, locale, feeling: feelingCopy } = useI18n()
  const wrapRef = useRef<HTMLDivElement>(null)
  const valuesRef = useRef(values)
  const drag = useRef<{ pointerId: number; id: SensoryAxisId } | null>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const reduced = useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  useEffect(() => {
    valuesRef.current = values
  }, [values])

  useEffect(() => {
    const node = wrapRef.current
    if (!node) return
    const read = () => {
      const rect = node.getBoundingClientRect()
      setSize({ w: rect.width, h: rect.height })
    }
    read()
    const ro = new ResizeObserver(read)
    ro.observe(node)
    return () => ro.disconnect()
  }, [])

  const insets = useMemo(() => {
    const narrow = size.w > 0 && size.w < 720
    return {
      top: 88,
      right: narrow ? 132 : 168,
      bottom: 104,
      left: narrow ? 132 : 168,
    }
  }, [size.w])

  const geoms = useMemo(
    () => (size.w > 8 && size.h > 8 ? layoutParameterStrings(size.w, size.h, insets, RAIL_AXIS_IDS) : []),
    [size.w, size.h, insets],
  )
  const shown = useMemo(() => (visible ? geoms : []), [geoms, visible])
  const crosses = useMemo(() => stringIntersections(shown), [shown])

  const localPoint = (event: ReactPointerEvent) => {
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const applyAt = (geom: ParameterStringGeom, x: number, y: number) => {
    const feeling = feelingOf(geom.id)
    const amount = tToAmount(projectT(geom, x, y), feeling.kind)
    onActive(geom.id)
    onEditing(geom.id)
    onValues(applyFeelingAmount(valuesRef.current, feeling, amount))
  }

  const end = (event: ReactPointerEvent) => {
    const state = drag.current
    if (!state || state.pointerId !== event.pointerId) return
    drag.current = null
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      /* already released */
    }
    onEditing(null)
    onCommit()
  }

  const onKey = (event: KeyboardEvent<SVGLineElement>, id: SensoryAxisId) => {
    const feeling = feelingOf(id)
    const amount = feelingAmount(values, feeling)
    const n = feeling.kind === 'bipolar' ? (amount + 1) / 2 : amount
    const next = applySliderKey(event, n)
    if (!next) return
    event.preventDefault()
    onActive(id)
    onEditing(id)
    if (next.kind === 'reset') {
      onValues(restFeeling(values, feeling))
      return
    }
    const amt = feeling.kind === 'bipolar' ? next.normalized * 2 - 1 : next.normalized
    onValues(applyFeelingAmount(values, feeling, amt))
  }

  return (
    <div
      ref={wrapRef}
      className={`${styles.layer} ${interactive ? '' : styles.idle}`}
      aria-hidden={shown.length === 0}
    >
      {shown.length > 0 ? (
        <svg className={styles.svg} viewBox={`0 0 ${size.w} ${size.h}`} role="group" aria-label={t.sensory.parameterStrings}>
          {crosses.map((hit) => {
            const hot = hit.a === activeId || hit.b === activeId
            return (
              <circle
                key={`${hit.a}-${hit.b}`}
                className={`${styles.cross} ${hot ? styles.hot : ''}`}
                cx={hit.x}
                cy={hit.y}
                r={hot ? 3.4 : 2.1}
              />
            )
          })}
          {shown.map((geom) => {
            const feeling = feelingOf(geom.id)
            const copy = feelingCopy(feeling.id)
            const amount = feelingAmount(values, feeling)
            const along = amountToT(amount, feeling.kind)
            const bead = pointAlong(geom, along)
            const pose = stringLabelPose(geom)
            const on = Math.abs(amount) > 0.02
            const lit = activeId === geom.id || editingId === geom.id
            const tone = `${on ? styles.on : ''} ${lit ? styles.lit : ''}`
            const now = feeling.kind === 'bipolar' ? Math.round(((amount + 1) / 2) * 100) : Math.round(amount * 100)
            const lfo = AXIS_LFO_BY_ID[geom.id]
            const lfoOn = Boolean(lfo && axisLfoActive(amount))
            const lfoResolved = lfoOn && lfo ? resolvedAxisLfo(lfo, amount) : null
            const lfoPeriod = lfoResolved ? `${Math.max(0.45, 1 / lfoResolved.rateHz).toFixed(2)}s` : '1.6s'
            return (
              <g
                key={geom.id}
                data-axis={geom.id}
                data-lfo={lfoOn ? 'on' : undefined}
                className={`${styles.string} ${activeId && !on ? styles.dim : ''}`}
                style={{ ['--lfo-period' as string]: lfoPeriod }}
              >
                <line
                  className={styles.hit}
                  x1={geom.x1}
                  y1={geom.y1}
                  x2={geom.x2}
                  y2={geom.y2}
                  tabIndex={0}
                  role="slider"
                  aria-label={lfoOn ? `${copy.aria} ${t.sensory.lfoConnected}` : copy.aria}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={now}
                  aria-valuetext={formatPercentValue(feeling.kind === 'bipolar' ? (amount + 1) / 2 : amount, locale)}
                  aria-describedby={`string-desc-${geom.id}`}
                  onPointerDown={(event) => {
                    if (event.button !== 0) return
                    event.preventDefault()
                    event.stopPropagation()
                    event.currentTarget.setPointerCapture(event.pointerId)
                    const p = localPoint(event)
                    const target = nearestString(shown, p.x, p.y, HIT_PX) ?? geom
                    drag.current = { pointerId: event.pointerId, id: target.id }
                    onEditing(target.id)
                    applyAt(target, p.x, p.y)
                  }}
                  onPointerMove={(event) => {
                    const state = drag.current
                    if (!state || state.pointerId !== event.pointerId) return
                    if (event.buttons === 0) {
                      end(event)
                      return
                    }
                    const locked = shown.find((g) => g.id === state.id)
                    if (!locked) return
                    const p = localPoint(event)
                    applyAt(locked, p.x, p.y)
                  }}
                  onPointerUp={end}
                  onPointerCancel={end}
                  onDoubleClick={(event) => {
                    event.preventDefault()
                    onActive(geom.id)
                    onEditing(null)
                    onValues(restFeeling(values, feeling))
                    onCommit()
                  }}
                  onKeyDown={(event) => onKey(event, geom.id)}
                  onKeyUp={(event) => {
                    if (event.key.startsWith('Arrow') || event.key === 'Home') {
                      onEditing(null)
                      onCommit()
                    }
                  }}
                />
                <line
                  className={`${styles.line} ${tone}`}
                  x1={geom.x1}
                  y1={geom.y1}
                  x2={geom.x2}
                  y2={geom.y2}
                  pointerEvents="none"
                />
                {lfoOn ? (
                  <>
                    <line
                      className={styles.lfoLine}
                      x1={geom.x1}
                      y1={geom.y1}
                      x2={geom.x2}
                      y2={geom.y2}
                    />
                    <circle className={styles.lfoRider} r={2.2} cx={geom.x1} cy={geom.y1}>
                      {reduced ? null : (
                        <animateMotion
                          dur={lfoPeriod}
                          repeatCount="indefinite"
                          path={`M ${geom.x1} ${geom.y1} L ${geom.x2} ${geom.y2}`}
                        />
                      )}
                    </circle>
                  </>
                ) : null}
                <title id={`string-desc-${geom.id}`}>{sensoryDescription(geom.id, locale)}</title>
                <circle className={`${styles.node} ${tone}`} cx={bead.x} cy={bead.y} r={on ? 5.5 : 3.6} />
                <text
                  className={`${styles.label} ${tone}`}
                  x={pose.x}
                  y={pose.y}
                  transform={`rotate(${pose.angle} ${pose.x} ${pose.y})`}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {copy.label}
                </text>
              </g>
            )
          })}
        </svg>
      ) : null}
    </div>
  )
}
